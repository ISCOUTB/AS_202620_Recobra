import { jpegDePrueba } from '../../../test/support/jpeg-de-prueba';
import { DatoInvalidoError } from '../errors/errores-de-dominio';
import { FOTO_BYTES_MAXIMOS, Foto, MINIATURA_LADO_MAXIMO } from './foto';

describe('Foto (ADR-0023)', () => {
  const ahora = '2026-10-18T12:00:00.000Z';
  const grande = jpegDePrueba({ ancho: 1024, alto: 768, exif: 'GPS' });
  const chica = jpegDePrueba({ ancho: 24, alto: 18 });

  it('guarda las dos imágenes sin metadatos', () => {
    const foto = Foto.crear('p1', grande, chica, ahora);
    expect(foto.completa.includes('GPS')).toBe(false);
    expect(foto.publicacionId).toBe('p1');
  });

  it('exige que la miniatura sea realmente pequeña: es lo único que ve el público', () => {
    const casiGrande = jpegDePrueba({ ancho: MINIATURA_LADO_MAXIMO + 1, alto: 10 });
    expect(() => Foto.crear('p1', grande, casiGrande, ahora)).toThrow(/miniatura debe medir/);
    expect(() => Foto.crear('p1', grande, grande, ahora)).toThrow(DatoInvalidoError);
    expect(Foto.crear('p1', grande, jpegDePrueba({ ancho: MINIATURA_LADO_MAXIMO, alto: 20 }), ahora)).toBeInstanceOf(Foto);
  });

  it('rechaza la foto demasiado pesada o demasiado ancha, y la que llega sin cuerpo', () => {
    const pesada = jpegDePrueba({ ancho: 100, alto: 100, relleno: FOTO_BYTES_MAXIMOS });
    expect(() => Foto.crear('p1', pesada, chica, ahora)).toThrow(/pesa demasiado/);
    expect(() => Foto.crear('p1', jpegDePrueba({ ancho: 4000, alto: 100 }), chica, ahora)).toThrow(/muy grande/);
    expect(() => Foto.crear('p1', {}, chica, ahora)).toThrow(/image\/jpeg/);
    expect(() => Foto.crear('p1', grande, Buffer.alloc(0), ahora)).toThrow(/miniatura/);
  });
});
