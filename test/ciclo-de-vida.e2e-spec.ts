import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/** Cerrar una publicación propia (ADR-0017), contra el contrato 4.0.0. */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Ciclo de vida: cerrar (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let leo: UsuarioDePrueba;
  const srv = () => app.getHttpServer();

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana');
    leo = await crearUsuario(app, 'Leo');
  });

  afterAll(async () => {
    await app.close();
  });

  async function publicar(u: UsuarioDePrueba, tipo: string, categoria: string) {
    const r = await request(srv())
      .post('/publicaciones')
      .set('Authorization', `Bearer ${u.token}`)
      .send({ tipo, descripcion: 'Paraguas gris', categoria, ubicacion: 'Biblioteca' });
    return r.body.id as string;
  }

  it('quien perdió algo lo marca como recuperado y desaparece de la búsqueda', async () => {
    const id = await publicar(ana, 'perdido', 'cierre-uno');

    const r = await request(srv())
      .post(`/publicaciones/${id}/cerrar`)
      .set('Authorization', `Bearer ${ana.token}`)
      .send({ motivo: 'recuperado' });

    expect(r.status).toBe(200);
    expect(r).toSatisfyApiSpec();
    expect(r.body).toMatchObject({ estado: 'cerrado', motivoCierre: 'recuperado' });
    const busqueda = await request(srv()).get('/publicaciones?categoria=cierre-uno');
    expect(busqueda.body).toHaveLength(0);
    // Sigue visible para su autor en "Mis cosas".
    const mias = await request(srv()).get('/publicaciones/mias').set('Authorization', `Bearer ${ana.token}`);
    expect(mias.body.map((p: { id: string }) => p.id)).toContain(id);
  });

  it('otra cuenta recibe 403, un motivo inválido 400 y cerrar dos veces 409', async () => {
    const id = await publicar(ana, 'encontrado', 'cierre-dos');
    const cerrarComo = (u: UsuarioDePrueba, motivo: string) =>
      request(srv()).post(`/publicaciones/${id}/cerrar`).set('Authorization', `Bearer ${u.token}`).send({ motivo });

    const ajena = await cerrarComo(leo, 'retirado');
    expect(ajena.status).toBe(403);
    expect(ajena).toSatisfyApiSpec();
    expect((await cerrarComo(ana, 'recuperado')).status).toBe(400); // un encontrado no se "recupera"
    expect((await cerrarComo(ana, 'retirado')).status).toBe(200);
    const otraVez = await cerrarComo(ana, 'retirado');
    expect(otraVez.status).toBe(409);
    expect(otraVez).toSatisfyApiSpec();
  });
});
