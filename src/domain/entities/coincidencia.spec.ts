import { Coincidencia } from './coincidencia';

describe('Coincidencia', () => {
  const base = {
    id: '1',
    publicacionOrigenId: 'a',
    publicacionCoincidenteId: 'b',
    creadoEn: new Date().toISOString(),
  };

  it('se crea con estado "detectada"', () => {
    const coincidencia = new Coincidencia({ ...base, score: 0.6 });
    expect(coincidencia.estado).toBe('detectada');
  });

  it('rechaza un score fuera de [0, 1]', () => {
    expect(() => new Coincidencia({ ...base, score: 1.5 })).toThrow();
    expect(() => new Coincidencia({ ...base, score: -0.1 })).toThrow();
  });

  it('rechaza que una publicación coincida consigo misma', () => {
    expect(
      () =>
        new Coincidencia({
          ...base,
          publicacionOrigenId: 'a',
          publicacionCoincidenteId: 'a',
          score: 1,
        }),
    ).toThrow();
  });
});
