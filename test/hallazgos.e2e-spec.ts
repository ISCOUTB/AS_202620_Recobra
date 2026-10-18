import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/** Dónde está el objeto y "Lo tengo yo" (ADR-0019), contra el contrato 4.1.0. */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Custodia y "Lo tengo yo" (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let leo: UsuarioDePrueba;
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana');
    leo = await crearUsuario(app, 'Leo');
  });

  afterAll(async () => {
    await app.close();
  });

  it('publicar un encontrado dejado en la portería y luego actualizar dónde está', async () => {
    const creada = await request(srv())
      .post('/publicaciones')
      .set(con(leo))
      .send({
        tipo: 'encontrado',
        descripcion: 'Paraguas gris',
        categoria: 'custodia-e2e',
        ubicacion: 'Biblioteca',
        custodia: 'punto_de_entrega',
        puntoCustodia: 'Portería de la entrada principal',
      });
    expect(creada.status).toBe(201);
    expect(creada).toSatisfyApiSpec();
    expect(creada.body).toMatchObject({ custodia: 'punto_de_entrega', puntoCustodia: 'Portería de la entrada principal' });

    const ajena = await request(srv())
      .post(`/publicaciones/${creada.body.id}/custodia`)
      .set(con(ana))
      .send({ custodia: 'quien_lo_encontro' });
    expect(ajena.status).toBe(403);

    const cambio = await request(srv())
      .post(`/publicaciones/${creada.body.id}/custodia`)
      .set(con(leo))
      .send({ custodia: 'quien_lo_encontro' });
    expect(cambio.status).toBe(200);
    expect(cambio).toSatisfyApiSpec();
    expect(cambio.body).toMatchObject({ custodia: 'quien_lo_encontro', puntoCustodia: null });
  });

  it('"Lo tengo yo" crea el encontrado enlazado y le avisa al dueño del perdido', async () => {
    const perdido = await request(srv())
      .post('/publicaciones')
      .set(con(ana))
      .send({ tipo: 'perdido', descripcion: 'Calculadora Casio', categoria: 'hallazgo-e2e', ubicacion: 'Bloque A1' });

    const r = await request(srv())
      .post(`/publicaciones/${perdido.body.id}/lo-tengo`)
      .set(con(leo))
      .send({ descripcion: 'Calculadora científica', ubicacion: 'Cafetería central' });
    expect(r.status).toBe(201);
    expect(r).toSatisfyApiSpec();
    expect(r.body).toMatchObject({ tipo: 'encontrado', categoria: 'hallazgo-e2e', custodia: 'quien_lo_encontro' });

    const coincidencias = await request(srv()).get('/coincidencias').query({ publicacionId: perdido.body.id });
    expect(coincidencias.body.map((c: { publicacionOrigenId: string }) => c.publicacionOrigenId)).toContain(r.body.id);

    let avisos: { tipo: string; publicacionId: string }[] = [];
    for (let i = 0; i < 50 && avisos.length === 0; i++) {
      avisos = (await request(srv()).get('/notificaciones').set(con(ana))).body.notificaciones;
      if (avisos.length === 0) await new Promise((resolver) => setTimeout(resolver, 10));
    }
    expect(avisos[0]).toMatchObject({ tipo: 'coincidencia', publicacionId: r.body.id });

    const otraVez = await request(srv())
      .post(`/publicaciones/${perdido.body.id}/lo-tengo`)
      .set(con(leo))
      .send({ descripcion: 'Calculadora', ubicacion: 'Bloque A1' });
    expect(otraVez.status).toBe(409);
    expect(otraVez).toSatisfyApiSpec();
  });
});
