import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';

/**
 * Prueba de contrato (S7): valida que las respuestas reales de la API
 * cumplan el esquema declarado en docs/contracts/openapi.yaml. No prueba
 * reglas de negocio (eso ya lo hacen publicaciones.e2e-spec.ts) - prueba que
 * el contrato y la implementación no se hayan desincronizado. Ver
 * docs/adr/0004-integracion-sincrona-vs-asincrona.md.
 */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Contrato de la API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health cumple el esquema Salud del contrato', async () => {
    const respuesta = await request(app.getHttpServer()).get('/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('POST /publicaciones (201) cumple el esquema Publicacion del contrato', async () => {
    const respuesta = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('POST /publicaciones con tipo inválido (400) cumple el esquema Error del contrato', async () => {
    const respuesta = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'robado',
      descripcion: 'x',
      categoria: 'y',
      ubicacion: 'z',
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('GET /publicaciones/:id (200) cumple el esquema Publicacion del contrato', async () => {
    const creada = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'encontrado',
      descripcion: 'Llavero',
      categoria: 'llaves',
      ubicacion: 'Biblioteca',
    });

    const respuesta = await request(app.getHttpServer()).get(`/publicaciones/${creada.body.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('GET /publicaciones/:id inexistente (404) cumple el esquema Error del contrato', async () => {
    const respuesta = await request(app.getHttpServer()).get('/publicaciones/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('GET /coincidencias sin resultados (200) cumple el contrato con arreglo vacío', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/coincidencias')
      .query({ publicacionId: 'lo-que-sea' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('GET /coincidencias con una coincidencia real (200) cumple el esquema Coincidencia del contrato', async () => {
    await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Audífonos',
      categoria: 'contrato-coincidencia',
      ubicacion: 'Cafetería',
    });
    const encontrado = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'encontrado',
      descripcion: 'Audífonos blancos',
      categoria: 'contrato-coincidencia',
      ubicacion: 'Cafetería',
    });

    // El emparejamiento es asíncrono (ADR-0004): se reintenta hasta que aparezca.
    let respuesta = await request(app.getHttpServer())
      .get('/coincidencias')
      .query({ publicacionId: encontrado.body.id });
    for (let i = 0; i < 10 && respuesta.body.length === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      respuesta = await request(app.getHttpServer())
        .get('/coincidencias')
        .query({ publicacionId: encontrado.body.id });
    }

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.length).toBeGreaterThan(0);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('GET /publicaciones (200) cumple el esquema de lista de Publicacion del contrato', async () => {
    await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Para la búsqueda',
      categoria: 'contrato-busqueda',
      ubicacion: 'Biblioteca',
    });

    const respuesta = await request(app.getHttpServer())
      .get('/publicaciones')
      .query({ categoria: 'contrato-busqueda', limite: 5 });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.length).toBeGreaterThan(0);
    expect(respuesta).toSatisfyApiSpec();
  });

  it('GET /publicaciones con límite inválido (400) cumple el esquema Error del contrato', async () => {
    const respuesta = await request(app.getHttpServer()).get('/publicaciones').query({ limite: 0 });

    expect(respuesta.status).toBe(400);
    expect(respuesta).toSatisfyApiSpec();
  });
});
