import { DatoInvalidoError } from '../errors/errores-de-dominio';

/** Lo que se sabe de un JPEG ya revisado: sus medidas y la copia sin metadatos. */
export interface JpegRevisado {
  ancho: number;
  alto: number;
  /** El mismo JPEG sin EXIF (ubicación GPS, cámara, fecha), sin XMP y sin comentarios. */
  limpio: Buffer;
}

const MARCADORES_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const SOS = 0xda;
const EOI = 0xd9;

/** Segmentos que llevan metadatos: APP1..APP15 (EXIF, XMP, IPTC…) y comentarios. APP0 (JFIF) se queda. */
function esMetadato(marcador: number): boolean {
  return (marcador >= 0xe1 && marcador <= 0xef) || marcador === 0xfe;
}

/**
 * Revisa un JPEG sin decodificarlo: comprueba que lo es, lee sus medidas y lo
 * devuelve sin los segmentos de metadatos. La privacidad lo pide (una foto de
 * celular suele llevar la ubicación exacta, y Recobra promete no guardarla), y
 * los clientes ya las reducen, pero el servidor no confía en eso.
 * Recorre los segmentos hasta el primer SOS; lo que sigue (los datos de la
 * imagen) se copia tal cual.
 */
export function revisarJpeg(datos: Buffer): JpegRevisado {
  if (!Buffer.isBuffer(datos) || datos.length < 4 || datos[0] !== 0xff || datos[1] !== 0xd8 || datos[2] !== 0xff) {
    throw new DatoInvalidoError('la imagen debe ser un JPEG');
  }
  if (datos[datos.length - 2] !== 0xff || datos[datos.length - 1] !== EOI) {
    throw new DatoInvalidoError('el JPEG está incompleto');
  }

  const partes: Buffer[] = [datos.subarray(0, 2)];
  let ancho = 0;
  let alto = 0;
  let posicion = 2;
  let conDatos = false;

  while (posicion < datos.length) {
    if (datos[posicion] !== 0xff) throw new DatoInvalidoError('el JPEG está dañado');
    let marcador = datos[posicion + 1];
    // Relleno permitido: varios 0xFF seguidos antes del marcador.
    while (marcador === 0xff && posicion + 2 < datos.length) {
      posicion++;
      marcador = datos[posicion + 1];
    }
    if (marcador === undefined) throw new DatoInvalidoError('el JPEG está dañado');
    if (marcador === EOI) break;

    if (posicion + 4 > datos.length) throw new DatoInvalidoError('el JPEG está dañado');
    const largo = datos.readUInt16BE(posicion + 2);
    const fin = posicion + 2 + largo;
    if (largo < 2 || fin > datos.length) throw new DatoInvalidoError('el JPEG está dañado');

    if (MARCADORES_SOF.has(marcador)) {
      if (largo < 8) throw new DatoInvalidoError('el JPEG está dañado');
      alto = datos.readUInt16BE(posicion + 5);
      ancho = datos.readUInt16BE(posicion + 7);
    }

    if (marcador === SOS) {
      partes.push(datos.subarray(posicion));
      conDatos = true;
      break;
    }
    if (!esMetadato(marcador)) partes.push(datos.subarray(posicion, fin));
    posicion = fin;
  }

  if (!conDatos) throw new DatoInvalidoError('el JPEG no tiene imagen');
  if (ancho < 1 || alto < 1) throw new DatoInvalidoError('el JPEG no declara sus medidas');
  return { ancho, alto, limpio: Buffer.concat(partes) };
}
