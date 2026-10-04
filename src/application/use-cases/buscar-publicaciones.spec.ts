import { EventEmitter2 } from '@nestjs/event-emitter';
import { BuscarPublicaciones, LIMITE_MAXIMO, LIMITE_POR_DEFECTO } from './buscar-publicaciones';
import { CrearPublicacion } from './crear-publicacion';
import { PublicacionInvalidaError } from '../../domain/entities/publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';

describe('BuscarPublicaciones', () => {
  let crear: CrearPublicacion;
  let buscar: BuscarPublicaciones;

  beforeEach(() => {
    const repositorio = new MemoriaPublicacionRepository();
    crear = new CrearPublicacion(repositorio, new EventEmitter2());
    buscar = new BuscarPublicaciones(repositorio);
  });

  const nueva = (tipo: 'perdido' | 'encontrado', categoria: string, ubicacion: string) =>
    crear.ejecutar({ tipo, descripcion: `${categoria} en ${ubicacion}`, categoria, ubicacion });

  it('filtra por categoría sin distinguir mayúsculas ni espacios de borde', async () => {
    await nueva('perdido', 'electronica', 'Bloque A1');
    await nueva('perdido', 'llaves', 'Bloque A1');

    const resultado = await buscar.ejecutar({ categoria: '  ELECTRONICA ' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].categoria).toBe('electronica');
  });

  it('filtra por tipo y por ubicación a la vez', async () => {
    await nueva('perdido', 'ropa', 'Biblioteca');
    await nueva('encontrado', 'ropa', 'Biblioteca');
    await nueva('encontrado', 'ropa', 'Entrada principal');

    const resultado = await buscar.ejecutar({ tipo: 'encontrado', ubicacion: 'biblioteca' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe('encontrado');
    expect(resultado[0].ubicacion).toBe('Biblioteca');
  });

  it('sin filtros devuelve todo, más recientes primero', async () => {
    const primera = await nueva('perdido', 'ropa', 'A1');
    await new Promise((r) => setTimeout(r, 5));
    const segunda = await nueva('perdido', 'ropa', 'A2');

    const resultado = await buscar.ejecutar({});

    expect(resultado.map((p) => p.id)).toEqual([segunda.id, primera.id]);
  });

  it('respeta el límite pedido y usa el límite por defecto', async () => {
    for (let i = 0; i < LIMITE_POR_DEFECTO + 5; i += 1) {
      await nueva('perdido', 'ropa', `Lugar ${i}`);
    }

    expect(await buscar.ejecutar({ limite: 3 })).toHaveLength(3);
    expect(await buscar.ejecutar({})).toHaveLength(LIMITE_POR_DEFECTO);
  });

  it.each([['0'], ['-1'], ['abc'], ['2.5'], [String(LIMITE_MAXIMO + 1)]])(
    'rechaza el límite inválido %s con PublicacionInvalidaError',
    async (limite) => {
      await expect(buscar.ejecutar({ limite })).rejects.toThrow(PublicacionInvalidaError);
    },
  );

  it('rechaza un tipo inválido con PublicacionInvalidaError', async () => {
    await expect(buscar.ejecutar({ tipo: 'robado' })).rejects.toThrow(PublicacionInvalidaError);
  });
});
