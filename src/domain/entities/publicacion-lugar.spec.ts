import { EventEmitter2 } from '@nestjs/event-emitter';
import { Publicacion, PublicacionInvalidaError } from './publicacion';
import { CrearPublicacion } from '../../application/use-cases/crear-publicacion';
import { ConflictoIdempotenciaError } from '../../application/errors/conflicto-idempotencia.error';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { CATALOGO_LUGARES } from '../lugares/catalogo-lugares';

describe('Lugar en dos niveles (lugar + piso o referencia)', () => {
  const base = { id: '1', tipo: 'perdido' as const, descripcion: 'Termo', categoria: 'otros', ubicacion: 'Bloque A1', creadoEn: '2026-10-17T00:00:00.000Z' };

  it('guarda el detalle sin espacios y lo deja en null si viene vacío o no viene', () => {
    expect(new Publicacion({ ...base, detalleUbicacion: '  Piso 2 · Salón 204 ' }).detalleUbicacion).toBe('Piso 2 · Salón 204');
    expect(new Publicacion({ ...base, detalleUbicacion: '   ' }).detalleUbicacion).toBeNull();
    expect(new Publicacion(base).detalleUbicacion).toBeNull();
  });

  it('rechaza un detalle de más de 120 caracteres', () => {
    expect(() => new Publicacion({ ...base, detalleUbicacion: 'x'.repeat(121) })).toThrow(PublicacionInvalidaError);
  });

  it('el reintento con la misma clave y otro piso es un conflicto, no una publicación nueva', async () => {
    const crear = new CrearPublicacion(new MemoriaPublicacionRepository(), new EventEmitter2());
    const datos = { tipo: 'perdido' as const, descripcion: 'Termo', categoria: 'otros', ubicacion: 'Bloque A1', detalleUbicacion: 'Piso 2' };
    await crear.ejecutarIdempotente(datos, 'clave-de-prueba-01', 'ana');

    const repetida = await crear.ejecutarIdempotente(datos, 'clave-de-prueba-01', 'ana');
    expect(repetida.repetida).toBe(true);
    await expect(
      crear.ejecutarIdempotente({ ...datos, detalleUbicacion: 'Piso 3' }, 'clave-de-prueba-01', 'ana'),
    ).rejects.toBeInstanceOf(ConflictoIdempotenciaError);
  });

  it('el catálogo recoge los pisos y zonas que dio el equipo', () => {
    const niveles = (nombre: string) => CATALOGO_LUGARES.find((l) => l.nombre === nombre)?.niveles;
    expect(niveles('Bloque A1')).toHaveLength(4); // los bloques tienen 4 pisos como mínimo
    expect(niveles('Bloque A2')).toEqual(['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4', 'Piso 5']); // el A2 llega al quinto
    expect(niveles('Biblioteca')).toEqual(['Hemeroteca', 'Piso 1', 'Piso 2', 'Piso 3 (sala de estudio)']);
    expect(niveles('Alcatraz')).toEqual(['Piso 1', 'Piso 2']);
    const sinPisos = ['El Mesón', 'Cafetería central', 'Panadería', 'Los Bohíos', 'Entrada principal', 'Gimnasio', 'Canchas', 'Parqueadero'];
    for (const nombre of sinPisos) expect(niveles(nombre)).toEqual([]);
  });

  it('el catálogo no repite lugares y cada piso es único dentro de su lugar', () => {
    const nombres = CATALOGO_LUGARES.map((l) => l.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const lugar of CATALOGO_LUGARES) expect(new Set(lugar.niveles).size).toBe(lugar.niveles.length);
  });
});
