import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';

describe('Publicaciones (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba();
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
    expect(respuesta.body.message).toMatch(/tipo debe ser uno de/);
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

  it('GET /publicaciones filtra por categoría y tipo', async () => {
    const categoria = 'busqueda-e2e';
    const datos = { descripcion: 'x', categoria, ubicacion: 'Bloque A1' };
    await request(app.getHttpServer()).post('/publicaciones').send({ ...datos, tipo: 'perdido' });
    const buscada = await request(app.getHttpServer()).post('/publicaciones').send({ ...datos, tipo: 'encontrado' });
    // Ruido de OTRA categoría y mismo tipo: un filtro de categoría roto lo dejaría pasar.
    await request(app.getHttpServer()).post('/publicaciones').send({ ...datos, categoria: 'otra-cosa', tipo: 'encontrado' });

    const respuesta = await request(app.getHttpServer()).get('/publicaciones').query({ categoria, tipo: 'encontrado' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.map((p: { id: string }) => p.id)).toEqual([buscada.body.id]);
    expect(respuesta.body.every((p: { categoria: string }) => p.categoria === categoria)).toBe(true);
  });

  it('GET /publicaciones con límite inválido responde 400', async () => {
    const respuesta = await request(app.getHttpServer()).get('/publicaciones').query({ limite: '999' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.message).toMatch(/limite debe ser/);
  });

  it('GET /metrics registra la latencia de la búsqueda y cuenta sus errores (S1)', async () => {
    const antes = (await request(app.getHttpServer()).get('/metrics')).body.busqueda;

    await request(app.getHttpServer()).get('/publicaciones').query({ categoria: 'electronica' });
    await request(app.getHttpServer()).get('/publicaciones').query({ limite: '999' }); // 400

    const despues = (await request(app.getHttpServer()).get('/metrics')).body.busqueda;
    expect(despues.n).toBe(antes.n + 1);
    expect(despues.errores).toBe(antes.errores + 1);
    expect(despues.objetivoP95Ms).toBe(400);
    expect(typeof despues.p95Ms).toBe('number');
  });
});
