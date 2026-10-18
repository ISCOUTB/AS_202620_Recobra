import { Publicacion } from '../entities/publicacion';
import { UMBRAL_COINCIDENCIA, calcularParecido, palabrasClave, parecidoFecha, parecidoTexto } from './parecido';

const pub = (tipo: 'perdido' | 'encontrado', descripcion: string, ubicacion: string, creadoEn: string) =>
  new Publicacion({ id: `${tipo}-${descripcion}`, tipo, descripcion, categoria: 'electronica', ubicacion, creadoEn });

describe('Parecido entre publicaciones (ADR-0018)', () => {
  it('las palabras clave ignoran mayúsculas, tildes y palabras vacías', () => {
    expect([...palabrasClave('Audífonos SONY negros con estuche de tela')]).toEqual([
      'audifonos',
      'sony',
      'negros',
      'estuche',
      'tela',
    ]);
  });

  it('mismo lugar, misma descripción y mismo día es un parecido de 1', () => {
    const a = pub('perdido', 'Audífonos Sony negros', 'Bloque A1', '2026-10-17T10:00:00.000Z');
    const b = pub('encontrado', 'audifonos sony negros', 'Bloque A1', '2026-10-17T15:00:00.000Z');
    expect(calcularParecido(a, b)).toBeCloseTo(1);
  });

  it('las palabras en común suben el parecido aunque el lugar no coincida', () => {
    const a = pub('perdido', 'Audífonos Sony negros', 'Bloque A1', '2026-10-17T10:00:00.000Z');
    const parecidos = pub('encontrado', 'Audífonos Sony', 'Biblioteca', '2026-10-17T12:00:00.000Z');
    const distintos = pub('encontrado', 'Cargador de laptop', 'Biblioteca', '2026-10-17T12:00:00.000Z');
    expect(parecidoTexto(a, parecidos)).toBeCloseTo(2 / 3);
    expect(calcularParecido(a, parecidos)).toBeGreaterThan(calcularParecido(a, distintos));
  });

  it('la cercanía de fechas gradúa: 2 días, una semana, un mes, más', () => {
    const base = pub('perdido', 'Termo', 'Biblioteca', '2026-10-01T00:00:00.000Z');
    const en = (fecha: string) => parecidoFecha(base, pub('encontrado', 'Termo', 'Biblioteca', fecha));
    expect(en('2026-10-02T00:00:00.000Z')).toBe(1);
    expect(en('2026-10-06T00:00:00.000Z')).toBeCloseTo(0.6);
    expect(en('2026-10-20T00:00:00.000Z')).toBeCloseTo(0.3);
    expect(en('2026-12-01T00:00:00.000Z')).toBe(0);
  });

  it('otro lugar, otras palabras y fechas lejanas quedan bajo el umbral', () => {
    const a = pub('perdido', 'Calculadora Casio', 'Bloque A1', '2026-08-01T00:00:00.000Z');
    const b = pub('encontrado', 'Cable USB', 'Biblioteca', '2026-10-17T00:00:00.000Z');
    expect(calcularParecido(a, b)).toBeLessThan(UMBRAL_COINCIDENCIA);
  });
});
