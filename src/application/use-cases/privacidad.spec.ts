import { LimpiezaPeriodica } from './privacidad';
import { MemoriaSesionRepository } from '../../infrastructure/persistence/memoria-sesion.repository';
import { MemoriaNotificacionRepository } from '../../infrastructure/persistence/memoria-notificacion.repository';
import { MemoriaFotoRepository } from '../../infrastructure/persistence/memoria-foto.repository';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { Notificacion } from '../../domain/entities/notificacion';
import { Foto } from '../../domain/entities/foto';
import { Publicacion } from '../../domain/entities/publicacion';
import { jpegDePrueba } from '../../../test/support/jpeg-de-prueba';
import { EliminarFotoDe, LimpiarFotosDeCerradas } from './fotos';

describe('Retención de datos (ADR-0021 y ADR-0023)', () => {
  const ahora = new Date('2026-10-18T12:00:00.000Z');
  const hace = (dias: number) => new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
  const aviso = (id: string, creadoEn: string) =>
    new Notificacion({ id, cuentaId: 'ana', tipo: 'coincidencia', titulo: 't', mensaje: 'm', publicacionId: 'p', creadoEn });

  function limpieza(sesiones: MemoriaSesionRepository, avisos: MemoriaNotificacionRepository) {
    const fotos = new MemoriaFotoRepository();
    const publicaciones = new MemoriaPublicacionRepository();
    const retencion = new LimpiarFotosDeCerradas(fotos, publicaciones, new EliminarFotoDe(fotos, publicaciones));
    return { fotos, publicaciones, ejecutar: () => new LimpiezaPeriodica(sesiones, avisos, retencion).ejecutar(ahora) };
  }

  it('borra las sesiones vencidas y los avisos de más de 90 días, y deja lo vigente', async () => {
    const sesiones = new MemoriaSesionRepository();
    await sesiones.guardar({ tokenHash: 'vencida', cuentaId: 'ana', creadaEn: hace(10), expiraEn: hace(3) });
    await sesiones.guardar({ tokenHash: 'vigente', cuentaId: 'ana', creadaEn: hace(1), expiraEn: hace(-6) });
    const avisos = new MemoriaNotificacionRepository();
    await avisos.guardarSiNoExiste(aviso('viejo', hace(91)));
    await avisos.guardarSiNoExiste(aviso('reciente', hace(89)));

    const borrado = await limpieza(sesiones, avisos).ejecutar();

    expect(borrado).toEqual({ sesiones: 1, avisos: 1, fotos: 0 });
    expect(await sesiones.buscarPorTokenHash('vencida')).toBeNull();
    expect(await sesiones.buscarPorTokenHash('vigente')).not.toBeNull();
    expect((await avisos.listarPorCuenta('ana', 10)).map((n) => n.id)).toEqual(['reciente']);
  });

  it('borra la foto de lo que ya se cerró, se entregó o ya no existe, y deja la de lo que sigue publicado', async () => {
    const l = limpieza(new MemoriaSesionRepository(), new MemoriaNotificacionRepository());
    const publicacion = (id: string, estado: 'publicado' | 'cerrado' | 'reclamado') =>
      new Publicacion({
        id,
        tipo: 'perdido',
        descripcion: 'Termo',
        categoria: 'otros',
        ubicacion: 'Biblioteca',
        creadoEn: hace(1),
        autorId: 'ana',
        estado,
        tieneFoto: true,
      });
    const imagen = jpegDePrueba({ ancho: 20, alto: 20 });
    for (const [id, estado] of [
      ['vigente', 'publicado'],
      ['cerrada', 'cerrado'],
      ['entregada', 'reclamado'],
    ] as const) {
      await l.publicaciones.guardar(publicacion(id, estado));
      await l.fotos.guardar(Foto.crear(id, imagen, imagen, hace(1)));
    }
    await l.fotos.guardar(Foto.crear('huerfana', imagen, imagen, hace(1))); // su publicación ya no existe

    const borrado = await l.ejecutar();

    expect(borrado.fotos).toBe(3);
    expect(await l.fotos.listarPublicacionIds(10)).toEqual(['vigente']);
    expect((await l.publicaciones.buscarPorId('cerrada'))?.tieneFoto).toBe(false);
    expect((await l.publicaciones.buscarPorId('vigente'))?.tieneFoto).toBe(true);
  });
});
