import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';
import { revisarJpeg } from '../src/domain/fotos/jpeg';
import { jpegDePrueba } from './support/jpeg-de-prueba';

/** Fotos con privacidad (ADR-0023), contra el contrato 5.2.0. */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Fotos (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let bea: UsuarioDePrueba;
  let leo: UsuarioDePrueba;
  let admin: UsuarioDePrueba;
  const adminAnterior = process.env.ADMIN_CORREOS;
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  const completa = jpegDePrueba({ ancho: 800, alto: 600, exif: 'GPS 10.39N 75.48W' });
  const miniatura = jpegDePrueba({ ancho: 24, alto: 18 });

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana');
    bea = await crearUsuario(app, 'Bea');
    leo = await crearUsuario(app, 'Leo');
    admin = await crearUsuario(app, 'Admin');
    process.env.ADMIN_CORREOS = admin.correo;
  });

  afterAll(async () => {
    if (adminAnterior === undefined) delete process.env.ADMIN_CORREOS;
    else process.env.ADMIN_CORREOS = adminAnterior;
    await app.close();
  });

  async function publicar(u: UsuarioDePrueba, tipo: 'perdido' | 'encontrado', descripcion: string) {
    const r = await request(srv())
      .post('/publicaciones')
      .set(con(u))
      .send({ tipo, descripcion, categoria: 'fotos-e2e', ubicacion: 'Biblioteca' });
    return r.body.id as string;
  }

  const subir = (u: UsuarioDePrueba | null, id: string, imagen: Buffer = completa, mini: Buffer | string = miniatura) => {
    const pedido = request(srv())
      .put(`/publicaciones/${id}/foto`)
      .set('Content-Type', 'image/jpeg')
      .set('X-Miniatura', Buffer.isBuffer(mini) ? mini.toString('base64') : mini);
    if (u) pedido.set(con(u));
    return pedido.send(imagen);
  };

  it('el autor sube la foto de un perdido: sale en la publicación, sin su ubicación GPS, y todos la ven', async () => {
    const id = await publicar(ana, 'perdido', 'Termo con foto');

    const r = await subir(ana, id);
    expect(r.status).toBe(200);
    expect(r).toSatisfyApiSpec();
    expect(r.body.tieneFoto).toBe(true);
    expect((await request(srv()).get(`/publicaciones/${id}`)).body.tieneFoto).toBe(true);

    const vista = await request(srv()).get(`/publicaciones/${id}/foto`); // sin sesión: es un perdido
    expect(vista.status).toBe(200);
    expect(vista.headers['content-type']).toBe('image/jpeg');
    expect(vista.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(vista.body).includes('GPS')).toBe(false);

    const chica = await request(srv()).get(`/publicaciones/${id}/foto/miniatura`);
    expect(chica.status).toBe(200);
    expect(Buffer.from(chica.body).equals(revisarJpeg(miniatura).limpio)).toBe(true);
    expect(Buffer.from(vista.body).equals(revisarJpeg(completa).limpio)).toBe(true);
  });

  it('la foto completa de un encontrado no es pública: la ven su autor y quien reclama cuando se aprueba', async () => {
    const id = await publicar(ana, 'encontrado', 'Mochila con foto');
    expect((await subir(ana, id)).status).toBe(200);

    const completaDe = (u: UsuarioDePrueba | null) => {
      const pedido = request(srv()).get(`/publicaciones/${id}/foto`);
      return u ? pedido.set(con(u)) : pedido;
    };

    const visitante = await completaDe(null);
    expect(visitante.status).toBe(403);
    expect(visitante).toSatisfyApiSpec();
    expect((await completaDe(bea)).status).toBe(403);
    expect((await completaDe(ana)).status).toBe(200);
    // Lo único público es la miniatura.
    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(200);

    const reclamo = await request(srv())
      .post(`/publicaciones/${id}/reclamaciones`)
      .set(con(bea))
      .send({ prueba: 'Tiene un llavero de la UTB en el bolsillo de adelante' });
    expect(reclamo.status).toBe(201);
    expect((await completaDe(bea)).status).toBe(403); // reclamó, pero todavía no la aprueban

    expect((await request(srv()).post(`/reclamaciones/${reclamo.body.id}/aprobar`).set(con(ana))).status).toBe(200);
    expect((await completaDe(bea)).status).toBe(200);
    expect((await completaDe(leo)).status).toBe(403);
  });

  it('valida lo que llega: JPEG, miniatura pequeña, peso, y solo el autor', async () => {
    const id = await publicar(ana, 'perdido', 'Libro con foto mala');

    const texto = await request(srv())
      .put(`/publicaciones/${id}/foto`)
      .set(con(ana))
      .set('Content-Type', 'image/jpeg')
      .set('X-Miniatura', miniatura.toString('base64'))
      .send(Buffer.from('no soy una imagen'));
    expect(texto.status).toBe(400);
    expect(texto).toSatisfyApiSpec();

    const sinMiniatura = await request(srv())
      .put(`/publicaciones/${id}/foto`)
      .set(con(ana))
      .set('Content-Type', 'image/jpeg')
      .send(completa);
    expect(sinMiniatura.status).toBe(400);

    const miniaturaGrande = await subir(ana, id, completa, jpegDePrueba({ ancho: 400, alto: 300 }));
    expect(miniaturaGrande.status).toBe(400);
    expect(miniaturaGrande.body.message).toMatch(/miniatura/);

    const pesada = await subir(ana, id, jpegDePrueba({ ancho: 100, alto: 100, relleno: 1024 * 1024 + 10 }));
    expect(pesada.status).toBe(413);
    expect(pesada).toSatisfyApiSpec();

    const conJson = await request(srv()).put(`/publicaciones/${id}/foto`).set(con(ana)).send({ foto: 'x' });
    expect(conJson.status).toBe(400);

    expect((await subir(bea, id)).status).toBe(403);
    expect((await subir(null, id)).status).toBe(401);
    expect((await subir(ana, 'no-existe')).status).toBe(404);
    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(404); // nada se guardó
  });

  it('el autor la quita; sin foto no hay nada que ver', async () => {
    const id = await publicar(ana, 'perdido', 'Cuaderno con foto');
    await subir(ana, id);

    expect((await request(srv()).delete(`/publicaciones/${id}/foto`).set(con(bea))).status).toBe(403);
    const r = await request(srv()).delete(`/publicaciones/${id}/foto`).set(con(ana));
    expect(r.status).toBe(200);
    expect(r).toSatisfyApiSpec();
    expect(r.body.tieneFoto).toBe(false);
    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(404);
  });

  it('con una reclamación en curso ya no se cambia la foto', async () => {
    const id = await publicar(ana, 'encontrado', 'Billetera con foto');
    await subir(ana, id);
    await request(srv())
      .post(`/publicaciones/${id}/reclamaciones`)
      .set(con(bea))
      .send({ prueba: 'Dentro hay una tarjeta del gimnasio a mi nombre' });

    expect((await subir(ana, id)).status).toBe(409);
    expect((await request(srv()).delete(`/publicaciones/${id}/foto`).set(con(ana))).status).toBe(409);
  });

  it('ocultar una publicación por moderación borra su foto', async () => {
    const id = await publicar(leo, 'perdido', 'Publicación abusiva con foto');
    await subir(leo, id);
    const reporte = await request(srv()).post(`/publicaciones/${id}/reportar`).set(con(ana)).send({ motivo: 'inapropiado' });

    const r = await request(srv())
      .post(`/moderacion/reportes/${reporte.body.id}/resolver`)
      .set(con(admin))
      .send({ decision: 'ocultar' });
    expect(r.status).toBe(200);

    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(404);
    expect((await request(srv()).get(`/publicaciones/${id}`)).body.tieneFoto).toBe(false);
  });

  it('eliminar la cuenta borra las fotos que subió', async () => {
    const otra = await crearUsuario(app, 'Cuenta que se va');
    const id = await publicar(otra, 'perdido', 'Gorra con foto');
    await subir(otra, id);
    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(200);

    const r = await request(srv()).delete('/cuentas/yo').set(con(otra)).send({ contrasena: 'contrasena-segura-1' });
    expect(r.status).toBe(204);

    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(404);
  });
});
