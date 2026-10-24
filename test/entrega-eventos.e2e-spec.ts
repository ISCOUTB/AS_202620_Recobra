import { INestApplication, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';
import { EventoFallidoRepository } from '../src/domain/ports/evento-fallido-repository';
import { NotificacionRepository } from '../src/domain/ports/notificacion-repository';
import { Notificacion } from '../src/domain/entities/notificacion';
import { MemoriaNotificacionRepository } from '../src/infrastructure/persistence/memoria-notificacion.repository';
import { ProcesadorDeEventos, ReprocesarEventosFallidos } from '../src/application/use-cases/entrega-de-eventos';
import { RECLAMACION_CREADA, emitirEvento } from '../src/application/events/eventos-dominio';

/**
 * Taller de mensajes (ADR-0026) contra la aplicación completa: la operación real
 * "avisar a quien publicó que alguien reclamó su objeto", con un repositorio de
 * avisos que falla a propósito (una base que se cae y se recupera). Cubre el
 * duplicado, el reintento con espera creciente, la cola de fallidos y su
 * reproceso, y el seguimiento del mensaje por su identificador de correlación.
 */
class AvisosQueFallan extends MemoriaNotificacionRepository {
  intentos = 0;
  fallos = 0;
  async guardarSiNoExiste(n: Notificacion): Promise<boolean> {
    this.intentos++;
    if (this.intentos <= this.fallos) throw new Error('connect ECONNREFUSED base de datos');
    return super.guardarSiNoExiste(n);
  }
  /** Deja de fallar y reinicia la cuenta de intentos. */
  recuperar(): void {
    this.fallos = 0;
    this.intentos = 0;
  }
  /** Falla las próximas `n` escrituras. */
  fallarProximas(n: number): void {
    this.intentos = 0;
    this.fallos = n;
  }
}

describe('Entrega de eventos: duplicado, fallo recuperable y cola de fallidos (e2e)', () => {
  let app: INestApplication;
  let avisos: AvisosQueFallan;
  let ana: UsuarioDePrueba;
  let bea: UsuarioDePrueba;
  const esperas: number[] = [];
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    Logger.overrideLogger(false);
    avisos = new AvisosQueFallan();
    app = await crearAppDePrueba((b) => b.overrideProvider(NotificacionRepository).useValue(avisos));
    // La espera creciente se registra pero no se espera de verdad.
    const procesador = app.get(ProcesadorDeEventos, { strict: false });
    procesador.dormir = async (ms) => {
      esperas.push(ms);
    };
    ana = await crearUsuario(app, 'Ana');
    bea = await crearUsuario(app, 'Bea');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    avisos.recuperar();
    esperas.length = 0;
  });

  /** Ana publica un objeto encontrado y Bea lo reclama: la operación que genera el evento. */
  async function reclamar(descripcion: string): Promise<string> {
    const pub = await request(srv())
      .post('/publicaciones')
      .set(con(ana))
      .send({ tipo: 'encontrado', descripcion, categoria: 'eventos-e2e', ubicacion: 'Biblioteca' });
    const r = await request(srv())
      .post(`/publicaciones/${pub.body.id}/reclamaciones`)
      .set(con(bea))
      .send({ prueba: 'Tiene un llavero rojo en el bolsillo de adelante' });
    expect(r.status).toBe(201);
    return pub.body.id as string;
  }

  const avisosDeAna = async () =>
    (await request(srv()).get('/notificaciones').set(con(ana))).body.notificaciones as Array<{ tipo: string; publicacionId: string }>;

  /** El aviso llega en segundo plano: se espera a que aparezca (o no). */
  async function esperar(condicion: () => Promise<boolean>, ms = 3000): Promise<boolean> {
    const limite = Date.now() + ms;
    while (Date.now() < limite) {
      if (await condicion()) return true;
      await new Promise((resolver) => setTimeout(resolver, 25));
    }
    return false;
  }

  it('fallo recuperable: el consumidor falla dos veces, se reintenta con espera creciente y el aviso llega', async () => {
    avisos.fallarProximas(2);

    const publicacionId = await reclamar('Mochila para el reintento');

    expect(await esperar(async () => (await avisosDeAna()).some((a) => a.publicacionId === publicacionId))).toBe(true);
    expect(avisos.intentos).toBe(3); // dos fallos y el tercer intento
    expect(esperas).toHaveLength(2);
    expect(esperas[1]).toBeGreaterThan(esperas[0] * 2); // la espera crece
    const metricas = await request(srv()).get('/metrics');
    expect(metricas.body.eventos.reintentos).toBeGreaterThanOrEqual(2);
    expect(await app.get(EventoFallidoRepository, { strict: false }).listarPendientes(50)).toHaveLength(0);
  });

  it('un mensaje duplicado (entregado dos veces) no duplica el aviso', async () => {
    const publicacionId = await reclamar('Termo para el duplicado');
    expect(await esperar(async () => (await avisosDeAna()).some((a) => a.publicacionId === publicacionId))).toBe(true);
    const antes = (await avisosDeAna()).filter((a) => a.publicacionId === publicacionId);

    // El mismo hecho llega otra vez (otro sobre, mismo dato): la clave del aviso la fija el dato, no el mensaje.
    const reclamacion = (await request(srv()).get(`/publicaciones/${publicacionId}/reclamaciones`).set(con(ana))).body[0];
    const carga = { reclamacionId: reclamacion.id, publicacionId, publicacionAutorId: ana.id, publicacionDescripcion: 'Termo para el duplicado' };
    emitirEvento(app.get(EventEmitter2), RECLAMACION_CREADA, carga);
    emitirEvento(app.get(EventEmitter2), RECLAMACION_CREADA, carga);
    await esperar(async () => false, 300); // se les da tiempo de procesarse

    const despues = (await avisosDeAna()).filter((a) => a.publicacionId === publicacionId);
    expect(antes).toHaveLength(1);
    expect(despues).toHaveLength(1);
  });

  it('un fallo que no se recupera deja el evento en la cola de fallidos y el reproceso lo entrega cuando la base vuelve', async () => {
    avisos.fallarProximas(Infinity);
    const fallidos = app.get(EventoFallidoRepository, { strict: false });
    const pendientesAntes = (await fallidos.listarPendientes(500)).length;

    const publicacionId = await reclamar('Billetera para la cola');

    expect(await esperar(async () => (await fallidos.listarPendientes(500)).length === pendientesAntes + 1)).toBe(true);
    expect((await avisosDeAna()).some((a) => a.publicacionId === publicacionId)).toBe(false); // todavía no hay aviso
    const [enCola] = (await fallidos.listarPendientes(500)).slice(-1);
    expect(enCola).toMatchObject({ tipo: RECLAMACION_CREADA, intentos: 3, estado: 'pendiente' });

    avisos.recuperar(); // la base vuelve
    const resumen = await app.get(ReprocesarEventosFallidos, { strict: false }).ejecutar();

    expect(resumen.reprocesados).toBeGreaterThanOrEqual(1);
    expect((await avisosDeAna()).filter((a) => a.publicacionId === publicacionId)).toHaveLength(1);
    expect((await fallidos.buscarPorId(enCola.id))?.estado).toBe('reprocesado');
    const metricas = await request(srv()).get('/metrics');
    expect(metricas.body.eventos).toMatchObject({ enColaDeFallidos: expect.any(Number), reprocesados: expect.any(Number) });
  });

  it('trazabilidad: el mismo identificador de correlación sale en el registro del productor y del consumidor', async () => {
    const lineas: Array<Record<string, unknown>> = [];
    const espiar = (nivel: 'log' | 'warn') =>
      jest.spyOn(Logger.prototype, nivel).mockImplementation((mensaje: unknown) => {
        if (typeof mensaje === 'object' && mensaje) lineas.push(mensaje as Record<string, unknown>);
      });
    const espias = [espiar('log'), espiar('warn')];
    try {
      avisos.fallarProximas(1);
      const publicacionId = await reclamar('Calculadora para la traza');
      expect(await esperar(async () => (await avisosDeAna()).some((a) => a.publicacionId === publicacionId))).toBe(true);
      await esperar(async () => lineas.some((l) => l.evento === 'evento.procesado'), 1000);

      const emitido = lineas.find((l) => l.evento === 'evento.emitido' && l.tipo === RECLAMACION_CREADA);
      const delMismoEvento = lineas.filter((l) => l.eventoId === emitido?.eventoId).map((l) => l.evento);

      expect(emitido?.eventoId).toBeTruthy();
      expect(delMismoEvento).toEqual(['evento.emitido', 'evento.reintento', 'evento.procesado']);
    } finally {
      for (const e of espias) e.mockRestore();
    }
  });
});
