import { Reporte } from './reporte';
import { ConflictoError, DatoInvalidoError } from '../errors/errores-de-dominio';

describe('Reporte de una publicación (ADR-0022)', () => {
  const base = { id: 'r1', publicacionId: 'p1', reportanteId: 'ana', creadoEn: '2026-10-18T10:00:00.000Z' };

  it('acepta solo los motivos conocidos', () => {
    expect(new Reporte({ ...base, motivo: 'spam' }).estado).toBe('abierto');
    expect(() => new Reporte({ ...base, motivo: 'aburrido' })).toThrow(DatoInvalidoError);
  });

  it('con motivo "otro" el detalle es obligatorio, y siempre tiene un máximo', () => {
    expect(() => new Reporte({ ...base, motivo: 'otro' })).toThrow(DatoInvalidoError);
    expect(() => new Reporte({ ...base, motivo: 'otro', detalle: 'mal' })).toThrow(DatoInvalidoError);
    expect(new Reporte({ ...base, motivo: 'otro', detalle: 'Es una broma' }).detalle).toBe('Es una broma');
    expect(() => new Reporte({ ...base, motivo: 'spam', detalle: 'x'.repeat(301) })).toThrow(DatoInvalidoError);
  });

  it('resolverlo deja constancia de quién, cuándo y con qué nota, y no se puede resolver dos veces', () => {
    const reporte = new Reporte({ ...base, motivo: 'falso' });
    const ocultado = reporte.resolver('ocultar', 'admin', '  Es falso  ', '2026-10-18T11:00:00.000Z');

    expect(ocultado).toMatchObject({ estado: 'ocultada', resueltoPor: 'admin', nota: 'Es falso' });
    expect(reporte.resolver('descartar', 'admin', undefined, '2026-10-18T11:00:00.000Z').estado).toBe('descartado');
    expect(() => ocultado.resolver('descartar', 'admin', undefined, '2026-10-18T12:00:00.000Z')).toThrow(ConflictoError);
  });
});
