import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Prueba de extremo a extremo de Emparejamiento (antes solo diseño en
 * docs/context-map.md, ahora con código real). El evento
 * `publicacion.creada` se dispara sin esperar (ADR-0004), así que esta
 * prueba consulta con reintentos cortos en vez de esperar una respuesta
 * síncrona — es consistencia eventual real, no un mock de ella.
 */
describe('Emparejamiento (e2e)', () => {
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

  async function esperarCoincidencias(publicacionId: string, intentos = 10): Promise<any[]> {
    for (let i = 0; i < intentos; i += 1) {
      const respuesta = await request(app.getHttpServer())
        .get('/coincidencias')
        .query({ publicacionId });
      if (respuesta.body.length > 0) return respuesta.body;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return [];
  }

  it('detecta una coincidencia real tras crear dos publicaciones complementarias', async () => {
    const perdido = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica-e2e',
      ubicacion: 'Bloque 3',
    });

    const encontrado = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'encontrado',
      descripcion: 'Cargador negro',
      categoria: 'electronica-e2e',
      ubicacion: 'Bloque 3',
    });

    const coincidencias = await esperarCoincidencias(encontrado.body.id);

    expect(coincidencias.length).toBeGreaterThan(0);
    expect(coincidencias[0].publicacionOrigenId).toBe(encontrado.body.id);
    expect(coincidencias[0].publicacionCoincidenteId).toBe(perdido.body.id);
    expect(coincidencias[0].score).toBe(1);
  });

  it('GET /coincidencias sin publicacionId responde con lista vacía, no error', async () => {
    const respuesta = await request(app.getHttpServer()).get('/coincidencias');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });
});
