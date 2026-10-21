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

const DANADO = 'el JPEG está dañado';

/** Segmentos que llevan metadatos: APP1..APP15 (EXIF, XMP, IPTC…) y comentarios. APP0 (JFIF) se queda. */
function esMetadato(marcador: number): boolean {
  return (marcador >= 0xe1 && marcador <= 0xef) || marcador === 0xfe;
}

/** Un JPEG empieza con SOI + un marcador y termina con EOI. */
function exigirEnvoltura(datos: Buffer): void {
  if (!Buffer.isBuffer(datos) || datos.length < 4 || datos[0] !== 0xff || datos[1] !== 0xd8 || datos[2] !== 0xff) {
    throw new DatoInvalidoError('la imagen debe ser un JPEG');
  }
  if (datos[datos.length - 2] !== 0xff || datos[datos.length - 1] !== EOI) {
    throw new DatoInvalidoError('el JPEG está incompleto');
  }
}

/** Lee el marcador que empieza en `desde`; el relleno permitido son varios 0xFF seguidos antes de él. */
function leerMarcador(datos: Buffer, desde: number): { marcador: number; posicion: number } {
  if (datos[desde] !== 0xff) throw new DatoInvalidoError(DANADO);
  let posicion = desde;
  while (datos[posicion + 1] === 0xff && posicion + 2 < datos.length) posicion++;
  const marcador = datos[posicion + 1];
  if (marcador === undefined) throw new DatoInvalidoError(DANADO);
  return { marcador, posicion };
}

/** Largo declarado del segmento que empieza en `posicion` (cuenta sus dos bytes de largo); lo valida contra el archivo. */
function largoDelSegmento(datos: Buffer, posicion: number): number {
  if (posicion + 4 > datos.length) throw new DatoInvalidoError(DANADO);
  const largo = datos.readUInt16BE(posicion + 2);
  if (largo < 2 || posicion + 2 + largo > datos.length) throw new DatoInvalidoError(DANADO);
  return largo;
}

/** Medidas que declara un segmento SOF (alto y ancho, en ese orden). */
function medidasDelSof(datos: Buffer, posicion: number, largo: number): { ancho: number; alto: number } {
  if (largo < 8) throw new DatoInvalidoError(DANADO);
  return { alto: datos.readUInt16BE(posicion + 5), ancho: datos.readUInt16BE(posicion + 7) };
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
  exigirEnvoltura(datos);

  const partes: Buffer[] = [datos.subarray(0, 2)];
  let medidas = { ancho: 0, alto: 0 };
  let posicion = 2;
  let conDatos = false;

  while (posicion < datos.length && !conDatos) {
    const leido = leerMarcador(datos, posicion);
    if (leido.marcador === EOI) break;

    posicion = leido.posicion;
    const largo = largoDelSegmento(datos, posicion);
    if (MARCADORES_SOF.has(leido.marcador)) medidas = medidasDelSof(datos, posicion, largo);

    if (leido.marcador === SOS) {
      partes.push(datos.subarray(posicion)); // los datos de la imagen, tal cual
      conDatos = true;
    } else {
      if (!esMetadato(leido.marcador)) partes.push(datos.subarray(posicion, posicion + 2 + largo));
      posicion += 2 + largo;
    }
  }

  if (!conDatos) throw new DatoInvalidoError('el JPEG no tiene imagen');
  if (medidas.ancho < 1 || medidas.alto < 1) throw new DatoInvalidoError('el JPEG no declara sus medidas');
  return { ancho: medidas.ancho, alto: medidas.alto, limpio: Buffer.concat(partes) };
}
