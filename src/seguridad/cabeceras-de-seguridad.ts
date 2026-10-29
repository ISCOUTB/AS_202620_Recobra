import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextFunction, Request, Response } from 'express';

/**
 * Cabeceras de seguridad de todas las respuestas (ADR-0029, arc42 §8.6). Cada
 * una cierra una amenaza del modelo (docs/seguridad/modelo-de-amenazas.md):
 *
 * - `Content-Security-Policy` (T03): si alguien lograra inyectar un script en la
 *   vitrina, el navegador no lo ejecuta, y con él no puede leer el token de
 *   sesión guardado en el navegador. La vitrina solo permite SU script y SU
 *   estilo en línea, identificados por su hash.
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
  /** Para `/` (la vitrina): solo su script y su estilo, por hash. */
  vitrina: string;
  /** Para `/app/` (Flutter web): sus propios archivos; CanvasKit necesita WebAssembly. */
  app: string;
  /** Para la API: las respuestas son datos, no documentos; no pueden cargar nada. */
  api: string;
}

/** Hash `sha256` en base64 del contenido en línea, como lo calcula el navegador (con saltos de línea normalizados). */
export function hashCsp(contenido: string): string {
  return `'sha256-${createHash('sha256').update(contenido.replaceAll('\r\n', '\n')).digest('base64')}'`;
}

/** Contenido de los bloques en línea `<tag>…</tag>` sin atributos (los que la política debe permitir por hash). */
function bloquesEnLinea(html: string, etiqueta: 'script' | 'style'): string[] {
  const patron = new RegExp(String.raw`<${etiqueta}>([\s\S]*?)</${etiqueta}>`, 'g');
  return [...html.matchAll(patron)].map((m) => m[1]);
}

export function calcularPoliticas(htmlVitrina: string): PoliticasCsp {
  const scripts = bloquesEnLinea(htmlVitrina, 'script').map(hashCsp);
  const estilos = bloquesEnLinea(htmlVitrina, 'style').map(hashCsp);
  return {
    vitrina: [
      "default-src 'none'",
      `script-src 'self' ${scripts.join(' ')}`.trim(),
      `style-src 'self' ${estilos.join(' ')}`.trim(),
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "form-action 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
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
  if (ruta === '/' || ruta === '/index.html') return politicas.vitrina;
  if (ruta === '/app' || ruta.startsWith('/app/')) return politicas.app;
  return politicas.api;
}

/**
 * Crea el middleware. La política de la vitrina se calcula una vez al arrancar a
 * partir del propio `public/index.html`, así que editar la vitrina no deja la
 * política desfasada (y la prueba `seguridad-vitrina.spec.ts` avisa si se agrega
 * algo que la política bloquearía).
 */
export function crearCabecerasDeSeguridad(rutaVitrina = join(__dirname, '..', '..', 'public', 'index.html')) {
  let html = '';
  try {
    html = readFileSync(rutaVitrina, 'utf-8');
  } catch {
    // Sin vitrina (por ejemplo, una prueba sin archivos): la política de la vitrina queda sin scripts, que es lo más estricto.
  }
  const politicas = calcularPoliticas(html);

  return (peticion: Request, respuesta: Response, siguiente: NextFunction): void => {
    for (const [nombre, valor] of Object.entries(COMUNES)) respuesta.setHeader(nombre, valor);
    // `peticion.secure` es verdadero tras un proxy de confianza que dijo "https" (X-Forwarded-Proto).
    if (peticion.secure) respuesta.setHeader('Strict-Transport-Security', HSTS);
    const ruta = (peticion.originalUrl ?? peticion.url ?? '/').split('?')[0];
    respuesta.setHeader('Content-Security-Policy', politicaPara(ruta, politicas));
    siguiente();
  };
}
