const queryMock = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({ query: queryMock })),
}));

import { Pool } from 'pg';
import { PostgresPublicacionRepository } from './postgres-publicacion.repository';
import { Publicacion } from '../../domain/entities/publicacion';
import { AlmacenamientoNoDisponibleError } from '../../domain/errors/almacenamiento-no-disponible.error';

describe('PostgresPublicacionRepository', () => {
  beforeEach(() => {
    queryMock.mockReset();
    process.env.DATABASE_URL = 'postgres://prueba';
  });

  it('exige TLS por omisión y lo desactiva solo con DATABASE_SSL=false', () => {
    const PoolMock = Pool as unknown as jest.Mock;
    PoolMock.mockClear();

    delete process.env.DATABASE_SSL;
    new PostgresPublicacionRepository();
    expect(PoolMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
    );

    process.env.DATABASE_SSL = 'false';
    new PostgresPublicacionRepository();
    expect(PoolMock).toHaveBeenLastCalledWith(expect.objectContaining({ ssl: false }));
    delete process.env.DATABASE_SSL;
  });

  it('onModuleInit no lanza si la base no responde: el proceso debe poder arrancar', async () => {
    jest.useFakeTimers();
    queryMock.mockRejectedValue(Object.assign(new Error('getaddrinfo EAI_AGAIN'), { code: 'EAI_AGAIN' }));
    const repo = new PostgresPublicacionRepository();

    await expect(repo.onModuleInit()).resolves.toBeUndefined();

    repo.onModuleDestroy();
    jest.useRealTimers();
  });

  it('traduce una caída de conexión a AlmacenamientoNoDisponibleError', async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'ECONNREFUSED' }));
    const repo = new PostgresPublicacionRepository();

    await expect(repo.buscarPorId('1')).rejects.toBeInstanceOf(AlmacenamientoNoDisponibleError);
  });

  it('no oculta los errores que no son de conexión', async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('sintaxis'), { code: '42601' }));
    const repo = new PostgresPublicacionRepository();

    const resultado = repo.buscarPorId('1');
    await expect(resultado).rejects.toThrow('sintaxis');
    await expect(resultado).rejects.not.toBeInstanceOf(AlmacenamientoNoDisponibleError);
  });

  it('verificarDisponibilidad ejecuta SELECT 1', async () => {
    queryMock.mockResolvedValueOnce({});
    const repo = new PostgresPublicacionRepository();

    await repo.verificarDisponibilidad();

    expect(queryMock).toHaveBeenCalledWith('SELECT 1', undefined);
  });

  it('onModuleInit crea la tabla si no existe', async () => {
    queryMock.mockResolvedValueOnce({});
    const repo = new PostgresPublicacionRepository();

    await repo.onModuleInit();

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS publicaciones'));
  });

  it('guardar inserta con ON CONFLICT DO NOTHING', async () => {
    queryMock.mockResolvedValueOnce({});
    const repo = new PostgresPublicacionRepository();
    const publicacion = new Publicacion({
      id: '1',
      tipo: 'perdido',
      descripcion: 'x',
      categoria: 'y',
      ubicacion: 'z',
      creadoEn: new Date().toISOString(),
    });

    await repo.guardar(publicacion);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO publicaciones'),
      expect.arrayContaining(['1', 'perdido', 'x', 'y', 'z', 'publicado']),
    );
  });

  it('buscarPorId devuelve null si no hay filas', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const repo = new PostgresPublicacionRepository();

    const resultado = await repo.buscarPorId('no-existe');

    expect(resultado).toBeNull();
  });

  it('buscarPorId reconstruye la entidad desde la fila', async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: '1',
          tipo: 'perdido',
          descripcion: 'x',
          categoria: 'y',
          ubicacion: 'z',
          estado: 'publicado',
          creado_en: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const repo = new PostgresPublicacionRepository();

    const resultado = await repo.buscarPorId('1');

    expect(resultado?.id).toBe('1');
    expect(resultado?.descripcion).toBe('x');
  });

  it('listarPorTipo mapea todas las filas', async () => {
    queryMock.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          id: '1',
          tipo: 'perdido',
          descripcion: 'a',
          categoria: 'c',
          ubicacion: 'u',
          estado: 'publicado',
          creado_en: '2026-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          tipo: 'perdido',
          descripcion: 'b',
          categoria: 'c',
          ubicacion: 'u',
          estado: 'publicado',
          creado_en: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const repo = new PostgresPublicacionRepository();

    const resultado = await repo.listarPorTipo('perdido');

    expect(resultado).toHaveLength(2);
    expect(resultado.map((p) => p.id)).toEqual(['1', '2']);
  });

  it('buscar pasa los filtros solo como parámetros, nunca concatenados al SQL', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const repo = new PostgresPublicacionRepository();

    await repo.buscar({ tipo: 'perdido', categoria: "x'; DROP TABLE publicaciones;--", limite: 5 });

    const [sql, parametros] = queryMock.mock.calls[0];
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).toContain('LIMIT $4');
    expect(parametros).toEqual(['perdido', "x'; DROP TABLE publicaciones;--", null, 5]);
  });
});
