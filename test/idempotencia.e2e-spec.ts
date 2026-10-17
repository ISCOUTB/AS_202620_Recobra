import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { autenticar } from './support/autenticar';

/**
 * Modo de fallo "responde dos veces" visto desde el cliente: no recibió la
 * respuesta a tiempo (o hizo doble clic) y repite la creación. Con la misma
 * Idempotency-Key no debe aparecer una segunda publicación ni una segunda
 * coincidencia. Ver docs/modos-de-fallo.md.
 */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Creación idempotente (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await crearAppDePrueba();
    token = await autenticar(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const servidor = () => app.getHttpServer();
  const publicar = (cuerpo: object, clave?: string) => {
    const peticion = request(servidor()).post('/publicaciones').set('Authorization', `Bearer ${token}`);
    if (clave) peticion.set('Idempotency-Key', clave);
    return peticion.send(cuerpo);
  };

  async function contarPorCategoria(categoria: string): Promise<number> {
    const respuesta = await request(servidor()).get('/publicaciones').query({ categoria, limite: 50 });
    return respuesta.body.length;
  }

  it('el reintento con la misma clave responde 200 con la misma publicación y no la duplica', async () => {
    const cuerpo = { tipo: 'perdido', descripcion: 'Termo rojo', categoria: 'idem-uno', ubicacion: 'Bloque 1' };

    const primera = await publicar(cuerpo, 'e2e-reintento-0001');
    const segunda = await publicar(cuerpo, 'e2e-reintento-0001');

    expect(primera.status).toBe(201);
    expect(segunda.status).toBe(200);
    expect(segunda.body.id).toBe(primera.body.id);
    expect(primera).toSatisfyApiSpec();
    expect(segunda).toSatisfyApiSpec();
    expect(await contarPorCategoria('idem-uno')).toBe(1);
  });

  it('dos envíos simultáneos con la misma clave dejan una sola publicación', async () => {
    const cuerpo = { tipo: 'perdido', descripcion: 'Llavero', categoria: 'idem-dos', ubicacion: 'Bloque 2' };

    const respuestas = await Promise.all([publicar(cuerpo, 'e2e-doble-clic-01'), publicar(cuerpo, 'e2e-doble-clic-01')]);

    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 201]);
    expect(await contarPorCategoria('idem-dos')).toBe(1);
  });

  it('el reintento no duplica la coincidencia que dispara la creación', async () => {
    await publicar({ tipo: 'perdido', descripcion: 'Casco', categoria: 'idem-tres', ubicacion: 'A2' });
    const encontrado = { tipo: 'encontrado', descripcion: 'Casco negro', categoria: 'idem-tres', ubicacion: 'A2' };

    const creada = await publicar(encontrado, 'e2e-coincidencia-01');
    await publicar(encontrado, 'e2e-coincidencia-01');
    await new Promise((resolver) => setTimeout(resolver, 50)); // el emparejamiento es asíncrono

    const coincidencias = await request(servidor()).get('/coincidencias').query({ publicacionId: creada.body.id });
    expect(coincidencias.body).toHaveLength(1);
  });

  it('la misma clave con datos distintos responde 422 con el esquema de error', async () => {
    const cuerpo = { tipo: 'perdido', descripcion: 'Gafas', categoria: 'idem-cuatro', ubicacion: 'Biblioteca' };
    await publicar(cuerpo, 'e2e-conflicto-0001');

    const conflicto = await publicar({ ...cuerpo, descripcion: 'Otras gafas' }, 'e2e-conflicto-0001');

    expect(conflicto.status).toBe(422);
    expect(conflicto.body).toEqual({ statusCode: 422, message: expect.any(String) });
    expect(conflicto).toSatisfyApiSpec();
    expect(await contarPorCategoria('idem-cuatro')).toBe(1);
  });

  it('una clave con formato inválido responde 400', async () => {
    const respuesta = await publicar(
      { tipo: 'perdido', descripcion: 'Reloj', categoria: 'idem-cinco', ubicacion: 'Bloque 4' },
      'corta',
    );

    expect(respuesta.status).toBe(400);
  });

  it('sin la cabecera, el comportamiento anterior no cambia (201 cada vez)', async () => {
    const cuerpo = { tipo: 'perdido', descripcion: 'Bufanda', categoria: 'idem-seis', ubicacion: 'Bloque 6' };

    expect((await publicar(cuerpo)).status).toBe(201);
    expect((await publicar(cuerpo)).status).toBe(201);
    expect(await contarPorCategoria('idem-seis')).toBe(2);
  });
});
