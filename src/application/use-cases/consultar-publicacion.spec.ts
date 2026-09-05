import { CrearPublicacion } from './crear-publicacion';
import { ConsultarPublicacion } from './consultar-publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';

describe('ConsultarPublicacion', () => {
  it('consulta una publicación existente por id', async () => {
    const repositorio = new MemoriaPublicacionRepository();
    const crearPublicacion = new CrearPublicacion(repositorio);
    const consultarPublicacion = new ConsultarPublicacion(repositorio);

    const creada = await crearPublicacion.ejecutar({
      tipo: 'perdido',
      descripcion: 'Sombrilla negra',
      categoria: 'otros',
      ubicacion: 'Cafetería central',
    });

    const encontrada = await consultarPublicacion.ejecutar({ id: creada.id });

    expect(encontrada).not.toBeNull();
    expect(encontrada?.descripcion).toBe('Sombrilla negra');
  });

  it('devuelve null cuando el id no existe, sin lanzar error', async () => {
    const repositorio = new MemoriaPublicacionRepository();
    const consultarPublicacion = new ConsultarPublicacion(repositorio);

    const resultado = await consultarPublicacion.ejecutar({ id: 'no-existe' });

    expect(resultado).toBeNull();
  });
});
