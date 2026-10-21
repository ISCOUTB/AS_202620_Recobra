import { NextFunction, Request, Response } from 'express';

/**
 * Política de caché HTTP de la API (ADR-0025, arc42 §8.3). Lo único que se deja
 * guardar es lo que no cambia con el uso: el catálogo de lugares (cambia con un
 * despliegue) y la miniatura de una foto (vida corta). Todo lo demás cambia con
 * el ciclo de vida de las publicaciones, así que:
 *
 * - sin sesión: `no-cache` — el navegador puede guardar la respuesta, pero debe
 *   preguntar al servidor antes de usarla (con el ETag que Express calcula del
 *   contenido): si algo cambió, recibe lo nuevo; si no, un 304 sin cuerpo;
 * - con sesión (`Authorization`): `private, no-store` — es información de una
 *   persona (sus avisos, sus reclamaciones, su contacto) y no debe quedar en la
 *   caché de ningún intermediario.
 *
 * Es el valor por omisión: un controlador que necesite otra cosa la fija en su
 * respuesta (`@Header` o `res.set`), que prevalece. Los archivos estáticos
 * (vitrina y app web) quedan fuera: los sirve Express con su propia política.
 */
export function politicaDeCache(peticion: Request, respuesta: Response, siguiente: NextFunction): void {
  // `originalUrl` y no `path`: montado con comodín, Express recorta `path` y siempre vería "/".
  if (!esEstatico(peticion.originalUrl.split('?')[0])) {
    respuesta.setHeader('Cache-Control', peticion.headers.authorization ? 'private, no-store' : 'no-cache');
  }
  siguiente();
}

function esEstatico(ruta: string): boolean {
  return ruta === '/' || ruta.startsWith('/app') || /\.[a-z0-9]+$/i.test(ruta);
}
