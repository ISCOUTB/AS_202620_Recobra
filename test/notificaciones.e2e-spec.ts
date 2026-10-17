import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/**
 * Escenario S3 (aviso de coincidencia en 60 s o menos) y avisos de
 * reclamaciones (ADR-0015), de extremo a extremo y contra el contrato.
 */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Notificaciones (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let bea: UsuarioDePrueba;
  const srv = () => app.getHttpServer();
  const conSesion = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana');
    bea = await crearUsuario(app, 'Bea');
  });

  afterAll(async () => {
    await app.close();
  });

  async function publicar(u: UsuarioDePrueba, tipo: string, categoria: string) {
    const r = await request(srv())
      .post('/publicaciones')
      .set(conSesion(u))
      .send({ tipo, descripcion: `Objeto ${tipo}`, categoria, ubicacion: 'Biblioteca' });
    return r.body.id as string;
  }

  /** Espera a que la cuenta tenga al menos `minimo` avisos; devuelve la bandeja y cuánto tardó. */
  async function esperarAvisos(u: UsuarioDePrueba, minimo: number) {
    const inicio = Date.now();
    for (let i = 0; i < 100; i++) {
      const r = await request(srv()).get('/notificaciones').set(conSesion(u));
      if (r.body.notificaciones.length >= minimo) return { respuesta: r, ms: Date.now() - inicio };
      await new Promise((resolver) => setTimeout(resolver, 10));
    }
    throw new Error('el aviso no llegó');
  }

  it('S3: quien perdió el objeto recibe el aviso de coincidencia en mucho menos de 60 s', async () => {
    await publicar(ana, 'perdido', 'notif-uno');
    const encontradoId = await publicar(bea, 'encontrado', 'notif-uno');

    const { respuesta, ms } = await esperarAvisos(ana, 1);

    expect(ms).toBeLessThan(60_000);
    expect(respuesta.status).toBe(200);
    expect(respuesta).toSatisfyApiSpec();
    expect(respuesta.body.noLeidas).toBe(1);
    expect(respuesta.body.notificaciones[0]).toMatchObject({ tipo: 'coincidencia', publicacionId: encontradoId });
  });

  it('reclamar avisa a quien publicó; aprobar avisa a quien reclamó', async () => {
    const pubId = await publicar(bea, 'encontrado', 'notif-dos');
    const previasBea = (await request(srv()).get('/notificaciones').set(conSesion(bea))).body.notificaciones.length;
    const previasAna = (await request(srv()).get('/notificaciones').set(conSesion(ana))).body.notificaciones.length;

    const reclamo = await request(srv())
      .post(`/publicaciones/${pubId}/reclamaciones`)
      .set(conSesion(ana))
      .send({ prueba: 'Tiene una calcomanía de la UTB por dentro' });
    const deBea = await esperarAvisos(bea, previasBea + 1);
    expect(deBea.respuesta.body.notificaciones[0]).toMatchObject({ tipo: 'reclamacion_nueva', publicacionId: pubId });

    await request(srv()).post(`/reclamaciones/${reclamo.body.id}/aprobar`).set(conSesion(bea));
    const deAna = await esperarAvisos(ana, previasAna + 1);
    expect(deAna.respuesta.body.notificaciones[0]).toMatchObject({ tipo: 'reclamacion_aprobada', publicacionId: pubId });
  });

  it('marcar como leída: una propia (204), ajena o inexistente (404), y todas', async () => {
    const { respuesta } = await esperarAvisos(ana, 1);
    const id = respuesta.body.notificaciones[0].id;

    const ajena = await request(srv()).post(`/notificaciones/${id}/leida`).set(conSesion(bea));
    expect(ajena.status).toBe(404);
    expect(ajena).toSatisfyApiSpec();

    expect((await request(srv()).post(`/notificaciones/${id}/leida`).set(conSesion(ana))).status).toBe(204);
    expect((await request(srv()).post('/notificaciones/leidas').set(conSesion(ana))).status).toBe(204);
    expect((await request(srv()).get('/notificaciones').set(conSesion(ana))).body.noLeidas).toBe(0);
  });

  it('sin sesión responde 401', async () => {
    const r = await request(srv()).get('/notificaciones');
    expect(r.status).toBe(401);
    expect(r).toSatisfyApiSpec();
  });
});
