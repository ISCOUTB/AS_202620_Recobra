import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Publicaciones (e2e)', () => {
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

  it('GET /health responde 200 con el estado del servicio', async () => {
    const respuesta = await request(app.getHttpServer()).get('/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ status: 'ok', service: 'recobra-backend' });
  });

  it('POST /publicaciones crea una publicación y responde 201', async () => {
    const respuesta = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.id).toBeDefined();
    expect(respuesta.body.estado).toBe('publicado');
  });

  it('POST /publicaciones con tipo inválido responde 400', async () => {
    const respuesta = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'robado',
      descripcion: 'x',
      categoria: 'y',
      ubicacion: 'z',
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toMatch(/tipo debe ser uno de/);
  });

  it('GET /publicaciones/:id devuelve la publicación creada', async () => {
    const creada = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'encontrado',
      descripcion: 'Llavero',
      categoria: 'llaves',
      ubicacion: 'Biblioteca',
    });

    const respuesta = await request(app.getHttpServer()).get(`/publicaciones/${creada.body.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.descripcion).toBe('Llavero');
  });

  it('GET /publicaciones/:id con id inexistente responde 404', async () => {
    const respuesta = await request(app.getHttpServer()).get('/publicaciones/no-existe');

    expect(respuesta.status).toBe(404);
  });
});
