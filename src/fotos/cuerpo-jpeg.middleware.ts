import { NextFunction, Request, Response, raw } from 'express';
import { FOTO_BYTES_MAXIMOS } from '../domain/entities/foto';

const leerJpeg = raw({ type: 'image/jpeg', limit: FOTO_BYTES_MAXIMOS });

/**
 * Lee el cuerpo `image/jpeg` de la foto como bytes (el analizador JSON de la
 * app no lo toca). Un cuerpo demasiado grande o dañado responde con el mismo
 * formato de error del resto de la API, no con el HTML de Express.
 */
export function cuerpoJpeg(peticion: Request, respuesta: Response, siguiente: NextFunction): void {
  leerJpeg(peticion, respuesta, (error?: unknown) => {
    if (!error) {
      siguiente();
      return;
    }
    const estado = (error as { status?: number }).status === 413 ? 413 : 400;
    const message =
      estado === 413 ? `la foto pesa demasiado: el máximo es ${FOTO_BYTES_MAXIMOS / 1024} KB` : 'no se pudo leer la foto';
    respuesta.status(estado).json({ statusCode: estado, message });
  });
}
