import * as compression from 'compression';
import { Request, RequestHandler, Response } from 'express';

/**
 * Comprime con gzip solo los archivos de la app Flutter (/app/…): el código
 * (main.dart.js, 3,3 MB) y el motor gráfico (canvaskit.wasm, 7,2 MB) viajaban
 * sin comprimir y eran casi toda la primera carga (ADR-0032).
 *
 * Las respuestas de la API no se comprimen a propósito: algunas llevan
 * secretos (el token de sesión) junto a datos que escribe el usuario, la
 * combinación que aprovechan los ataques de tipo BREACH sobre HTTPS. Pesan
 * pocos kilobytes, así que no hay nada que ganar.
 */
export function esArchivoDeLaApp(peticion: Request): boolean {
  // originalUrl y no path: al decidir, el servidor de estáticos montado en /app
  // ya le quitó ese prefijo a la ruta.
  const ruta = (peticion.originalUrl ?? peticion.url ?? '').split('?')[0];
  return ruta === '/app' || ruta.startsWith('/app/');
}

export function crearCompresionDeLaApp(): RequestHandler {
  return compression({
    filter: (peticion: Request, respuesta: Response) =>
      esArchivoDeLaApp(peticion) && compression.filter(peticion, respuesta),
  });
}
