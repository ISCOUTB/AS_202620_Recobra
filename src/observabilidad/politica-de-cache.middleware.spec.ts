import { Request, Response } from 'express';
import { politicaDeCache } from './politica-de-cache.middleware';

describe('Política de caché por omisión (ADR-0025)', () => {
  function aplicar(originalUrl: string, authorization?: string): string | undefined {
    let valor: string | undefined;
    const peticion = { originalUrl, headers: authorization ? { authorization } : {} } as unknown as Request;
    const respuesta = { setHeader: (_nombre: string, v: string) => (valor = v) } as unknown as Response;
    const siguiente = jest.fn();
    politicaDeCache(peticion, respuesta, siguiente);
    expect(siguiente).toHaveBeenCalledTimes(1);
    return valor;
  }

  it('sin sesión se revalida siempre; con sesión no se guarda', () => {
    expect(aplicar('/publicaciones?tipo=perdido')).toBe('no-cache');
    expect(aplicar('/publicaciones/mias', 'Bearer abc')).toBe('private, no-store');
  });

  it('no toca la vitrina ni la app web: los archivos estáticos tienen su propia política', () => {
    for (const ruta of ['/', '/index.html', '/app/', '/app/main.dart.js', '/favicon.ico']) {
      expect(aplicar(ruta)).toBeUndefined();
    }
  });
});
