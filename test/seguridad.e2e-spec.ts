import { gzipSync } from 'node:zlib';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/**
 * Seguridad HTTP contra la aplicación completa (ADR-0029, modelo de amenazas
 * T03, T04, T07, T21, T22): cabeceras, rechazo de cuerpos comprimidos, CORS con
 * lista blanca y que ninguna ruta procese multipart (la vía de las
 * vulnerabilidades de `multer`, dependencia de NestJS que Recobra no usa).
 */
describe('Seguridad HTTP (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  const srv = () => app.getHttpServer();

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana');
  });

  afterAll(async () => {
    await app.close();
  });

  it('toda respuesta de la API lleva las cabeceras de seguridad y no delata el servidor', async () => {
    const r = await request(srv()).get('/publicaciones?limite=1');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    expect(r.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(r.headers['permissions-policy']).toContain('geolocation=()');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it('también los errores y las respuestas de otros módulos (sin sesión, no encontrado)', async () => {
    for (const r of [await request(srv()).get('/cuentas/yo'), await request(srv()).get('/publicaciones/no-existe')]) {
      expect(r.headers['x-content-type-options']).toBe('nosniff');
      expect(r.headers['content-security-policy']).toContain("default-src 'none'");
    }
  });

  it('HSTS solo si el proxy de confianza dice que la conexión llegó por HTTPS', async () => {
    const http = await request(srv()).get('/health');
    expect(http.headers['strict-transport-security']).toBeUndefined();
    // Con `trust proxy` en 0 (fuera de producción) X-Forwarded-Proto no se cree: el cliente no puede forzarlo.
    const falsificada = await request(srv()).get('/health').set('X-Forwarded-Proto', 'https');
    expect(falsificada.headers['strict-transport-security']).toBeUndefined();
  });

  it('/metrics dice qué cree el servidor del cliente (para comprobar el proxy), sin mostrar su dirección', async () => {
    const r = await request(srv()).get('/metrics').set('X-Forwarded-For', '203.0.113.9');
    expect(r.body.seguridad.cliente).toEqual({ origen: expect.stringMatching(/^[0-9a-f]{8}$/), conexionSegura: false, saltosDeProxy: 0, reenvio: expect.any(Array), socketDelProxy: expect.stringMatching(/^[0-9a-f]{8}$/) });
    expect(JSON.stringify(r.body)).not.toContain('203.0.113.9');
  });

  it('CF-Connecting-IP de quien no viene de Cloudflare no cambia el origen que se cuenta', async () => {
    const a = await request(srv()).get('/metrics').set('CF-Connecting-IP', '1.1.1.1');
    const b = await request(srv()).get('/metrics').set('CF-Connecting-IP', '8.8.8.8');
    expect(a.body.seguridad.cliente.origen).toBe(b.body.seguridad.cliente.origen);
  });

  describe('Cuerpo comprimido (GHSA-27r3-jxmh-p828 en body-parser)', () => {
    it('el ataque real —un marco gzip válido seguido de bytes de más— se rechaza con 415 y el servidor sigue vivo', async () => {
      const ataque = Buffer.concat([gzipSync(Buffer.from('{"correo":"a@utb.edu.co"}')), Buffer.from('basura-despues-del-marco')]);

      const r = await request(srv()).post('/sesiones').set('Content-Type', 'application/json').set('Content-Encoding', 'gzip').send(ataque);

      expect(r.status).toBe(415);
      expect(r.body).toEqual({ statusCode: 415, message: expect.stringContaining('comprimidos') });
      expect((await request(srv()).get('/health')).status).toBe(200); // sigue respondiendo
    });

    it('también en las rutas con sesión y en la que recibe la imagen', async () => {
      const gz = gzipSync(Buffer.from('{}'));
      const publicar = await request(srv())
        .post('/publicaciones')
        .set({ Authorization: `Bearer ${ana.token}`, 'Content-Type': 'application/json', 'Content-Encoding': 'deflate' })
        .send(gz);
      const foto = await request(srv())
        .put('/publicaciones/x/foto')
        .set({ Authorization: `Bearer ${ana.token}`, 'Content-Type': 'image/jpeg', 'Content-Encoding': 'br' })
        .send(gz);
      expect([publicar.status, foto.status]).toEqual([415, 415]);
    });

    it('el JSON sin comprimir sigue funcionando, con o sin la cabecera explícita identity', async () => {
      const r = await request(srv()).post('/sesiones').set('Content-Encoding', 'identity').send({ correo: 'nadie@utb.edu.co', contrasena: 'x' });
      expect(r.status).toBe(401); // llegó al caso de uso: credenciales incorrectas
    });
  });

  describe('CORS con lista blanca', () => {
    it('un sitio cualquiera no recibe permiso para leer la respuesta', async () => {
      const r = await request(srv()).get('/publicaciones').set('Origin', 'https://sitio-malicioso.example');
      expect(r.status).toBe(200); // la petición llega (es pública), pero el navegador no deja leerla
      expect(r.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('localhost sí, fuera de producción, para desarrollar el cliente web', async () => {
      const r = await request(srv()).get('/publicaciones').set('Origin', 'http://localhost:8080');
      expect(r.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    });

    it('la verificación previa (OPTIONS) de un sitio no autorizado tampoco recibe permiso', async () => {
      const r = await request(srv())
        .options('/publicaciones')
        .set({ Origin: 'https://sitio-malicioso.example', 'Access-Control-Request-Method': 'POST' });
      expect(r.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Ninguna ruta procesa multipart (las vulnerabilidades de multer no son alcanzables)', () => {
    it('crear una publicación y subir una foto con multipart se rechazan como cuerpo inválido, no se procesan', async () => {
      const publicar = await request(srv())
        .post('/publicaciones')
        .set('Authorization', `Bearer ${ana.token}`)
        .field('tipo', 'perdido')
        .field('descripcion', 'Termo')
        .attach('archivo', Buffer.from('contenido'), 'termo.txt');
      expect(publicar.status).toBe(400);

      const foto = await request(srv())
        .put('/publicaciones/x/foto')
        .set('Authorization', `Bearer ${ana.token}`)
        .attach('foto', Buffer.from('contenido'), 'foto.jpg');
      expect([400, 404]).toContain(foto.status); // nunca un 500 ni un archivo guardado
    });
  });
});
