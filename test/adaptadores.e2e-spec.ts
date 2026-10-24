import { randomUUID } from 'node:crypto';
import { Coincidencia } from '../src/domain/entities/coincidencia';
import { Cuenta } from '../src/domain/entities/cuenta';
import { EventoFallido } from '../src/domain/entities/evento-fallido';
import { Foto } from '../src/domain/entities/foto';
import { Notificacion } from '../src/domain/entities/notificacion';
import { Publicacion } from '../src/domain/entities/publicacion';
import { PRUEBA_ANONIMIZADA, Reclamacion } from '../src/domain/entities/reclamacion';
import { Reporte } from '../src/domain/entities/reporte';
import { CoincidenciaRepository } from '../src/domain/ports/coincidencia-repository';
import { CuentaRepository } from '../src/domain/ports/cuenta-repository';
import { EventoFallidoRepository } from '../src/domain/ports/evento-fallido-repository';
import { FotoRepository } from '../src/domain/ports/foto-repository';
import { NotificacionRepository } from '../src/domain/ports/notificacion-repository';
import { PublicacionRepository } from '../src/domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../src/domain/ports/reclamacion-repository';
import { SesionRepository } from '../src/domain/ports/sesion-repository';
import { ReporteRepository } from '../src/domain/ports/reporte-repository';
import { MemoriaCoincidenciaRepository } from '../src/infrastructure/persistence/memoria-coincidencia.repository';
import { MemoriaCuentaRepository } from '../src/infrastructure/persistence/memoria-cuenta.repository';
import { MemoriaEventoFallidoRepository } from '../src/infrastructure/persistence/memoria-evento-fallido.repository';
import { MemoriaFotoRepository } from '../src/infrastructure/persistence/memoria-foto.repository';
import { MemoriaNotificacionRepository } from '../src/infrastructure/persistence/memoria-notificacion.repository';
import { MemoriaPublicacionRepository } from '../src/infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../src/infrastructure/persistence/memoria-reclamacion.repository';
import { MemoriaSesionRepository } from '../src/infrastructure/persistence/memoria-sesion.repository';
import { MemoriaReporteRepository } from '../src/infrastructure/persistence/memoria-reporte.repository';

/**
 * Los puertos de persistencia contra sus dos adaptadores (ADR-0027). Con
 * `DATABASE_URL_PRUEBAS` también contra un PostgreSQL real (lo hace el trabajo
 * «Adaptadores contra PostgreSQL real» del flujo de integración); sin ella, solo
 * contra memoria, que sirve de referencia de comportamiento.
 *
 * Son las propiedades que el sistema delega al motor: crear sin duplicar y
 * comparar y fijar bajo concurrencia, unicidad, y que los bytes y los JSON
 * sobrevivan intactos. Si un cambio de motor o de SQL rompe una, esta prueba lo
 * dice en el momento en vez de fallar en silencio en producción.
 */
const URL_PRUEBAS = process.env.DATABASE_URL_PRUEBAS;
if (URL_PRUEBAS) {
  process.env.DATABASE_URL = URL_PRUEBAS;
  process.env.DATABASE_SSL = 'false';
}

interface Adaptadores {
  publicaciones: PublicacionRepository;
  cuentas: CuentaRepository;
  notificaciones: NotificacionRepository;
  coincidencias: CoincidenciaRepository;
  reportes: ReporteRepository;
  fotos: FotoRepository;
  fallidos: EventoFallidoRepository;
  reclamaciones: ReclamacionRepository;
  sesiones: SesionRepository;
  cerrar?: () => Promise<void>;
}

const TABLAS = [
  'publicaciones',
  'cuentas',
  'notificaciones',
  'coincidencias',
  'reportes',
  'fotos',
  'eventos_fallidos',
  'reclamaciones',
  'sesiones',
];

async function conMemoria(): Promise<Adaptadores> {
  return {
    publicaciones: new MemoriaPublicacionRepository(),
    cuentas: new MemoriaCuentaRepository(),
    notificaciones: new MemoriaNotificacionRepository(),
    coincidencias: new MemoriaCoincidenciaRepository(),
    reportes: new MemoriaReporteRepository(),
    fotos: new MemoriaFotoRepository(),
    fallidos: new MemoriaEventoFallidoRepository(),
    reclamaciones: new MemoriaReclamacionRepository(),
    sesiones: new MemoriaSesionRepository(),
  };
}

