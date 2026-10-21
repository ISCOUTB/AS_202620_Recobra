import { Coincidencia } from '../../domain/entities/coincidencia';
import { Cuenta } from '../../domain/entities/cuenta';
import { Publicacion } from '../../domain/entities/publicacion';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { Reporte } from '../../domain/entities/reporte';
import { MemoriaCoincidenciaRepository } from '../../infrastructure/persistence/memoria-coincidencia.repository';
import { MemoriaCuentaRepository } from '../../infrastructure/persistence/memoria-cuenta.repository';
import { MemoriaNotificacionRepository } from '../../infrastructure/persistence/memoria-notificacion.repository';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../../infrastructure/persistence/memoria-reclamacion.repository';
import { MemoriaReporteRepository } from '../../infrastructure/persistence/memoria-reporte.repository';
import { ConciliarAvisos } from './conciliar-avisos';
import { Notificar } from './notificaciones';

describe('Conciliación de avisos (ADR-0024)', () => {
  const ahora = new Date('2026-10-18T12:00:00.000Z');
  const hace = (horas: number) => new Date(ahora.getTime() - horas * 60 * 60 * 1000).toISOString();

  let publicaciones: MemoriaPublicacionRepository;
  let cuentas: MemoriaCuentaRepository;
  let avisos: MemoriaNotificacionRepository;
  let coincidencias: MemoriaCoincidenciaRepository;
  let reclamaciones: MemoriaReclamacionRepository;
  let reportes: MemoriaReporteRepository;
  let conciliar: ConciliarAvisos;

  beforeEach(() => {
    publicaciones = new MemoriaPublicacionRepository();
    cuentas = new MemoriaCuentaRepository();
    avisos = new MemoriaNotificacionRepository();
    coincidencias = new MemoriaCoincidenciaRepository();
    reclamaciones = new MemoriaReclamacionRepository();
    reportes = new MemoriaReporteRepository();
    conciliar = new ConciliarAvisos(
      new Notificar(avisos, publicaciones, cuentas),
      coincidencias,
      reclamaciones,
      reportes,
      publicaciones,
    );
  });

  const publicacion = (id: string, tipo: 'perdido' | 'encontrado', autorId: string, estado: 'publicado' | 'cerrado' = 'publicado') =>
    publicaciones.guardar(
      new Publicacion({
        id,
        tipo,
        descripcion: `Objeto ${id}`,
        categoria: 'otros',
        ubicacion: 'Biblioteca',
        creadoEn: hace(5),
        autorId,
        estado,
        motivoCierre: estado === 'cerrado' ? 'moderado' : null,
      }),
    );

  const avisosDe = async (cuentaId: string) => (await avisos.listarPorCuenta(cuentaId, 50)).map((a) => a.tipo);

  it('recrea los avisos de lo reciente cuyo evento se perdió, y no los duplica al repetir', async () => {
    await publicacion('perdido-1', 'perdido', 'ana');
    await publicacion('encontrado-1', 'encontrado', 'bea');
    await coincidencias.guardar(
      new Coincidencia({
        id: 'encontrado-1__perdido-1',
        publicacionOrigenId: 'encontrado-1',
        publicacionCoincidenteId: 'perdido-1',
        score: 0.8,
        creadoEn: hace(2),
      }),
    );
    await reclamaciones.guardar(
      new Reclamacion({
        id: 'r-aprobada',
        publicacionId: 'encontrado-1',
        reclamanteId: 'leo',
        prueba: 'Tiene una calcomanía de la UTB por dentro',
        estado: 'aprobada',
        creadoEn: hace(3),
        resueltaEn: hace(1),
      }),
    );
    await publicacion('abusiva', 'perdido', 'ana', 'cerrado');
    await reportes.guardar(
      new Reporte({
        id: 'rep-1',
        publicacionId: 'abusiva',
        reportanteId: 'bea',
        motivo: 'spam',
        creadoEn: hace(4),
        estado: 'ocultada',
        resueltoEn: hace(1),
        resueltoPor: 'admin',
      }),
    );

    const primera = await conciliar.ejecutar(ahora);

    expect(primera).toEqual({ coincidencias: 1, reclamaciones: 2, moderaciones: 1 });
    expect(await avisosDe('ana')).toEqual(expect.arrayContaining(['coincidencia', 'publicacion_ocultada']));
    expect(await avisosDe('bea')).toEqual(['reclamacion_nueva']); // quien publicó el encontrado
    expect(await avisosDe('leo')).toEqual(['reclamacion_aprobada']);

    expect(await conciliar.ejecutar(ahora)).toEqual({ coincidencias: 0, reclamaciones: 0, moderaciones: 0 });
    expect(await avisos.listarPorCuenta('ana', 50)).toHaveLength(2);
  });

  it('con una reclamación pendiente solo avisa a quien publicó; no inventa una resolución', async () => {
    await publicacion('encontrado-1', 'encontrado', 'bea');
    await reclamaciones.guardar(
      new Reclamacion({
        id: 'r-pendiente',
        publicacionId: 'encontrado-1',
        reclamanteId: 'leo',
        prueba: 'Tiene una calcomanía de la UTB por dentro',
        creadoEn: hace(1),
      }),
    );

    await conciliar.ejecutar(ahora);

    expect(await avisosDe('bea')).toEqual(['reclamacion_nueva']);
    expect(await avisosDe('leo')).toEqual([]);
  });

  it('no mira lo de hace más de 3 días', async () => {
    await publicacion('encontrado-1', 'encontrado', 'bea');
    await reclamaciones.guardar(
      new Reclamacion({
        id: 'r-vieja',
        publicacionId: 'encontrado-1',
        reclamanteId: 'leo',
        prueba: 'Tiene una calcomanía de la UTB por dentro',
        creadoEn: hace(24 * 4),
      }),
    );

    expect(await conciliar.ejecutar(ahora)).toEqual({ coincidencias: 0, reclamaciones: 0, moderaciones: 0 });
  });

  it('no avisa a una cuenta eliminada', async () => {
    const eliminada = new Cuenta({
      id: 'bea',
      correo: 'eliminada-bea@eliminada.invalid',
      nombre: 'Cuenta eliminada',
      hashContrasena: '',
      creadoEn: hace(100),
      eliminadaEn: hace(1),
    });
    await cuentas.guardarSiCorreoLibre(eliminada);
    await publicacion('encontrado-1', 'encontrado', 'bea');
    await reclamaciones.guardar(
      new Reclamacion({
        id: 'r-1',
        publicacionId: 'encontrado-1',
        reclamanteId: 'leo',
        prueba: 'Tiene una calcomanía de la UTB por dentro',
        creadoEn: hace(2),
      }),
    );

    await conciliar.ejecutar(ahora);

    expect(await avisosDe('bea')).toEqual([]);
  });
});
