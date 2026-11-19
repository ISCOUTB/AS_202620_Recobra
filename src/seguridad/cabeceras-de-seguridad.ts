import { NextFunction, Request, Response } from 'express';

/**
 * Cabeceras de seguridad de todas las respuestas (ADR-0029, arc42 §8.6). Cada
 * una cierra una amenaza del modelo (docs/seguridad/modelo-de-amenazas.md):
 *
 * - `Content-Security-Policy` (T03): la app web (`/app/`) solo ejecuta sus
 *   propios archivos — ningún script en línea ni de otro sitio —, así que un
 *   script inyectado no corre y con él no se puede leer el token de sesión
 *   guardado en el navegador. Desde ADR-0031 la app Flutter es la única
 *   interfaz; la vitrina HTML, que tenía su propia política por hash, se retiró.
 * - `frame-ancestors 'none'` y `X-Frame-Options` (T22): nadie puede meter Recobra
 *   en un marco de otra página para engañar con clics (clickjacking).
 * - `Strict-Transport-Security` (T04): una vez visto por HTTPS, el navegador no
 *   vuelve a usar HTTP.
 * - `nosniff`, `Referrer-Policy`, `Permissions-Policy`: el navegador no adivina
 *   tipos, no envía de dónde vienes y no puede usar sensores que Recobra no usa.
 */

const COMUNES: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** Seis meses, sin `includeSubDomains` ni `preload`: el dominio pertenece al laboratorio, no solo a Recobra. */
const HSTS = 'max-age=15552000';

export interface PoliticasCsp {
  /** Para `/app/` (Flutter web): sus propios archivos; CanvasKit necesita WebAssembly. */
  app: string;
  /** Para la API (y la raíz, que solo redirige a `/app/`): las respuestas son datos, no documentos; no pueden cargar nada. */
  api: string;
}

export function calcularPoliticas(): PoliticasCsp {
  return {
    app: [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      // Flutter fija estilos en línea al arrancar; los scripts, no.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    api: "default-src 'none'; frame-ancestors 'none'",
  };
}

/** Qué política corresponde a una ruta. */
export function politicaPara(ruta: string, politicas: PoliticasCsp): string {
  if (ruta === '/app' || ruta.startsWith('/app/')) return politicas.app;
  return politicas.api;
}

/** Crea el middleware; las políticas son fijas, se calculan una vez al arrancar. */
export function crearCabecerasDeSeguridad() {
  const politicas = calcularPoliticas();

  return (peticion: Request, respuesta: Response, siguiente: NextFunction): void => {
    for (const [nombre, valor] of Object.entries(COMUNES)) respuesta.setHeader(nombre, valor);
    // `peticion.secure` es verdadero tras un proxy de confianza que dijo "https" (X-Forwarded-Proto).
    if (peticion.secure) respuesta.setHeader('Strict-Transport-Security', HSTS);
    const ruta = (peticion.originalUrl ?? peticion.url ?? '/').split('?')[0];
    respuesta.setHeader('Content-Security-Policy', politicaPara(ruta, politicas));
    siguiente();
  };
}
