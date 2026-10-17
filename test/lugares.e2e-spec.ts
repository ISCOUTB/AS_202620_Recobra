import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { autenticar } from './support/autenticar';

/** Lugares en dos niveles: catálogo con pisos y detalle opcional (contrato 3.2.0). */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Lugares (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await crearAppDePrueba();
    token = await autenticar(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /lugares devuelve el catálogo con los pisos de cada edificio', async () => {
    const r = await request(app.getHttpServer()).get('/lugares');
    expect(r.status).toBe(200);
    expect(r).toSatisfyApiSpec();
    expect(r.body).toContainEqual({ nombre: 'Bloque A1', niveles: expect.arrayContaining(['Piso 1', 'Piso 2']) });
  });

  it('publicar con piso y salón lo devuelve igual al consultar', async () => {
    const creada = await request(app.getHttpServer())
      .post('/publicaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'perdido', descripcion: 'Calculadora', categoria: 'otros', ubicacion: 'Bloque A1', detalleUbicacion: 'Piso 2 · Salón 204' });
    expect(creada.status).toBe(201);
    expect(creada).toSatisfyApiSpec();

    const leida = await request(app.getHttpServer()).get(`/publicaciones/${creada.body.id}`);
    expect(leida.body).toMatchObject({ ubicacion: 'Bloque A1', detalleUbicacion: 'Piso 2 · Salón 204' });
    expect(leida).toSatisfyApiSpec();
  });

  it('sin detalle sigue funcionando como antes (detalleUbicacion null)', async () => {
    const r = await request(app.getHttpServer())
      .post('/publicaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'encontrado', descripcion: 'Llaves', categoria: 'llaves', ubicacion: 'Biblioteca' });
    expect(r.status).toBe(201);
    expect(r.body.detalleUbicacion).toBeNull();
  });

  it('un detalle demasiado largo responde 400 con el error único', async () => {
    const r = await request(app.getHttpServer())
      .post('/publicaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'perdido', descripcion: 'Termo', categoria: 'otros', ubicacion: 'Bloque A1', detalleUbicacion: 'x'.repeat(121) });
    expect(r.status).toBe(400);
    expect(r).toSatisfyApiSpec();
  });
});
