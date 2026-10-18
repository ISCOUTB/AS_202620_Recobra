import { jpegDePrueba } from '../../../test/support/jpeg-de-prueba';
import { DatoInvalidoError } from '../errors/errores-de-dominio';
import { revisarJpeg } from './jpeg';

describe('Revisión de JPEG (ADR-0023)', () => {
  it('lee las medidas de un JPEG válido', () => {
    const r = revisarJpeg(jpegDePrueba({ ancho: 640, alto: 480 }));
    expect({ ancho: r.ancho, alto: r.alto }).toEqual({ ancho: 640, alto: 480 });
  });

  it('quita el EXIF y los comentarios (la ubicación GPS no se guarda) y deja lo demás', () => {
    const original = jpegDePrueba({ ancho: 10, alto: 10, exif: 'GPS 10.39N 75.48W', comentario: 'hecha con mi celular' });
    const r = revisarJpeg(original);

    expect(original.includes('GPS 10.39N')).toBe(true);
    expect(r.limpio.includes('GPS')).toBe(false);
    expect(r.limpio.includes('celular')).toBe(false);
    expect(r.limpio.includes('JFIF')).toBe(true);
    expect(r.limpio.length).toBeLessThan(original.length);
    // Sigue siendo un JPEG con las mismas medidas.
    expect(revisarJpeg(r.limpio)).toMatchObject({ ancho: 10, alto: 10 });
  });

  it.each([
    ['texto', Buffer.from('no soy una imagen')],
    ['PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
    ['vacío', Buffer.alloc(0)],
  ])('rechaza lo que no es un JPEG (%s)', (_nombre, datos) => {
    expect(() => revisarJpeg(datos)).toThrow(DatoInvalidoError);
  });

  it('rechaza un JPEG cortado o sin medidas', () => {
    const completo = jpegDePrueba({ ancho: 10, alto: 10 });
    expect(() => revisarJpeg(completo.subarray(0, completo.length - 2))).toThrow('incompleto');
    expect(() => revisarJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toThrow(DatoInvalidoError);
  });
});
