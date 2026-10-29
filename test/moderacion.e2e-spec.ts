import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/** Moderación mínima (ADR-0022), contra el contrato 5.1.0. */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Moderación (e2e)', () => {
  let app: INestApplication;
  let admin: UsuarioDePrueba;
  let ana: UsuarioDePrueba;
  let leo: UsuarioDePrueba;
  let bea: UsuarioDePrueba;
  const adminAnterior = process.env.ADMIN_CORREOS;
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    app = await crearAppDePrueba();
    admin = await crearUsuario(app, 'Admin');
    ana = await crearUsuario(app, 'Ana');
    leo = await crearUsuario(app, 'Leo');
    bea = await crearUsuario(app, 'Bea');
    process.env.ADMIN_CORREOS = ` ${admin.correo.toUpperCase()} , otro@utb.edu.co`; // espacios y mayúsculas: se normaliza
  });

  afterAll(async () => {
    if (adminAnterior === undefined) delete process.env.ADMIN_CORREOS;
    else process.env.ADMIN_CORREOS = adminAnterior;
    await app.close();
  });

  async function publicar(u: UsuarioDePrueba, descripcion: string) {
    const r = await request(srv())
      .post('/publicaciones')
      .set(con(u))
      .send({ tipo: 'encontrado', descripcion, categoria: 'moderacion-e2e', ubicacion: 'Biblioteca' });
    return r.body.id as string;
  }

  const reportar = (u: UsuarioDePrueba, id: string, cuerpo: object) =>
    request(srv()).post(`/publicaciones/${id}/reportar`).set(con(u)).send(cuerpo);

  it('la cuenta sabe si es administradora (GET /cuentas/yo y al iniciar sesión)', async () => {
    const yoAdmin = await request(srv()).get('/cuentas/yo').set(con(admin));
    expect(yoAdmin.body.esAdministrador).toBe(true);
    expect(yoAdmin).toSatisfyApiSpec();
    expect((await request(srv()).get('/cuentas/yo').set(con(ana))).body.esAdministrador).toBe(false);
  });

  it('reportar: una vez por cuenta, no la propia, con motivo válido y exige sesión', async () => {
    const id = await publicar(leo, 'Texto con el celular de alguien');

    const propia = await reportar(leo, id, { motivo: 'spam' });
    expect(propia.status).toBe(409);
    expect(propia).toSatisfyApiSpec();

    expect((await reportar(ana, id, { motivo: 'cualquiera' })).status).toBe(400);
    expect((await reportar(ana, id, { motivo: 'otro' })).status).toBe(400); // "otro" pide detalle
    expect((await request(srv()).post(`/publicaciones/${id}/reportar`).send({ motivo: 'spam' })).status).toBe(401);

    const ok = await reportar(ana, id, { motivo: 'datos_personales', detalle: 'Trae un número de teléfono' });
    expect(ok.status).toBe(201);
    expect(ok).toSatisfyApiSpec();
    expect(ok.body).toMatchObject({ publicacionId: id, estado: 'abierto' });

    const otraVez = await reportar(ana, id, { motivo: 'spam' });
    expect(otraVez.status).toBe(409);
    expect((await reportar(ana, 'no-existe', { motivo: 'spam' })).status).toBe(404);
  });

  it('solo un administrador ve y resuelve los reportes (403 para los demás)', async () => {
    const id = await publicar(leo, 'Publicación con reporte');
    const reporte = await reportar(ana, id, { motivo: 'falso' });

    for (const u of [ana, leo]) {
      const lista = await request(srv()).get('/moderacion/reportes').set(con(u));
      expect(lista.status).toBe(403);
      expect(lista).toSatisfyApiSpec();
      expect(
        (await request(srv()).post(`/moderacion/reportes/${reporte.body.id}/resolver`).set(con(u)).send({ decision: 'descartar' })).status,
      ).toBe(403);
    }
    expect((await request(srv()).get('/moderacion/reportes')).status).toBe(401);

    const lista = await request(srv()).get('/moderacion/reportes').set(con(admin));
    expect(lista.status).toBe(200);
    expect(lista).toSatisfyApiSpec();
    const item = lista.body.find((x: { reporte: { id: string } }) => x.reporte.id === reporte.body.id);
    expect(item.publicacion).toMatchObject({ id, descripcion: 'Publicación con reporte' });
  });

  it('cada decisión de un administrador queda en el registro de auditoría con quién, qué y sobre qué (amenaza T13)', async () => {
    const lineas: Array<Record<string, unknown>> = [];
    const espia = jest.spyOn(Logger.prototype, 'log').mockImplementation((m: unknown) => {
      if (typeof m === 'object' && m) lineas.push(m as Record<string, unknown>);
    });
    try {
      const id = await publicar(leo, 'Publicación para auditar');
      const reporte = await reportar(ana, id, { motivo: 'falso' });
      await request(srv()).post(`/moderacion/reportes/${reporte.body.id}/resolver`).set(con(admin)).send({ decision: 'ocultar' });

      expect(lineas).toContainEqual({
        evento: 'auditoria.moderacion',
        reporteId: reporte.body.id,
        publicacionId: id,
        decision: 'ocultar',
        administradorId: admin.id,
      });
    } finally {
      espia.mockRestore();
    }
  });

  it('descartar deja la publicación como está', async () => {
    const id = await publicar(leo, 'Publicación correcta');
    const reporte = await reportar(ana, id, { motivo: 'spam' });

    const r = await request(srv())
      .post(`/moderacion/reportes/${reporte.body.id}/resolver`)
      .set(con(admin))
      .send({ decision: 'descartar', nota: 'No hay nada raro' });
    expect(r.status).toBe(200);
    expect(r).toSatisfyApiSpec();
    expect(r.body).toMatchObject({ estado: 'descartado', nota: 'No hay nada raro' });
    expect((await request(srv()).get(`/publicaciones/${id}`)).body.estado).toBe('publicado');

    const otraVez = await request(srv())
      .post(`/moderacion/reportes/${reporte.body.id}/resolver`)
      .set(con(admin))
      .send({ decision: 'descartar' });
    expect(otraVez.status).toBe(409);
    expect(otraVez).toSatisfyApiSpec();
  });

  it('ocultar cierra la publicación como moderada, resuelve los demás reportes y avisa a su autor', async () => {
    const id = await publicar(leo, 'Publicación abusiva');
    const deAna = await reportar(ana, id, { motivo: 'inapropiado' });
    const deBea = await reportar(bea, id, { motivo: 'spam' });

    const r = await request(srv())
      .post(`/moderacion/reportes/${deAna.body.id}/resolver`)
      .set(con(admin))
      .send({ decision: 'ocultar' });
    expect(r.status).toBe(200);
    expect(r.body.estado).toBe('ocultada');

    expect((await request(srv()).get(`/publicaciones/${id}`)).body).toMatchObject({ estado: 'cerrado', motivoCierre: 'moderado' });
    expect((await request(srv()).get('/publicaciones?categoria=moderacion-e2e')).body.map((p: { id: string }) => p.id)).not.toContain(id);
    const abiertos = (await request(srv()).get('/moderacion/reportes').set(con(admin))).body;
    expect(abiertos.map((x: { reporte: { id: string } }) => x.reporte.id)).not.toContain(deBea.body.id);

    let avisos: { tipo: string; publicacionId: string }[] = [];
    for (let i = 0; i < 50 && !avisos.some((a) => a.tipo === 'publicacion_ocultada'); i++) {
      avisos = (await request(srv()).get('/notificaciones').set(con(leo))).body.notificaciones;
      await new Promise((resolver) => setTimeout(resolver, 10));
    }
    expect(avisos.find((a) => a.tipo === 'publicacion_ocultada')).toMatchObject({ publicacionId: id });
  });

  it('no se oculta una publicación con una reclamación en curso: hay alguien esperando', async () => {
    const id = await publicar(leo, 'Objeto con reclamación');
    await request(srv())
      .post(`/publicaciones/${id}/reclamaciones`)
      .set(con(bea))
      .send({ prueba: 'Tiene una calcomanía de la UTB por dentro' });
    const reporte = await reportar(ana, id, { motivo: 'falso' });

    const r = await request(srv())
      .post(`/moderacion/reportes/${reporte.body.id}/resolver`)
      .set(con(admin))
      .send({ decision: 'ocultar' });
    expect(r.status).toBe(409);
    expect(r).toSatisfyApiSpec();
    expect((await request(srv()).get(`/publicaciones/${id}`)).body.estado).toBe('en_verificacion');
  });

  it('los reportes que alguien escribió entran en "mis datos" y su detalle se anonimiza al eliminar la cuenta', async () => {
    const zoe = await crearUsuario(app, 'Zoe');
    const id = await publicar(leo, 'Publicación con datos de otra persona');
    await reportar(zoe, id, { motivo: 'datos_personales', detalle: 'Llámenla al 300 123 4567' });

    const datos = await request(srv()).get('/cuentas/yo/datos').set(con(zoe));
    expect(datos).toSatisfyApiSpec();
    expect(datos.body.reportes).toHaveLength(1);
    expect(datos.body.reportes[0].detalle).toContain('300 123 4567');

    const antes = (await request(srv()).get('/moderacion/reportes').set(con(admin))).body;
    expect(JSON.stringify(antes)).toContain('300 123 4567'); // el administrador ve lo que dijo

    const eliminada = await request(srv()).delete('/cuentas/yo').set(con(zoe)).send({ contrasena: 'contrasena-segura-1' });
    expect(eliminada.status).toBe(204);

    const despues = (await request(srv()).get('/moderacion/reportes').set(con(admin))).body;
    expect(JSON.stringify(despues)).not.toContain('300 123 4567');
    expect(JSON.stringify(despues)).toContain('eliminado a petición de su titular');
  });

  it('una decisión inválida responde 400', async () => {
    const id = await publicar(leo, 'Para decidir');
    const reporte = await reportar(ana, id, { motivo: 'spam' });
    const r = await request(srv())
      .post(`/moderacion/reportes/${reporte.body.id}/resolver`)
      .set(con(admin))
      .send({ decision: 'borrar' });
    expect(r.status).toBe(400);
  });
});
