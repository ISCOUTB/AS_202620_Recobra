import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Orígenes de desarrollo (Flutter web o la vitrina servidas en otro puerto). Solo fuera de producción. */
const ORIGEN_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Orígenes del navegador que pueden leer las respuestas de la API (ADR-0029).
 * La vitrina y la app web las sirve la propia API, o sea, mismo origen: no
 * necesitan CORS. Antes estaba abierto a cualquier sitio. Ahora, en producción,
 * solo se permiten los que se listen en `CORS_ORIGENES` (separados por comas);
 * fuera de producción, además, localhost. Las apps móviles y `curl` no mandan
 * `Origin`, así que no les afecta.
 */
export function origenPermitido(origen: string | undefined, entorno: NodeJS.ProcessEnv = process.env): boolean {
  if (!origen) return true;
  const lista = (entorno.CORS_ORIGENES ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (lista.includes(origen)) return true;
  return entorno.NODE_ENV !== 'production' && ORIGEN_LOCAL.test(origen);
}

export function opcionesCors(): CorsOptions {
  return {
    origin: (origen, devolver) => devolver(null, origenPermitido(origen)),
    // Para que un cliente de otro origen autorizado pueda leer cuánto esperar tras un 429.
    exposedHeaders: ['Retry-After'],
    maxAge: 600,
  };
}