async function conPostgres(): Promise<Adaptadores> {
  // Se importan aquí para que lean DATABASE_URL ya fijada arriba.
  const { PostgresPublicacionRepository } = await import('../src/infrastructure/persistence/postgres-publicacion.repository');
  const { PostgresCuentaRepository } = await import('../src/infrastructure/persistence/postgres-cuenta.repository');
  const { PostgresNotificacionRepository } = await import('../src/infrastructure/persistence/postgres-notificacion.repository');
  const { PostgresCoincidenciaRepository } = await import('../src/infrastructure/persistence/postgres-coincidencia.repository');
  const { PostgresReporteRepository } = await import('../src/infrastructure/persistence/postgres-reporte.repository');
  const { PostgresFotoRepository } = await import('../src/infrastructure/persistence/postgres-foto.repository');
  const { PostgresEventoFallidoRepository } = await import('../src/infrastructure/persistence/postgres-evento-fallido.repository');
  const { PostgresReclamacionRepository } = await import('../src/infrastructure/persistence/postgres-reclamacion.repository');
  const { PostgresSesionRepository } = await import('../src/infrastructure/persistence/postgres-sesion.repository');
  const { obtenerPoolCompartido } = await import('../src/infrastructure/persistence/postgres-comun');

  const publicaciones = new PostgresPublicacionRepository();
  await publicaciones.onModuleInit();
  const otros = [
    new PostgresCuentaRepository(),
    new PostgresNotificacionRepository(),
    new PostgresCoincidenciaRepository(),
    new PostgresReporteRepository(),
    new PostgresFotoRepository(),
    new PostgresEventoFallidoRepository(),
    new PostgresReclamacionRepository(),
    new PostgresSesionRepository(),
  ];
  for (const o of otros) o.onModuleInit(); // el esquema se prepara en segundo plano: se espera abajo

  const pool = obtenerPoolCompartido();
  for (let intento = 0; intento < 60; intento++) {
    const r = await pool.query('SELECT bool_and(to_regclass(t) IS NOT NULL) AS listas FROM unnest($1::text[]) AS t', [TABLAS]);
    if (r.rows[0].listas) break;
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  return {
    publicaciones,
    cuentas: otros[0] as CuentaRepository,
    notificaciones: otros[1] as NotificacionRepository,
    coincidencias: otros[2] as CoincidenciaRepository,
    reportes: otros[3] as ReporteRepository,
    fotos: otros[4] as FotoRepository,
    fallidos: otros[5] as EventoFallidoRepository,
    reclamaciones: otros[6] as ReclamacionRepository,
    sesiones: otros[7] as SesionRepository,
    cerrar: async () => {
      await pool.end();
      await (publicaciones as unknown as { pool: { end(): Promise<void> } }).pool.end();
    },
  };
}

const implementaciones: Array<[string, () => Promise<Adaptadores>]> = [['memoria', conMemoria]];
if (URL_PRUEBAS) implementaciones.push(['PostgreSQL real', conPostgres]);

const ahora = () => new Date().toISOString();
const id = (prefijo: string) => `${prefijo}-${randomUUID()}`;

describe.each(implementaciones)('Puertos de persistencia contra %s', (nombre, crear) => {
  let a: Adaptadores;
  beforeAll(async () => {
    a = await crear();
  }, 30000);
  afterAll(async () => {
    await a.cerrar?.();
  });

  const publicacion = (extra: Partial<ConstructorParameters<typeof Publicacion>[0]> = {}) =>
    new Publicacion({
      id: id('pub'),
      tipo: 'encontrado',
      descripcion: 'Termo azul',
      categoria: 'adaptadores-e2e',
      ubicacion: 'Biblioteca',
      creadoEn: ahora(),
      autorId: 'autor',
      ...extra,
    });

  describe('Publicaciones', () => {
    it('crear sin duplicar: cinco inserciones simultáneas del mismo id dejan una sola', async () => {
      const p = publicacion();
      const resultados = await Promise.all(Array.from({ length: 5 }, () => a.publicaciones.guardarSiNoExiste(p)));
      expect(resultados.filter(Boolean)).toHaveLength(1);
    });

    it('comparar y fijar: de cinco aprobaciones simultáneas solo una cambia el estado, y deja anotada su reclamación', async () => {
      const p = publicacion({ estado: 'en_verificacion' });
      await a.publicaciones.guardar(p);

      const reclamaciones = Array.from({ length: 5 }, (_, i) => `rec-${i}`);
      const resultados = await Promise.all(
        reclamaciones.map((r) => a.publicaciones.cambiarEstado(p.id, 'en_verificacion', 'por_entregar', r)),
      );

      expect(resultados.filter(Boolean)).toHaveLength(1);
      const final = await a.publicaciones.buscarPorId(p.id);
      expect(final?.estado).toBe('por_entregar');
      expect(reclamaciones).toContain(final?.reclamacionAprobadaId);
    });

    it('cerrar solo funciona desde "publicado", y una vez', async () => {
      const p = publicacion();
      await a.publicaciones.guardar(p);
      expect(await a.publicaciones.cerrar(p.id, 'retirado', ahora())).toBe(true);
      expect(await a.publicaciones.cerrar(p.id, 'retirado', ahora())).toBe(false);
      const cerrada = await a.publicaciones.buscarPorId(p.id);
      expect(cerrada).toMatchObject({ estado: 'cerrado', motivoCierre: 'retirado' });
    });

    it('la búsqueda solo devuelve lo activo, y las fechas y la marca de foto sobreviven intactas', async () => {
      const activa = publicacion({ categoria: 'adaptadores-busqueda' });
      const cerrada = publicacion({ categoria: 'adaptadores-busqueda' });
      await a.publicaciones.guardar(activa);
      await a.publicaciones.guardar(cerrada);
      await a.publicaciones.cerrar(cerrada.id, 'retirado', ahora());
      await a.publicaciones.marcarFoto(activa.id, true);

      const hallados = await a.publicaciones.buscar({ categoria: 'adaptadores-busqueda', limite: 50 });

      expect(hallados.map((p) => p.id)).toEqual([activa.id]);
      expect(hallados[0].creadoEn).toBe(activa.creadoEn);
      expect(hallados[0].tieneFoto).toBe(true);
    });
  });

  describe('Cuentas y avisos', () => {
    it('el correo es único: de cinco registros simultáneos con el mismo correo solo uno entra', async () => {
      const correo = `adaptadores-${randomUUID().slice(0, 8)}@utb.edu.co`;
      const registros = Array.from({ length: 5 }, () =>
        a.cuentas.guardarSiCorreoLibre(new Cuenta({ id: id('cta'), correo, nombre: 'Prueba', hashContrasena: 'h', creadoEn: ahora() })),
      );
      expect((await Promise.all(registros)).filter(Boolean)).toHaveLength(1);
    });

    it('un aviso con el mismo id no se duplica, ni siquiera en paralelo (la idempotencia de los eventos)', async () => {
      const n = new Notificacion({
        id: id('reclamacion-nueva'),
        cuentaId: 'cta-avisos',
        tipo: 'reclamacion_nueva',
        titulo: 'Alguien reclamó',
        mensaje: 'Revisa la reclamación',
        publicacionId: 'p1',
        creadoEn: ahora(),
      });
      const resultados = await Promise.all(Array.from({ length: 5 }, () => a.notificaciones.guardarSiNoExiste(n)));
      expect(resultados.filter(Boolean)).toHaveLength(1);
    });
  });

  describe('Coincidencias, reportes y fotos', () => {
    it('recalcular una coincidencia actualiza su puntaje y no la duplica', async () => {
      const origen = id('o');
      const coincidente = id('c');
      const coincidencia = (score: number) =>
        new Coincidencia({ id: `${origen}__${coincidente}`, publicacionOrigenId: origen, publicacionCoincidenteId: coincidente, score, creadoEn: ahora() });

      await a.coincidencias.guardar(coincidencia(0.4));
      await a.coincidencias.guardar(coincidencia(0.9));

      const guardadas = await a.coincidencias.listarPorPublicacion(origen);
      expect(guardadas).toHaveLength(1);
      expect(guardadas[0].score).toBeCloseTo(0.9, 2);
    });

    it('los bytes de una foto sobreviven intactos (los 256 valores posibles)', async () => {
      const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
      const publicacionId = id('foto');
      await a.fotos.guardar(new Foto({ publicacionId, completa: bytes, miniatura: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), creadoEn: ahora() }));

      const leida = await a.fotos.buscarPorPublicacion(publicacionId);

      expect(Buffer.compare(leida?.completa as Buffer, bytes)).toBe(0);
      expect(await a.fotos.eliminar(publicacionId)).toBe(true);
      expect(await a.fotos.buscarPorPublicacion(publicacionId)).toBeNull();
    });

    it('deja una foto con todos los bytes guardada: es lo que la verificación de respaldos compara después', async () => {
      const bytes = Buffer.from(Array.from({ length: 256 }, (_, i) => 255 - i));
      const publicacionId = id('foto-respaldo');
      await a.fotos.guardar(new Foto({ publicacionId, completa: bytes, miniatura: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), creadoEn: ahora() }));
      expect(Buffer.compare((await a.fotos.buscarPorPublicacion(publicacionId))?.completa as Buffer, bytes)).toBe(0);
    });

    it('un reporte se guarda y se lista como abierto', async () => {
      const reporte = new Reporte({ id: id('rep'), publicacionId: id('pub'), reportanteId: id('cta'), motivo: 'spam', creadoEn: ahora() });
      await a.reportes.guardar(reporte);
      expect((await a.reportes.listarAbiertos(500)).map((r) => r.id)).toContain(reporte.id);
    });

    if (nombre === 'PostgreSQL real') {
      it('una cuenta no puede reportar dos veces la misma publicación: lo impide el índice único, no solo el caso de uso', async () => {
        const publicacionId = id('pub');
        const reportanteId = id('cta');
        const nuevo = () => new Reporte({ id: id('rep'), publicacionId, reportanteId, motivo: 'spam', creadoEn: ahora() });
        await a.reportes.guardar(nuevo());
        await expect(a.reportes.guardar(nuevo())).rejects.toBeDefined();
      });
    }
  });

  describe('Cola de eventos fallidos', () => {
    it('la carga JSON sobrevive intacta; lo reprocesado deja de estar pendiente; lo viejo se borra', async () => {
      const carga = { reclamacionId: 'r1', anidado: { lista: [1, 2, 3], nulo: null }, texto: 'ñandú «con» tildes' };
      const e = new EventoFallido({ id: id('evt'), tipo: 'reclamacion.creada', version: 1, carga, ocurridoEn: ahora(), intentos: 3, ultimoError: 'caída', creadoEn: ahora() });
      await a.fallidos.guardar(e);

      expect((await a.fallidos.buscarPorId(e.id))?.carga).toEqual(carga);
      expect((await a.fallidos.listarPendientes(500)).map((x) => x.id)).toContain(e.id);

      await a.fallidos.guardar(e.reprocesado(ahora()));
      expect((await a.fallidos.listarPendientes(500)).map((x) => x.id)).not.toContain(e.id);
      expect((await a.fallidos.buscarPorId(e.id))?.estado).toBe('reprocesado');

      const futuro = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(await a.fallidos.eliminarAnterioresA(futuro)).toBeGreaterThanOrEqual(1);
      expect(await a.fallidos.buscarPorId(e.id)).toBeNull();

      // Uno queda guardado, con su JSON, para que la verificación de respaldos lo compare.
      await a.fallidos.guardar(new EventoFallido({ id: id('evt-respaldo'), tipo: 'reclamacion.creada', version: 1, carga, ocurridoEn: ahora(), intentos: 3, ultimoError: 'caída', creadoEn: ahora() }));
    });
  });

  describe('Reclamaciones', () => {
    const PRUEBA = 'Tiene una calcomanía de la UTB por dentro y las iniciales C.C.';
    const reclamacion = (extra: Partial<ConstructorParameters<typeof Reclamacion>[0]> = {}) =>
      new Reclamacion({ id: id('rec'), publicacionId: id('pub'), reclamanteId: id('cta'), prueba: PRUEBA, creadoEn: ahora(), ...extra });

    it('guardar inserta o reemplaza por id: el mismo registro pasa de pendiente a aprobada y a entregada sin duplicarse', async () => {
      const r = reclamacion();
      await a.reclamaciones.guardar(r);
      const aprobada = r.aprobar(ahora());
      await a.reclamaciones.guardar(aprobada);
      await a.reclamaciones.guardar(aprobada.confirmarEntrega(ahora()));

      const leida = await a.reclamaciones.buscarPorId(r.id);
      expect(leida).toMatchObject({ estado: 'aprobada', creadoEn: r.creadoEn });
      expect(leida?.entregadaEn).not.toBeNull();
      expect(await a.reclamaciones.listarPorPublicacion(r.publicacionId)).toHaveLength(1);
    });

    it('las abiertas son las pendientes y las aprobadas sin entrega: lo que recorre el reconciliador', async () => {
      const pendiente = reclamacion();
      const sinEntrega = reclamacion();
      const entregada = reclamacion();
      const rechazada = reclamacion();
      await a.reclamaciones.guardar(pendiente);
      await a.reclamaciones.guardar(sinEntrega.aprobar(ahora()));
      await a.reclamaciones.guardar(entregada.aprobar(ahora()).confirmarEntrega(ahora()));
      await a.reclamaciones.guardar(rechazada.rechazar(ahora(), 'No coincide'));

      const abiertas = (await a.reclamaciones.listarAbiertas(500)).map((r) => r.id);

      expect(abiertas).toEqual(expect.arrayContaining([pendiente.id, sinEntrega.id]));
      expect(abiertas).not.toContain(entregada.id);
      expect(abiertas).not.toContain(rechazada.id);
    });

    it('la conciliación de avisos pide lo creado desde una fecha, sin lo anterior', async () => {
      const vieja = reclamacion({ creadoEn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() });
      const reciente = reclamacion();
      await a.reclamaciones.guardar(vieja);
      await a.reclamaciones.guardar(reciente);

      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const ids = (await a.reclamaciones.listarCreadasDesde(desde, 500)).map((r) => r.id);

      expect(ids).toContain(reciente.id);
      expect(ids).not.toContain(vieja.id);
    });

    it('al eliminar una cuenta se reemplaza el texto de sus pruebas y se dice cuántas', async () => {
      const reclamanteId = id('cta');
      await a.reclamaciones.guardar(reclamacion({ reclamanteId }));
      await a.reclamaciones.guardar(reclamacion({ reclamanteId }));

      expect(await a.reclamaciones.anonimizarPruebasDe(reclamanteId)).toBe(2);
      expect((await a.reclamaciones.listarPorReclamante(reclamanteId)).map((r) => r.prueba)).toEqual([
        PRUEBA_ANONIMIZADA,
        PRUEBA_ANONIMIZADA,
      ]);
      expect(await a.reclamaciones.anonimizarPruebasDe(reclamanteId)).toBe(0); // repetirlo no cambia nada
    });
  });

  describe('Sesiones', () => {
    const sesion = (extra: Partial<{ tokenHash: string; cuentaId: string; expiraEn: string }> = {}) => ({
      tokenHash: id('hash'),
      cuentaId: id('cta'),
      creadaEn: ahora(),
      expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ...extra,
    });

    it('se guarda y se encuentra por el hash del token, con sus fechas intactas, y se puede cerrar', async () => {
      const s = sesion();
      await a.sesiones.guardar(s);

      expect(await a.sesiones.buscarPorTokenHash(s.tokenHash)).toEqual(s);
      await a.sesiones.eliminar(s.tokenHash);
      expect(await a.sesiones.buscarPorTokenHash(s.tokenHash)).toBeNull();
    });

    it('al eliminar una cuenta se cierran todas sus sesiones y solo las suyas', async () => {
      const cuentaId = id('cta');
      const suyas = [sesion({ cuentaId }), sesion({ cuentaId })];
      const ajena = sesion();
      for (const s of [...suyas, ajena]) await a.sesiones.guardar(s);

      await a.sesiones.eliminarDeCuenta(cuentaId);

      for (const s of suyas) expect(await a.sesiones.buscarPorTokenHash(s.tokenHash)).toBeNull();
      expect(await a.sesiones.buscarPorTokenHash(ajena.tokenHash)).not.toBeNull();
    });

    it('la retención borra las vencidas y deja las vigentes, y dice cuántas', async () => {
      const vencida = sesion({ expiraEn: new Date(Date.now() - 60 * 1000).toISOString() });
      const vigente = sesion();
      await a.sesiones.guardar(vencida);
      await a.sesiones.guardar(vigente);

      expect(await a.sesiones.eliminarExpiradas(ahora())).toBeGreaterThanOrEqual(1);

      expect(await a.sesiones.buscarPorTokenHash(vencida.tokenHash)).toBeNull();
      expect(await a.sesiones.buscarPorTokenHash(vigente.tokenHash)).not.toBeNull();
    });
  });
});
