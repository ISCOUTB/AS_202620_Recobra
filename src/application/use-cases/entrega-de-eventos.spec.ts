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
  UMBRAL_ALERTA_COLA,
  esperaCreciente,
} from './entrega-de-eventos';
import { AlertarAdministradores } from './alertas-operativas';
import { Cuenta } from '../../domain/entities/cuenta';
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
  let cuentas: MemoriaCuentaRepository;
  let alertas: AlertarAdministradores;
  let procesador: ProcesadorDeEventos;
  let esperas: number[];

  beforeEach(() => {
    metricasDeEventos.reiniciar();
    avisos = new AvisosQueFallan(0);
    fallidos = new MemoriaEventoFallidoRepository();
    cuentas = new MemoriaCuentaRepository();
    notificar = new Notificar(avisos, new MemoriaPublicacionRepository(), cuentas);
    alertas = new AlertarAdministradores(cuentas, avisos);
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
    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);

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

    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);
    expect(await reprocesar.ejecutar()).toMatchObject({ reprocesados: 0, siguenFallando: 1 });
    expect((await fallidos.buscarPorId(desconocido.id))?.ultimoError).toContain('versión 2');
  });

  it('la cola se limpia sola: se borra lo de más de 7 días', async () => {
    avisos.fallos = Infinity;
    const evento = nuevoEvento();
    await procesador.procesar(evento, (e) => notificar.procesar(e));
    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);

    const pasados = new Date(Date.now() + (DIAS_RETENCION_FALLIDOS + 1) * 24 * 60 * 60 * 1000);
    expect((await reprocesar.ejecutar(pasados)).borrados).toBe(1);
    expect(await fallidos.buscarPorId(evento.id)).toBeNull();
  });

  it('alerta: con cinco eventos esperando en la cola se emite una línea de error y se marca en las métricas; con menos, no', async () => {
    avisos.fallos = Infinity;
    const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);
    const errores: unknown[] = [];
    const espia = jest.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => {
      errores.push(m);
    });
    try {
      for (let i = 0; i < UMBRAL_ALERTA_COLA - 1; i++) await procesador.procesar(nuevoEvento(), (e) => notificar.procesar(e));
      const bajo = await reprocesar.ejecutar();
      expect(bajo).toMatchObject({ pendientes: UMBRAL_ALERTA_COLA - 1, alerta: false });
      expect(errores.filter((e) => (e as { evento?: string }).evento === 'alerta.cola_de_fallidos')).toHaveLength(0);

      await procesador.procesar(nuevoEvento(), (e) => notificar.procesar(e)); // el quinto
      const alto = await reprocesar.ejecutar();

      expect(alto).toMatchObject({ pendientes: UMBRAL_ALERTA_COLA, alerta: true });
      expect(errores).toContainEqual({ evento: 'alerta.cola_de_fallidos', pendientes: UMBRAL_ALERTA_COLA, umbral: UMBRAL_ALERTA_COLA });
      expect(metricasDeEventos.resumen().pendientesEnCola).toBe(UMBRAL_ALERTA_COLA);

      avisos.fallos = 0; // la base vuelve: la cola se vacía y la alerta se apaga
      expect(await reprocesar.ejecutar()).toMatchObject({ pendientes: 0, alerta: false });
      expect(metricasDeEventos.resumen().pendientesEnCola).toBe(0);
    } finally {
      espia.mockRestore();
    }
  });

  describe('la alerta llega a una persona: un aviso en la aplicación de cada administrador', () => {
    const correoAdmin = 'admin.cola@utb.edu.co';
    const anterior = process.env.ADMIN_CORREOS;
    const hoy = new Date('2026-10-28T15:00:00.000Z');
    const manana = new Date('2026-10-29T15:00:00.000Z');

    beforeEach(async () => {
      process.env.ADMIN_CORREOS = ` ${correoAdmin.toUpperCase()}, otro.admin@utb.edu.co `; // el segundo no tiene cuenta
      await cuentas.guardarSiCorreoLibre(
        new Cuenta({ id: 'admin-1', correo: correoAdmin, nombre: 'Admin', hashContrasena: 'h', creadoEn: hoy.toISOString() }),
      );
    });
    afterEach(() => {
      if (anterior === undefined) delete process.env.ADMIN_CORREOS;
      else process.env.ADMIN_CORREOS = anterior;
    });

    /** Mensajes que este consumidor no entiende: con la base sana, quedan en la cola (caso que la alerta sí puede avisar). */
    const llenarLaCola = async (n: number) => {
      for (let i = 0; i < n; i++) {
        await procesador.procesar({ ...nuevoEvento(), version: 2 }, (e) => notificar.procesar(e));
      }
    };
    const alertasDe = async (cuentaId: string) =>
      (await avisos.listarPorCuenta(cuentaId, 20)).filter((a) => a.tipo === 'alerta_operativa');

    it('al llegar al umbral, el administrador con cuenta recibe una alerta operativa; con menos, nada', async () => {
      const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);
      await llenarLaCola(UMBRAL_ALERTA_COLA - 1);
      await reprocesar.ejecutar(hoy);
      expect(await alertasDe('admin-1')).toHaveLength(0);

      await llenarLaCola(1); // el quinto
      await reprocesar.ejecutar(hoy);

      const [alerta] = await alertasDe('admin-1');
      expect(alerta).toMatchObject({ cuentaId: 'admin-1', tipo: 'alerta_operativa', leida: false });
      expect(alerta.mensaje).toContain(`${UMBRAL_ALERTA_COLA} pendientes`);
    });

    it('es una alerta por administrador y por día: una cola atascada no llena la bandeja cada cinco minutos', async () => {
      const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);
      await llenarLaCola(UMBRAL_ALERTA_COLA);

      await reprocesar.ejecutar(hoy);
      await reprocesar.ejecutar(hoy); // la pasada siguiente, el mismo día
      expect(await alertasDe('admin-1')).toHaveLength(1);

      await reprocesar.ejecutar(manana); // otro día y sigue atascada: avisa de nuevo
      expect(await alertasDe('admin-1')).toHaveLength(2);
    });

    it('quien no es administrador no recibe nada, y un fallo al guardar la alerta no tumba el reproceso', async () => {
      await cuentas.guardarSiCorreoLibre(
        new Cuenta({ id: 'ana', correo: 'ana@utb.edu.co', nombre: 'Ana', hashContrasena: 'h', creadoEn: hoy.toISOString() }),
      );
      const reprocesar = new ReprocesarEventosFallidos(fallidos, notificar, alertas);
      await llenarLaCola(UMBRAL_ALERTA_COLA);
      await reprocesar.ejecutar(hoy);
      expect(await alertasDe('ana')).toHaveLength(0);

      jest.spyOn(alertas, 'colaDeFallidos').mockRejectedValue(new Error('base caída'));
      await expect(reprocesar.ejecutar(manana)).resolves.toMatchObject({ alerta: true });
    });
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
