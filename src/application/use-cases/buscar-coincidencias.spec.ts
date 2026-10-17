import { EventEmitter2 } from '@nestjs/event-emitter';
import { BuscarCoincidencias } from './buscar-coincidencias';
import { CrearPublicacion } from './crear-publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaCoincidenciaRepository } from '../../infrastructure/persistence/memoria-coincidencia.repository';

describe('BuscarCoincidencias', () => {
  let crear: CrearPublicacion;
  let buscar: BuscarCoincidencias;

  beforeEach(() => {
    const publicaciones = new MemoriaPublicacionRepository();
    const coincidencias = new MemoriaCoincidenciaRepository();
    crear = new CrearPublicacion(publicaciones, new EventEmitter2());
    buscar = new BuscarCoincidencias(publicaciones, coincidencias);
  });

  it('detecta una coincidencia entre un "perdido" y un "encontrado" de la misma categoría y ubicación', async () => {
    const perdido = await crear.ejecutar({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const encontrado = await crear.ejecutar({
      tipo: 'encontrado',
      descripcion: 'Cargador negro',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const encontradas = await buscar.ejecutar(encontrado);

    expect(encontradas).toHaveLength(1);
    expect(encontradas[0].publicacionCoincidenteId).toBe(perdido.id);
    expect(encontradas[0].score).toBe(1);
  });

  it('no detecta coincidencia si la categoría es distinta', async () => {
    await crear.ejecutar({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const encontrado = await crear.ejecutar({
      tipo: 'encontrado',
      descripcion: 'Llavero',
      categoria: 'llaves',
      ubicacion: 'Bloque 3',
    });

    const encontradas = await buscar.ejecutar(encontrado);

    expect(encontradas).toHaveLength(0);
  });

  it('no compara publicaciones del mismo tipo entre sí', async () => {
    await crear.ejecutar({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const otroPerdido = await crear.ejecutar({
      tipo: 'perdido',
      descripcion: 'Otro cargador',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const encontradas = await buscar.ejecutar(otroPerdido);

    expect(encontradas).toHaveLength(0);
  });

  it('da score parcial (0.3) cuando la ubicación no coincide ni se contiene', async () => {
    await crear.ejecutar({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const encontrado = await crear.ejecutar({
      tipo: 'encontrado',
      descripcion: 'Cargador negro',
      categoria: 'electronica',
      ubicacion: 'Biblioteca',
    });

    const encontradas = await buscar.ejecutar(encontrado);

    expect(encontradas).toHaveLength(1);
    expect(encontradas[0].score).toBe(0.3);
  });

  it('si el evento llega dos veces, la coincidencia no se duplica', async () => {
    const coincidencias = new MemoriaCoincidenciaRepository();
    const publicaciones = new MemoriaPublicacionRepository();
    const crearLocal = new CrearPublicacion(publicaciones, new EventEmitter2());
    const buscarLocal = new BuscarCoincidencias(publicaciones, coincidencias);

    await crearLocal.ejecutar({ tipo: 'perdido', descripcion: 'Casco', categoria: 'otros', ubicacion: 'A2' });
    const encontrado = await crearLocal.ejecutar({
      tipo: 'encontrado',
      descripcion: 'Casco negro',
      categoria: 'otros',
      ubicacion: 'A2',
    });

    await buscarLocal.ejecutar(encontrado);
    await buscarLocal.ejecutar(encontrado); // entrega repetida del mismo evento

    expect(await coincidencias.listarPorPublicacion(encontrado.id)).toHaveLength(1);
  });
});
