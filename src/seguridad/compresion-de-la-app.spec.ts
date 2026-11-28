import * as express from 'express';
import * as request from 'supertest';
import { crearCompresionDeLaApp, esArchivoDeLaApp } from './compresion-de-la-app';

/**
 * ADR-0032: la app (/app/…) se sirve comprimida; la API nunca, porque mezcla
 * el token de sesión con datos del usuario (riesgo tipo BREACH).
 */
describe('Compresión solo para los archivos de la app', () => {
  const grande = 'x'.repeat(50_000);
  const servidor = express();
  servidor.use(crearCompresionDeLaApp());
  // Montado como el servidor de estáticos real: bajo /app la ruta interna pierde el prefijo.
  const app = express.Router();
  app.get('/main.dart.js', (_peticion, respuesta) => {
    respuesta.type('application/javascript').send(grande);
  });
  servidor.use('/app', app);
  servidor.get('/publicaciones', (_peticion, respuesta) => {
    respuesta.json({ datos: grande });
  });

  it('comprime con gzip un archivo de la app cuando el navegador lo acepta', async () => {
    const respuesta = await request(servidor).get('/app/main.dart.js').set('Accept-Encoding', 'gzip');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-encoding']).toBe('gzip');
  });

  it('no comprime las respuestas de la API, aunque el navegador lo acepte', async () => {
    const respuesta = await request(servidor).get('/publicaciones').set('Accept-Encoding', 'gzip');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-encoding']).toBeUndefined();
  });

  it('reconoce solo las rutas bajo /app', () => {
    const ruta = (originalUrl: string) => ({ originalUrl }) as express.Request;
    expect(esArchivoDeLaApp(ruta('/app'))).toBe(true);
    expect(esArchivoDeLaApp(ruta('/app/canvaskit/canvaskit.wasm'))).toBe(true);
    expect(esArchivoDeLaApp(ruta('/application'))).toBe(false);
    expect(esArchivoDeLaApp(ruta('/sesiones'))).toBe(false);
    expect(esArchivoDeLaApp(ruta('/app/main.dart.js?v=2'))).toBe(true);
  });
});
