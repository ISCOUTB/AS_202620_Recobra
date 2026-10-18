import { jpegDePrueba } from '../../../test/support/jpeg-de-prueba';
import { Cuenta } from '../../domain/entities/cuenta';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { ConflictoError, DatoInvalidoError, NoEncontradoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';
import { MemoriaFotoRepository } from '../../infrastructure/persistence/memoria-foto.repository';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../../infrastructure/persistence/memoria-reclamacion.repository';
import { ObtenerFoto, QuitarFoto, SubirFoto } from './fotos';

describe('Fotos de las publicaciones (ADR-0023)', () => {
  const cuenta = (id: string) => ({ id, correo: `${id}@utb.edu.co`, nombre: id }) as Cuenta;
  const ana = cuenta('ana');
  const bea = cuenta('bea');
  const leo = cuenta('leo');
  const grande = jpegDePrueba({ ancho: 800, alto: 600, exif: 'GPS 10.39N' });
  const chica = jpegDePrueba({ ancho: 24, alto: 18 }).toString('base64');

  let fotos: MemoriaFotoRepository;
  let publicaciones: MemoriaPublicacionRepository;
  let reclamaciones: MemoriaReclamacionRepository;
  let subir: SubirFoto;
  let quitar: QuitarFoto;
  let obtener: ObtenerFoto;

  beforeEach(() => {
    fotos = new MemoriaFotoRepository();
    publicaciones = new MemoriaPublicacionRepository();
    reclamaciones = new MemoriaReclamacionRepository();
    subir = new SubirFoto(fotos, publicaciones);
    quitar = new QuitarFoto(fotos, publicaciones);
    obtener = new ObtenerFoto(fotos, publicaciones, reclamaciones);
  });

  async function publicar(id: string, tipo: TipoPublicacion, estado: 'publicado' | 'por_entregar' = 'publicado') {
    await publicaciones.guardar(
      new Publicacion({
        id,
        tipo,
        descripcion: 'Termo',
        categoria: 'otros',
        ubicacion: 'Biblioteca',
        creadoEn: '2026-10-18T10:00:00.000Z',
        autorId: 'ana',
        estado,
      }),
    );
  }

  it('el autor sube la foto: queda sin metadatos y la publicación lo anota', async () => {
    await publicar('p1', 'perdido');

    const publicacion = await subir.ejecutar('p1', ana, grande, chica);

    expect(publicacion.tieneFoto).toBe(true);
    const guardada = await fotos.buscarPorPublicacion('p1');
    expect(guardada?.completa.includes('GPS')).toBe(false);
  });

  it('solo el autor la sube o la quita, y solo mientras nadie la reclama', async () => {
    await publicar('p1', 'encontrado');
    await expect(subir.ejecutar('p1', bea, grande, chica)).rejects.toThrow(PermisoDenegadoError);
    await expect(subir.ejecutar('nada', ana, grande, chica)).rejects.toThrow(NoEncontradoError);

    await publicar('p2', 'encontrado', 'por_entregar');
    await expect(subir.ejecutar('p2', ana, grande, chica)).rejects.toThrow(ConflictoError);
    await expect(quitar.ejecutar('p2', ana)).rejects.toThrow(ConflictoError);
  });

  it('rechaza una miniatura que no es base64 o no es un JPEG pequeño', async () => {
    await publicar('p1', 'perdido');
    await expect(subir.ejecutar('p1', ana, grande, undefined)).rejects.toThrow(DatoInvalidoError);
    await expect(subir.ejecutar('p1', ana, grande, 'esto no es base64')).rejects.toThrow(/base64/);
    await expect(subir.ejecutar('p1', ana, grande, grande.toString('base64'))).rejects.toThrow(DatoInvalidoError);
    expect(await fotos.buscarPorPublicacion('p1')).toBeNull();
  });

  it('quitar la foto la borra y lo anota', async () => {
    await publicar('p1', 'perdido');
    await subir.ejecutar('p1', ana, grande, chica);

    const publicacion = await quitar.ejecutar('p1', ana);

    expect(publicacion.tieneFoto).toBe(false);
    expect(await fotos.buscarPorPublicacion('p1')).toBeNull();
  });

  it('la miniatura es pública y la foto de un perdido también', async () => {
    await publicar('p1', 'perdido');
    await subir.ejecutar('p1', ana, grande, chica);

    expect((await obtener.ejecutar('p1', null, 'miniatura')).length).toBeGreaterThan(0);
    expect((await obtener.ejecutar('p1', null, 'completa')).length).toBeGreaterThan(0);
  });

  it('la foto completa de un encontrado solo la ven su autor y quien tiene una reclamación aprobada', async () => {
    await publicar('p2', 'encontrado');
    await subir.ejecutar('p2', ana, grande, chica);
    const reclamo = (id: string, reclamanteId: string, estado: 'pendiente' | 'aprobada') =>
      new Reclamacion({
        id,
        publicacionId: 'p2',
        reclamanteId,
        prueba: 'Tiene una calcomanía de la UTB por dentro',
        estado,
        creadoEn: '2026-10-18T11:00:00.000Z',
      });
    await reclamaciones.guardar(reclamo('r1', 'bea', 'pendiente'));
    await reclamaciones.guardar(reclamo('r2', 'leo', 'aprobada'));

    await expect(obtener.ejecutar('p2', null, 'completa')).rejects.toThrow(PermisoDenegadoError);
    await expect(obtener.ejecutar('p2', bea, 'completa')).rejects.toThrow(PermisoDenegadoError); // reclamó, pero aún no la aprueban
    expect((await obtener.ejecutar('p2', ana, 'completa')).length).toBeGreaterThan(0);
    expect((await obtener.ejecutar('p2', leo, 'completa')).length).toBeGreaterThan(0);
    expect((await obtener.ejecutar('p2', null, 'miniatura')).length).toBeGreaterThan(0); // la miniatura sí es pública
  });

  it('sin foto responde que no existe', async () => {
    await publicar('p1', 'perdido');
    await expect(obtener.ejecutar('p1', null, 'miniatura')).rejects.toThrow(NoEncontradoError);
  });
});
