import { CrearPublicacion } from './crear-publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { PublicacionInvalidaError } from '../../domain/entities/publicacion';

describe('CrearPublicacion', () => {
  it('crea una publicación válida y la persiste', async () => {
    const repositorio = new MemoriaPublicacionRepository();
    const crearPublicacion = new CrearPublicacion(repositorio);

    const publicacion = await crearPublicacion.ejecutar({
      tipo: 'perdido',
      descripcion: 'Mochila azul con laptop',
      categoria: 'mochilas',
      ubicacion: 'Bloque 5, UTB',
    });

    expect(publicacion.id).toBeDefined();
    expect(publicacion.estado).toBe('publicado');

    const encontrada = await repositorio.buscarPorId(publicacion.id);
    expect(encontrada).not.toBeNull();
    expect(encontrada?.descripcion).toBe('Mochila azul con laptop');
  });

  it('rechaza un tipo inválido con PublicacionInvalidaError', async () => {
    const repositorio = new MemoriaPublicacionRepository();
    const crearPublicacion = new CrearPublicacion(repositorio);

    await expect(
      crearPublicacion.ejecutar({
        // @ts-expect-error: tipo inválido a propósito, para probar la validación
        tipo: 'no-valido',
        descripcion: 'x',
        categoria: 'y',
        ubicacion: 'z',
      }),
    ).rejects.toThrow(PublicacionInvalidaError);
  });

  it('rechaza una descripción vacía', async () => {
    const repositorio = new MemoriaPublicacionRepository();
    const crearPublicacion = new CrearPublicacion(repositorio);

    await expect(
      crearPublicacion.ejecutar({
        tipo: 'encontrado',
        descripcion: '   ',
        categoria: 'llaves',
        ubicacion: 'Biblioteca',
      }),
    ).rejects.toThrow(PublicacionInvalidaError);
  });
});
