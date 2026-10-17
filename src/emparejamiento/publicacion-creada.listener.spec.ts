import { PublicacionCreadaListener } from './publicacion-creada.listener';
import { BuscarCoincidencias } from '../application/use-cases/buscar-coincidencias';
import { Publicacion } from '../domain/entities/publicacion';
import { AlmacenamientoNoDisponibleError } from '../domain/errors/almacenamiento-no-disponible.error';

/** Modo de fallo "Emparejamiento no responde": el error no debe escapar del manejador del evento. */
describe('PublicacionCreadaListener', () => {
  it('si el cálculo de coincidencias falla, el manejador termina sin lanzar', async () => {
    const buscar = { ejecutar: jest.fn().mockRejectedValue(new AlmacenamientoNoDisponibleError()) };
    const listener = new PublicacionCreadaListener(buscar as unknown as BuscarCoincidencias);
    const publicacion = new Publicacion({
      id: 'p1',
      tipo: 'perdido',
      descripcion: 'Casco',
      categoria: 'otros',
      ubicacion: 'A2',
      creadoEn: new Date().toISOString(),
    });

    await expect(listener.manejar(publicacion)).resolves.toBeUndefined();
    expect(buscar.ejecutar).toHaveBeenCalledTimes(1);
  });
});
