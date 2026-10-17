import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrearPublicacion, idDesdeClave } from './crear-publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { PublicacionInvalidaError } from '../../domain/entities/publicacion';
import { ConflictoIdempotenciaError } from '../errors/conflicto-idempotencia.error';
import { PUBLICACION_CREADA } from '../events/publicacion-creada.event';

/** Modo de fallo "el cliente envía la misma creación dos veces" (docs/modos-de-fallo.md). */
describe('CrearPublicacion idempotente', () => {
  const datos = { tipo: 'perdido' as const, descripcion: 'Mochila azul', categoria: 'mochilas', ubicacion: 'Bloque 5' };
  let repositorio: MemoriaPublicacionRepository;
  let eventos: EventEmitter2;
  let crear: CrearPublicacion;

  beforeEach(() => {
    repositorio = new MemoriaPublicacionRepository();
    eventos = new EventEmitter2();
    crear = new CrearPublicacion(repositorio, eventos);
  });

  async function contar() {
    return (await repositorio.buscar({ limite: 50 })).length;
  }

  it('el id derivado de la clave es estable y distinto entre claves', () => {
    expect(idDesdeClave('clave-uno-123')).toBe(idDesdeClave('clave-uno-123'));
    expect(idDesdeClave('clave-uno-123')).not.toBe(idDesdeClave('clave-dos-456'));
  });

  it('repetir la misma clave devuelve la misma publicación, no crea otra y emite el evento una sola vez', async () => {
    const emitir = jest.spyOn(eventos, 'emit');

    const primera = await crear.ejecutarIdempotente(datos, 'reintento-0001');
    const segunda = await crear.ejecutarIdempotente(datos, 'reintento-0001');

    expect(primera.repetida).toBe(false);
    expect(segunda.repetida).toBe(true);
    expect(segunda.publicacion.id).toBe(primera.publicacion.id);
    expect(await contar()).toBe(1);
    expect(emitir.mock.calls.filter(([nombre]) => nombre === PUBLICACION_CREADA)).toHaveLength(1);
  });

  it('dos peticiones simultáneas con la misma clave dejan una sola publicación', async () => {
    const [a, b] = await Promise.all([
      crear.ejecutarIdempotente(datos, 'simultanea-0001'),
      crear.ejecutarIdempotente(datos, 'simultanea-0001'),
    ]);

    expect([a.repetida, b.repetida].sort((x, y) => Number(x) - Number(y))).toEqual([false, true]);
    expect(a.publicacion.id).toBe(b.publicacion.id);
    expect(await contar()).toBe(1);
  });

  it('la misma clave con datos distintos se rechaza', async () => {
    await crear.ejecutarIdempotente(datos, 'conflicto-0001');

    await expect(
      crear.ejecutarIdempotente({ ...datos, descripcion: 'Otra cosa' }, 'conflicto-0001'),
    ).rejects.toBeInstanceOf(ConflictoIdempotenciaError);
    expect(await contar()).toBe(1);
  });

  it('una clave con formato inválido se rechaza como dato inválido', async () => {
    await expect(crear.ejecutarIdempotente(datos, 'corta')).rejects.toBeInstanceOf(PublicacionInvalidaError);
    await expect(crear.ejecutarIdempotente(datos, 'con espacios no')).rejects.toBeInstanceOf(PublicacionInvalidaError);
  });
});
