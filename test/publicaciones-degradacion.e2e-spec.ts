import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PublicacionRepository } from '../src/domain/ports/publicacion-repository';
import { Publicacion } from '../src/domain/entities/publicacion';

/**
 * Condición adversa pertinente al reto de corte 1: el reto migró el
 * composition root a NestJS manteniendo el dominio detrás del puerto
 * `PublicacionRepository` (ADR-0002/0003). Esta prueba simula justo lo que
 * ese puerto existe para aislar - un fallo del adaptador de persistencia
 * (hoy en memoria, mañana PostgreSQL, aspecto A1 / escenario S4a) - y
 * verifica que el fallo se contiene: no tumba el proceso ni filtra detalles
 * internos, y el resto del servicio sigue disponible.
 */
class RepositorioQueFalla extends PublicacionRepository {
  async guardar(_publicacion: Publicacion): Promise<Publicacion> {
    throw new Error('conexión con el almacenamiento perdida');
  }

  async buscarPorId(_id: string): Promise<Publicacion | null> {
    throw new Error('conexión con el almacenamiento perdida');
  }
}

describe('Degradación controlada ante fallo del adaptador de persistencia (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PublicacionRepository)
      .useClass(RepositorioQueFalla)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /publicaciones responde 500 controlado (sin stack trace) cuando falla la persistencia', async () => {
    const respuesta = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Cargador de laptop',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toEqual(
      expect.objectContaining({ statusCode: 500, message: expect.any(String) }),
    );
    expect(JSON.stringify(respuesta.body)).not.toMatch(/conexión con el almacenamiento perdida/);
    expect(JSON.stringify(respuesta.body)).not.toMatch(/at\s+\S+\s+\(.*:\d+:\d+\)/);
  });

  it('GET /health sigue respondiendo 200 después del fallo de persistencia (el proceso no se cae)', async () => {
    await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Otro intento',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });

    const respuesta = await request(app.getHttpServer()).get('/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ status: 'ok', service: 'recobra-backend' });
  });
});
