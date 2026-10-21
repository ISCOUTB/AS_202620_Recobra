import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notificacion } from '../../domain/entities/notificacion';
import { MemoriaCuentaRepository } from '../../infrastructure/persistence/memoria-cuenta.repository';
import { MemoriaEventoFallidoRepository } from '../../infrastructure/persistence/memoria-evento-fallido.repository';
import { MemoriaNotificacionRepository } from '../../infrastructure/persistence/memoria-notificacion.repository';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { EventoDominio, RECLAMACION_CREADA, ReclamacionCreadaV1, emitirEvento } from '../events/eventos-dominio';
import { metricasDeEventos } from '../events/metricas-eventos';
import {
  DIAS_RETENCION_FALLIDOS,
  INTENTOS_MAXIMOS,
  ProcesadorDeEventos,
  ReprocesarEventosFallidos,
  esperaCreciente,
} from './entrega-de-eventos';
import { Notificar } from './notificaciones';

/**
 * Taller de mensajes (ADR-0026): garantía de entrega, duplicados, reintentos con
 * espera creciente, cola de fallidos y trazabilidad, sobre la operación real
 * "avisar a quien publicó que alguien reclamó su objeto".
 */

/** Repositorio de avisos que falla las primeras `fallos` veces (o siempre, con Infinity): una base que se cae y se recupera. */
class AvisosQueFallan extends MemoriaNotificacionRepository {
  intentos = 0;
  constructor(public fallos: number) {
    super();
  }
  async guardarSiNoExiste(n: Notificacion): Promise<boolean> {
    this.intentos++;
    if (this.intentos <= this.fallos) throw new Error('connect ECONNREFUSED base de datos');
    return super.guardarSiNoExiste(n);
  }
}

// Las líneas de registro de los eventos no se imprimen en la salida de las pruebas.
Logger.overrideLogger(false);

