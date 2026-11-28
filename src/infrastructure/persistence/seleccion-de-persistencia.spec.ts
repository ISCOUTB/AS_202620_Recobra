import { PersistenciaNoConfiguradaError, persistenciaConfigurada } from './seleccion-de-persistencia';

describe('persistenciaConfigurada', () => {
  it('con DATABASE_URL usa PostgreSQL, en cualquier entorno', () => {
    expect(persistenciaConfigurada({ DATABASE_URL: 'postgres://x', NODE_ENV: 'production' })).toBe('postgres');
    expect(persistenciaConfigurada({ DATABASE_URL: 'postgres://x' })).toBe('postgres');
  });

  it('fuera de producción, sin DATABASE_URL, usa memoria (pruebas y desarrollo)', () => {
    expect(persistenciaConfigurada({})).toBe('memoria');
    expect(persistenciaConfigurada({ NODE_ENV: 'test' })).toBe('memoria');
  });

  it('en producción sin DATABASE_URL no arranca: no finge estar sano sin guardar nada', () => {
    expect(() => persistenciaConfigurada({ NODE_ENV: 'production' })).toThrow(PersistenciaNoConfiguradaError);
    expect(() => persistenciaConfigurada({ NODE_ENV: 'production', DATABASE_URL: '' })).toThrow(
      PersistenciaNoConfiguradaError,
    );
  });

  it('en producción solo acepta memoria si se pide de forma explícita', () => {
    expect(persistenciaConfigurada({ NODE_ENV: 'production', PERMITIR_MEMORIA: 'true' })).toBe('memoria');
    expect(() => persistenciaConfigurada({ NODE_ENV: 'production', PERMITIR_MEMORIA: 'si' })).toThrow(
      PersistenciaNoConfiguradaError,
    );
  });
});
