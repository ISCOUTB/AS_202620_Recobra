import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';
import { jpegDePrueba } from './support/jpeg-de-prueba';
import { REGLAS_DE_LIMITE } from '../src/seguridad/limite-de-uso';

/**
 * Límites de uso con los valores reales (ADR-0028, amenazas T05 y T06), contra la
 * aplicación completa y el contrato 5.3.0.
 */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Límites de uso (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let bea: UsuarioDePrueba;
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    Logger.overrideLogger(false);
    app = await crearAppDePrueba(undefined, { limitesReales: true });
    ana = await crearUsuario(app, 'Ana');
    bea = await crearUsuario(app, 'Bea');
  });

  afterAll(async () => {
    await app.close();
  });

  const publicar = (u: UsuarioDePrueba, i: number) =>
    request(srv()).post('/publicaciones').set(con(u)).send({ tipo: 'perdido', descripcion: `Objeto ${i}`, categoria: 'limites-e2e', ubicacion: 'Biblioteca' });

  it('publicar: pasado el máximo por hora responde 429 con Retry-After y el mensaje de siempre, y otra cuenta no se ve afectada', async () => {
    const { maximo } = REGLAS_DE_LIMITE.publicar;
    for (let i = 0; i < maximo; i++) expect((await publicar(ana, i)).status).toBe(201);

    const excedida = await publicar(ana, maximo);

    expect(excedida.status).toBe(429);
    expect(excedida).toSatisfyApiSpec();
    expect(excedida.body.message).toContain('demasiados publicaciones');
    expect(Number(excedida.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(excedida.headers['retry-after'])).toBeLessThanOrEqual(3600);
    expect((await publicar(bea, 0)).status).toBe(201); // otra cuenta, sin problema
  });

  it('"Lo tengo yo" cuenta como publicar (crea una publicación): comparte el límite con la misma cuenta', async () => {
    const perdido = (await publicar(bea, 100)).body.id; // de Bea
    const r = await request(srv())
      .post(`/publicaciones/${perdido}/lo-tengo`)
      .set(con(ana)) // Ana ya agotó su cupo de publicar
      .send({ descripcion: 'Lo tengo', ubicacion: 'Biblioteca' });
    expect(r.status).toBe(429);
  });

  it('el exceso se cuenta aunque la petición sea inválida: el límite frena el volumen, no solo los éxitos', async () => {
    const carlos = await crearUsuario(app, 'Carlos');
    const { maximo } = REGLAS_DE_LIMITE.reclamar;
    for (let i = 0; i < maximo; i++) {
      const r = await request(srv()).post('/publicaciones/no-existe/reclamaciones').set(con(carlos)).send({ prueba: 'x'.repeat(30) });
      expect(r.status).toBe(404);
    }
    const r = await request(srv()).post('/publicaciones/no-existe/reclamaciones').set(con(carlos)).send({ prueba: 'x'.repeat(30) });
    expect(r.status).toBe(429);
  });

  it('reportar y cambiar la foto tienen su propio límite', async () => {
    const dana = await crearUsuario(app, 'Dana');
    const objeto = (await publicar(bea, 200)).body.id;
    const { maximo } = REGLAS_DE_LIMITE.reportar;
    for (let i = 0; i < maximo; i++) await request(srv()).post(`/publicaciones/${objeto}/reportar`).set(con(dana)).send({ motivo: 'spam' });
    const reporte = await request(srv()).post(`/publicaciones/${objeto}/reportar`).set(con(dana)).send({ motivo: 'spam' });
    expect(reporte.status).toBe(429);
    expect(reporte).toSatisfyApiSpec();

    const miFoto = (await publicar(dana, 300)).body.id;
    const imagen = jpegDePrueba({ ancho: 20, alto: 20 });
    const subir = () =>
      request(srv()).put(`/publicaciones/${miFoto}/foto`).set(con(dana)).set('Content-Type', 'image/jpeg').set('X-Miniatura', imagen.toString('base64')).send(imagen);
    for (let i = 0; i < REGLAS_DE_LIMITE.foto.maximo; i++) expect((await subir()).status).toBe(200);
    const foto = await subir();
    expect(foto.status).toBe(429);
    expect(foto).toSatisfyApiSpec();
  });

  it('crear cuentas e iniciar sesión se limitan por origen, con un tope holgado', async () => {
    // Un origen distinto por prueba: trust proxy está en 0 fuera de producción, así que la dirección es la de la conexión.
    const { maximo } = REGLAS_DE_LIMITE.cuentaNueva;
    let ultimo = 0;
    for (let i = 0; i < maximo + 1; i++) {
      const r = await request(srv()).post('/cuentas').send({ correo: 'sin-formato', nombre: 'x', contrasena: 'x', aceptoPrivacidad: true });
      ultimo = r.status;
    }
    expect(ultimo).toBe(429);
    const r = await request(srv()).post('/cuentas').send({});
    expect(r).toSatisfyApiSpec();
  });

  it('las métricas dicen cuántas veces se pasó cada límite', async () => {
    const m = await request(srv()).get('/metrics');
    expect(m.body.seguridad.limitesExcedidos.publicar).toBeGreaterThanOrEqual(2);
    expect(m.body.seguridad.limitesExcedidos.reclamar).toBeGreaterThanOrEqual(1);
  });
});
