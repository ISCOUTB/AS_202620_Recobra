import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';

/**
 * Una sola interfaz (ADR-0031): la raíz lleva a la app y una ruta que no
 * existe es un 404 de verdad, con el esquema `Error` del contrato — no la
 * página de la app con un 200, que ocultaba los errores de ruta.
 */
describe('Raíz y rutas inexistentes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / redirige a la app (/app/) con 302', async () => {
    const respuesta = await request(app.getHttpServer()).get('/');

    expect(respuesta.status).toBe(302);
    expect(respuesta.headers.location).toBe('/app/');
  });

  it.each(['/no-existe', '/index.html', '/vitrina', '/publicaciones/x/no-existe'])(
    'GET %s responde 404 con { statusCode, message }',
    async (ruta) => {
      const respuesta = await request(app.getHttpServer()).get(ruta);

      expect(respuesta.status).toBe(404);
      expect(respuesta.headers['content-type']).toMatch(/application\/json/);
      expect(respuesta.body).toEqual(expect.objectContaining({ statusCode: 404, message: expect.any(String) }));
    },
  );
});