describe('Entrega de eventos: reintentos, duplicados y cola de fallidos (ADR-0026)', () => {
  const carga: ReclamacionCreadaV1 = {
    reclamacionId: 'r1',
    publicacionId: 'p1',
    publicacionAutorId: 'bea',
    publicacionDescripcion: 'Mochila negra',
  };
  const nuevoEvento = (): EventoDominio<ReclamacionCreadaV1> =>
    emitirEvento(new EventEmitter2(), RECLAMACION_CREADA, carga);

  let avisos: AvisosQueFallan;
  let fallidos: MemoriaEventoFallidoRepository;
  let notificar: Notificar;
  let procesador: ProcesadorDeEventos;
  let esperas: number[];

  beforeEach(() => {
    metricasDeEventos.reiniciar();
    avisos = new AvisosQueFallan(0);
    fallidos = new MemoriaEventoFallidoRepository();
    notificar = new Notificar(avisos, new MemoriaPublicacionRepository(), new MemoriaCuentaRepository());
    procesador = new ProcesadorDeEventos(fallidos);
    esperas = [];
    procesador.dormir = async (ms) => {
      esperas.push(ms);
    };
  });

  const avisosDeBea = async () => (await avisos.listarPorCuenta('bea', 10)).map((a) => a.id);

  it('un evento duplicado (el mismo mensaje entregado dos veces) no duplica el aviso', async () => {
    const evento = nuevoEvento();

    await procesador.procesar(evento, (e) => notificar.procesar(e));
    await procesador.procesar(evento, (e) => notificar.procesar(e)); // entrega repetida

    expect(await avisosDeBea()).toEqual(['reclamacion-nueva:r1']);
    expect(metricasDeEventos.resumen().procesados).toBe(2); // se procesó dos veces, y el efecto fue uno
  });

  it('el mismo hecho emitido dos veces con otro identificador tampoco duplica: la clave es el dato, no el mensaje', async () => {
    await procesador.procesar(nuevoEvento(), (e) => notificar.procesar(e));
    await procesador.procesar(nuevoEvento(), (e) => notificar.procesar(e));

    expect(await avisosDeBea()).toHaveLength(1);
  });

  it('un fallo recuperable: falla dos veces, espera cada vez más y el tercer intento lo procesa', async () => {
    avisos.fallos = 2;

    const resultado = await procesador.procesar(nuevoEvento(), (e) => notificar.procesar(e));

    expect(resultado).toBe('procesado');
    expect(avisos.intentos).toBe(3);
    expect(await avisosDeBea()).toEqual(['reclamacion-nueva:r1']);
    expect(esperas).toHaveLength(2);
    expect(esperas[1]).toBeGreaterThan(esperas[0] * 2); // la espera crece, no se repite
    expect(metricasDeEventos.resumen()).toMatchObject({ procesados: 1, reintentos: 2, enColaDeFallidos: 0 });
    expect(await fallidos.listarPendientes(10)).toHaveLength(0);
  });

  it('un fallo que no se recupera: tras los intentos el evento queda en la cola de fallidos, sin perderse', async () => {
    avisos.fallos = Infinity;
    const evento = nuevoEvento();

    const resultado = await procesador.procesar(evento, (e) => notificar.procesar(e));

    expect(resultado).toBe('en_cola_de_fallidos');
    expect(avisos.intentos).toBe(INTENTOS_MAXIMOS);
    expect(await avisosDeBea()).toHaveLength(0);
    const [enCola] = await fallidos.listarPendientes(10);
    expect(enCola).toMatchObject({ id: evento.id, tipo: RECLAMACION_CREADA, intentos: INTENTOS_MAXIMOS, estado: 'pendiente' });
    expect(enCola.ultimoError).toContain('ECONNREFUSED');
    expect(metricasDeEventos.resumen()).toMatchObject({ reintentos: INTENTOS_MAXIMOS - 1, enColaDeFallidos: 1 });
  });

  it('cuando lo que falló se recupera, el reproceso entrega lo que quedó en la cola, una sola vez', async () => {
    avisos.fallos = Infinity;
    const evento = nuevoEvento();
    await procesador.procesar(evento, (e) => notificar.procesar(e));
    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar);

    // La base sigue caída: el evento sigue en la cola y suma un intento.
    expect(await reprocesar.ejecutar()).toMatchObject({ reprocesados: 0, siguenFallando: 1 });
    expect((await fallidos.buscarPorId(evento.id))?.intentos).toBe(INTENTOS_MAXIMOS + 1);

    // La base vuelve: el reproceso crea el aviso y cierra el evento.
    avisos.fallos = 0;
    expect(await reprocesar.ejecutar()).toMatchObject({ reprocesados: 1, siguenFallando: 0 });
    expect(await avisosDeBea()).toEqual(['reclamacion-nueva:r1']);
    expect((await fallidos.buscarPorId(evento.id))?.estado).toBe('reprocesado');
    expect(metricasDeEventos.resumen().reprocesados).toBe(1);

    // Y ya no queda nada pendiente: otra pasada no repite el aviso.
    expect(await reprocesar.ejecutar()).toMatchObject({ reprocesados: 0, siguenFallando: 0 });
    expect(await avisosDeBea()).toHaveLength(1);
  });

  it('un mensaje de una versión que no se entiende no se descarta en silencio: va a la cola y sigue ahí', async () => {
    const desconocido: EventoDominio = { ...nuevoEvento(), version: 2 };

    expect(await procesador.procesar(desconocido, (e) => notificar.procesar(e))).toBe('en_cola_de_fallidos');

    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar);
    expect(await reprocesar.ejecutar()).toMatchObject({ reprocesados: 0, siguenFallando: 1 });
    expect((await fallidos.buscarPorId(desconocido.id))?.ultimoError).toContain('versión 2');
  });

  it('la cola se limpia sola: se borra lo de más de 7 días', async () => {
    avisos.fallos = Infinity;
    const evento = nuevoEvento();
    await procesador.procesar(evento, (e) => notificar.procesar(e));
    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar);

    const pasados = new Date(Date.now() + (DIAS_RETENCION_FALLIDOS + 1) * 24 * 60 * 60 * 1000);
    expect((await reprocesar.ejecutar(pasados)).borrados).toBe(1);
    expect(await fallidos.buscarPorId(evento.id)).toBeNull();
  });

  it('si ni siquiera se puede guardar en la cola (la misma caída), no tumba nada y queda el registro', async () => {
    avisos.fallos = Infinity;
    jest.spyOn(fallidos, 'guardar').mockRejectedValue(new Error('base caída'));

    expect(await procesador.procesar(nuevoEvento(), (e) => notificar.procesar(e))).toBe('sin_registro');
  });

  it('la espera crece por cuatro, con una variación de ±20 %', () => {
    for (const azar of [0, 0.5, 1]) {
      const [a, b, c] = [1, 2, 3].map((n) => esperaCreciente(n, () => azar));
      expect(b / a).toBeCloseTo(4, 0);
      expect(c / b).toBeCloseTo(4, 0);
    }
    expect(esperaCreciente(1, () => 0)).toBe(160);
    expect(esperaCreciente(1, () => 1)).toBe(240);
    expect(esperaCreciente(2, () => 0.5)).toBe(800);
  });

  it('trazabilidad: el mismo identificador aparece en el registro de quien emite y en el de quien procesa', async () => {
    const lineas: Array<Record<string, unknown>> = [];
    const espiaLog = jest.spyOn(Logger.prototype, 'log').mockImplementation((mensaje: unknown) => {
      lineas.push(mensaje as Record<string, unknown>);
    });
    try {
      const evento = nuevoEvento(); // el productor registra "evento.emitido"
      await procesador.procesar(evento, (e) => notificar.procesar(e)); // el consumidor, "evento.procesado"

      const deEsteEvento = lineas.filter((l) => l.eventoId === evento.id).map((l) => l.evento);
      expect(deEsteEvento).toEqual(['evento.emitido', 'evento.procesado']);
      expect(lineas.find((l) => l.evento === 'evento.procesado')).toMatchObject({ tipo: RECLAMACION_CREADA, intento: 1 });
    } finally {
      espiaLog.mockRestore();
    }
  });
});
