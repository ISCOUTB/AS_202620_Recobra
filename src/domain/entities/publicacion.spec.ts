import { Publicacion, PublicacionInvalidaError } from './publicacion';

describe('Publicacion', () => {
  it('crea una publicación válida con estado inicial publicado', () => {
    const publicacion = new Publicacion({
      id: '1',
      tipo: 'encontrado',
      descripcion: '  Llavero con dije de balón  ',
      categoria: 'llaves',
      ubicacion: '  Bloque 3  ',
      creadoEn: '2026-09-05T00:00:00.000Z',
    });

    expect(publicacion.estado).toBe('publicado');
    expect(publicacion.descripcion).toBe('Llavero con dije de balón');
    expect(publicacion.ubicacion).toBe('Bloque 3');
  });

  it('rechaza un tipo que no sea perdido o encontrado', () => {
    expect(
      () =>
        new Publicacion({
          id: '1',
          // @ts-expect-error: tipo inválido a propósito
          tipo: 'robado',
          descripcion: 'x',
          categoria: 'y',
          ubicacion: 'z',
          creadoEn: '2026-09-05T00:00:00.000Z',
        }),
    ).toThrow(PublicacionInvalidaError);
  });

  it('rechaza campos obligatorios vacíos', () => {
    expect(
      () =>
        new Publicacion({
          id: '1',
          tipo: 'perdido',
          descripcion: '',
          categoria: 'y',
          ubicacion: 'z',
          creadoEn: '2026-09-05T00:00:00.000Z',
        }),
    ).toThrow(PublicacionInvalidaError);
  });
});
