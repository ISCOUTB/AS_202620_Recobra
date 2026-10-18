import { DatoInvalidoError } from '../errors/errores-de-dominio';
import { revisarJpeg } from '../fotos/jpeg';

/** La foto completa pesa como máximo 1 MB y mide como máximo 2048 px por lado. */
export const FOTO_BYTES_MAXIMOS = 1024 * 1024;
export const FOTO_LADO_MAXIMO = 2048;
/**
 * La miniatura es lo único que ve el público de un objeto encontrado (ADR-0023):
 * por eso el servidor exige que sea realmente pequeña (colores y forma, sin
 * detalles que sirvan para reclamarlo sin ser su dueño).
 */
export const MINIATURA_BYTES_MAXIMOS = 4 * 1024;
export const MINIATURA_LADO_MAXIMO = 32;

export interface DatosFoto {
  publicacionId: string;
  completa: Buffer;
  miniatura: Buffer;
  creadoEn: string;
}

/** Foto de una publicación (contexto Fotos): la completa y su miniatura, ya sin metadatos. */
export class Foto {
  readonly publicacionId: string;
  readonly completa: Buffer;
  readonly miniatura: Buffer;
  readonly creadoEn: string;

  constructor(datos: DatosFoto) {
    this.publicacionId = datos.publicacionId;
    this.completa = datos.completa;
    this.miniatura = datos.miniatura;
    this.creadoEn = datos.creadoEn;
  }

  /** Valida las dos imágenes que envía el cliente y guarda las versiones sin metadatos. */
  static crear(publicacionId: string, completa: unknown, miniatura: unknown, creadoEn: string): Foto {
    if (!Buffer.isBuffer(completa) || completa.length === 0) {
      throw new DatoInvalidoError('envía la foto como un JPEG (Content-Type: image/jpeg)');
    }
    if (!Buffer.isBuffer(miniatura) || miniatura.length === 0) {
      throw new DatoInvalidoError('falta la miniatura (cabecera X-Miniatura con un JPEG pequeño en base64)');
    }
    if (completa.length > FOTO_BYTES_MAXIMOS) {
      throw new DatoInvalidoError(`la foto pesa demasiado: el máximo es ${FOTO_BYTES_MAXIMOS / 1024} KB`);
    }
    if (miniatura.length > MINIATURA_BYTES_MAXIMOS) {
      throw new DatoInvalidoError(`la miniatura pesa demasiado: el máximo es ${MINIATURA_BYTES_MAXIMOS / 1024} KB`);
    }

    const grande = revisarJpeg(completa);
    if (Math.max(grande.ancho, grande.alto) > FOTO_LADO_MAXIMO) {
      throw new DatoInvalidoError(`la foto es muy grande: el máximo es ${FOTO_LADO_MAXIMO} px por lado`);
    }
    const chica = revisarJpeg(miniatura);
    if (Math.max(chica.ancho, chica.alto) > MINIATURA_LADO_MAXIMO) {
      throw new DatoInvalidoError(`la miniatura debe medir como máximo ${MINIATURA_LADO_MAXIMO} px por lado`);
    }
    return new Foto({ publicacionId, completa: grande.limpio, miniatura: chica.limpio, creadoEn });
  }
}
