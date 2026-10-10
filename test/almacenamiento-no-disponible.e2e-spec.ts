import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { FiltrosBusqueda, PublicacionRepository } from '../src/domain/ports/publicacion-repository';
import { Publicacion, TipoPublicacion } from '../src/domain/entities/publicacion';
import { AlmacenamientoNoDisponibleError } from '../src/domain/errors/almacenamiento-no-disponible.error';
import { crearAppDePrueba } from './support/crear-app-prueba';

/**
 * Modo de fallo de la base de datos caída (p. ej. Neon o el PostgreSQL de
 * Dokploy sin responder): el proceso sigue vivo, pero no puede atender
 * publicaciones. La salud del proceso (/health) y la disponibilidad de datos
 * (/health/ready) deben distinguirse, y el usuario debe recibir 503 (no un
 * 500 genérico) con un mensaje que no filtra detalles internos.
 */
class AlmacenamientoCaido extends PublicacionRepository {
  readonly almacenamiento = 'postgres';

  async verificarDisponibilidad(): Promise<void> {
    throw new AlmacenamientoNoDisponibleError();
  }

  async guardar(_publicacion: Publicacion): Promise<Publicacion> {
    throw new AlmacenamientoNoDisponibleError();
  }

  async buscarPorId(_id: string): Promise<Publicacion | null> {
    throw new AlmacenamientoNoDisponibleError();
  }

  async listarPorTipo(_tipo: TipoPublicacion): Promise<Publicacion[]> {
    throw new AlmacenamientoNoDisponibleError();
  }

  async buscar(_filtros: FiltrosBusqueda): Promise<Publicacion[]> {
    throw new AlmacenamientoNoDisponibleError();
  }
}

jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Almacenamiento no disponible (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba((builder) =>
      builder.overrideProvider(PublicacionRepository).useClass(AlmacenamientoCaido),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health sigue en 200: el proceso está vivo', async () => {
    const respuesta = await request(app.getHttpServer()).get('/health');
    expect(respuesta.status).toBe(200);
  });

  it('GET /health/ready responde 503 y dice qué almacenamiento falla', async () => {
    const respuesta = await request(app.getHttpServer()).get('/health/ready');
    expect(respuesta.status).toBe(503);
    expect(respuesta.body).toEqual({ status: 'degradado', service: 'recobra-backend', almacenamiento: 'postgres' });
  });

  it('GET /publicaciones responde 503 con el esquema de error único y sin detalles internos', async () => {
    const respuesta = await request(app.getHttpServer()).get('/publicaciones').query({ categoria: 'electronica' });
    expect(respuesta.status).toBe(503);
    expect(respuesta.body).toEqual({
      statusCode: 503,
      message: 'El almacenamiento no está disponible. Intenta de nuevo en unos segundos.',
    });
  });

  it('POST /publicaciones responde 503 (no 500)', async () => {
    const respuesta = await request(app.getHttpServer()).post('/publicaciones').send({
      tipo: 'perdido',
      descripcion: 'Cargador',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    });
    expect(respuesta.status).toBe(503);
  });

  it('la búsqueda fallida queda contada como error en /metrics y no entra en la latencia', async () => {
    const antes = (await request(app.getHttpServer()).get('/metrics')).body.busqueda;
    await request(app.getHttpServer()).get('/publicaciones');
    const despues = (await request(app.getHttpServer()).get('/metrics')).body.busqueda;
    expect(despues.errores).toBe(antes.errores + 1);
    expect(despues.n).toBe(antes.n);
  });

  it('las respuestas 503 cumplen el contrato OpenAPI en todas las rutas que leen o escriben datos', async () => {
    const servidor = app.getHttpServer();
    const respuestas = [
      await request(servidor).get('/health/ready'),
      await request(servidor).get('/publicaciones'),
      await request(servidor).get('/publicaciones/cualquier-id'),
      await request(servidor).post('/publicaciones').send({
        tipo: 'perdido',
        descripcion: 'Cargador',
        categoria: 'electronica',
        ubicacion: 'Bloque 3',
      }),
    ];

    for (const respuesta of respuestas) {
      expect(respuesta.status).toBe(503);
      expect(respuesta).toSatisfyApiSpec();
    }
  });
});
