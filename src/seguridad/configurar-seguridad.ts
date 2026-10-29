import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { crearCabecerasDeSeguridad } from './cabeceras-de-seguridad';
import { opcionesCors } from './cors';

/**
 * Las dos formas de un cuerpo de petición que el servidor acepta son JSON sin
 * comprimir y la imagen JPEG sin comprimir. Un cuerpo comprimido (`Content-Encoding:
 * gzip`…) no lo manda ningún cliente de Recobra, y es la vía de un ataque
 * conocido contra `body-parser` (GHSA-27r3-jxmh-p828: unos bytes de más tras un
 * cuerpo comprimido tumban el proceso). Se rechaza antes de que lo lea (T07).
 */
export function rechazarCuerpoComprimido(peticion: Request, respuesta: Response, siguiente: NextFunction): void {
  const codificacion = String(peticion.headers['content-encoding'] ?? '').trim().toLowerCase();
  if (codificacion && codificacion !== 'identity') {
    respuesta.status(415).json({ statusCode: 415, message: 'No se aceptan cuerpos comprimidos (Content-Encoding)' });
    return;
  }
  siguiente();
}

/** Saltos de proxy de confianza: detrás de Traefik (Dokploy) es 1; sin proxy, 0. Con `PROXY_CONFIABLES` se cambia. */
export function saltosDeProxy(entorno: NodeJS.ProcessEnv = process.env): number {
  const configurado = Number(entorno.PROXY_CONFIABLES);
  if (entorno.PROXY_CONFIABLES !== undefined && Number.isInteger(configurado) && configurado >= 0) return configurado;
  return entorno.NODE_ENV === 'production' ? 1 : 0;
}

/**
 * Endurecimiento HTTP común a `main.ts` y a las pruebas e2e (así lo que se prueba
 * es lo que corre): origen del cliente (proxy de confianza), CORS con lista
 * blanca, rechazo de cuerpos comprimidos y cabeceras de seguridad (ADR-0029).
 * Debe llamarse antes de `init()`/`listen()` para que corra antes de los
 * analizadores de cuerpo.
 */
export function configurarSeguridad(app: NestExpressApplication): void {
  app.set('trust proxy', saltosDeProxy());
  app.disable('x-powered-by');
  app.use(crearCabecerasDeSeguridad());
  app.enableCors(opcionesCors());
  app.use(rechazarCuerpoComprimido);
}
