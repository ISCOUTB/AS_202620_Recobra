import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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

  it('POST /publicaciones con tipo inválido (400) cumple el esquema ErrorDominio del contrato', async () => {
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

  it('GET /publicaciones/:id inexistente (404) cumple el esquema ErrorInterno del contrato', async () => {
    const respuesta = await request(app.getHttpServer()).get('/publicaciones/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta).toSatisfyApiSpec();
  });
});
