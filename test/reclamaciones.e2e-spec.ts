import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/**
 * Cuentas y reclamación con verificación (escenario S2, ADR-0013 y ADR-0014),
 * de extremo a extremo y validado contra el contrato OpenAPI.
 */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Cuentas y reclamaciones (e2e)', () => {
  let app: INestApplication;
  let quienEncontro: UsuarioDePrueba;
  let dueno: UsuarioDePrueba;
  let otro: UsuarioDePrueba;
  const PRUEBA = 'Tiene una calcomanía de la UTB y las iniciales C.C. por dentro';

  const srv = () => app.getHttpServer();
  const conSesion = (usuario: UsuarioDePrueba) => ({ Authorization: `Bearer ${usuario.token}` });

  beforeAll(async () => {
    app = await crearAppDePrueba();
    quienEncontro = await crearUsuario(app, 'Bea');
    dueno = await crearUsuario(app, 'Ana');
    otro = await crearUsuario(app, 'Leo');
  });

  afterAll(async () => {
    await app.close();
  });

  async function publicarEncontrado(): Promise<string> {
    const r = await request(srv())
      .post('/publicaciones')
      .set(conSesion(quienEncontro))
      .send({ tipo: 'encontrado', descripcion: 'Termo azul', categoria: 'otros', ubicacion: 'Biblioteca' });
    return r.body.id;
  }

  describe('Identidad', () => {
    it('registro solo con correo institucional; 409 si ya existe; la respuesta no trae la contraseña', async () => {
      const ok = await request(srv())
        .post('/cuentas')
        .send({ correo: 'nueva.cuenta@utb.edu.co', nombre: 'Nueva', contrasena: 'contrasena-1', aceptoPrivacidad: true });
      expect(ok.status).toBe(201);
      expect(ok).toSatisfyApiSpec();
      expect(JSON.stringify(ok.body)).not.toContain('contrasena');

      const repetida = await request(srv())
        .post('/cuentas')
        .send({ correo: 'NUEVA.cuenta@utb.edu.co', nombre: 'Otra', contrasena: 'contrasena-1', aceptoPrivacidad: true });
      expect(repetida.status).toBe(409);

      const externa = await request(srv())
        .post('/cuentas')
        .send({ correo: 'alguien@gmail.com', nombre: 'Externo', contrasena: 'contrasena-1', aceptoPrivacidad: true });
      expect(externa.status).toBe(400);
      expect(externa).toSatisfyApiSpec();
    });

    it('iniciar sesión con contraseña incorrecta responde 401 con el mismo mensaje que un correo inexistente', async () => {
      const malaClave = await request(srv()).post('/sesiones').send({ correo: dueno.correo, contrasena: 'equivocada' });
      const sinCuenta = await request(srv()).post('/sesiones').send({ correo: 'nadie@utb.edu.co', contrasena: 'x1234567' });
      expect(malaClave.status).toBe(401);
      expect(malaClave.body.message).toBe(sinCuenta.body.message);
      expect(malaClave).toSatisfyApiSpec();
    });

    it('GET /cuentas/yo devuelve la cuenta de la sesión; sin token 401', async () => {
      const yo = await request(srv()).get('/cuentas/yo').set(conSesion(dueno));
      expect(yo.status).toBe(200);
      expect(yo.body.correo).toBe(dueno.correo);
      expect(yo).toSatisfyApiSpec();

      const sin = await request(srv()).get('/cuentas/yo');
      expect(sin.status).toBe(401);
      expect(sin.headers['www-authenticate']).toBe('Bearer');
    });

    it('cerrar sesión invalida el token', async () => {
      const temporal = await crearUsuario(app, 'Temporal');
      const cierre = await request(srv()).delete('/sesiones').set(conSesion(temporal));
      expect(cierre.status).toBe(204);
      expect((await request(srv()).get('/cuentas/yo').set(conSesion(temporal))).status).toBe(401);
    });

    it('publicar sin sesión responde 401 y no crea nada', async () => {
      const r = await request(srv())
        .post('/publicaciones')
        .send({ tipo: 'perdido', descripcion: 'Sin sesión', categoria: 'sin-sesion', ubicacion: 'X' });
      expect(r.status).toBe(401);
      expect(r).toSatisfyApiSpec();
      const busqueda = await request(srv()).get('/publicaciones').query({ categoria: 'sin-sesion' });
      expect(busqueda.body).toHaveLength(0);
    });

    it('la publicación queda ligada a su autor y aparece en /publicaciones/mias', async () => {
      const id = await publicarEncontrado();
      const mias = await request(srv()).get('/publicaciones/mias').set(conSesion(quienEncontro));
      expect(mias.status).toBe(200);
      expect(mias.body.map((p: { id: string }) => p.id)).toContain(id);
      expect(mias.body.every((p: { autorId: string }) => p.autorId === quienEncontro.id)).toBe(true);
      expect(mias).toSatisfyApiSpec();
    });
  });

  describe('Reclamación con verificación (S2)', () => {
    it('flujo completo: reclamar, ver la prueba, aprobar y compartir el contacto solo al final', async () => {
      const pubId = await publicarEncontrado();

      const reclamo = await request(srv())
        .post(`/publicaciones/${pubId}/reclamaciones`)
        .set(conSesion(dueno))
        .send({ prueba: PRUEBA });
      expect(reclamo.status).toBe(201);
      expect(reclamo).toSatisfyApiSpec();
      expect((await request(srv()).get(`/publicaciones/${pubId}`)).body.estado).toBe('en_verificacion');

      const lista = await request(srv()).get(`/publicaciones/${pubId}/reclamaciones`).set(conSesion(quienEncontro));
      expect(lista.status).toBe(200);
      expect(lista).toSatisfyApiSpec();
      expect(lista.body[0].prueba).toBe(PRUEBA);
      expect(lista.body[0].reclamante.correo).toBeUndefined();

      const mias = await request(srv()).get('/reclamaciones/mias').set(conSesion(dueno));
      expect(mias.body[0].contactoQuienEncontro).toBeUndefined();

      const aprobacion = await request(srv())
        .post(`/reclamaciones/${reclamo.body.id}/aprobar`)
        .set(conSesion(quienEncontro));
      expect(aprobacion.status).toBe(200);
      expect(aprobacion).toSatisfyApiSpec();
      expect((await request(srv()).get(`/publicaciones/${pubId}`)).body.estado).toBe('por_entregar');

      const despues = await request(srv()).get('/reclamaciones/mias').set(conSesion(dueno));
      expect(despues).toSatisfyApiSpec();
      expect(despues.body.find((r: { id: string }) => r.id === reclamo.body.id).contactoQuienEncontro.correo).toBe(
        quienEncontro.correo,
      );

      // ADR-0017: aprobar dice "es el dueño"; la entrega la confirma una de las dos partes.
      const recibido = await request(srv()).post(`/reclamaciones/${reclamo.body.id}/entregada`).set(conSesion(dueno));
      expect(recibido.status).toBe(200);
      expect(recibido).toSatisfyApiSpec();
      expect(recibido.body.entregadaEn).toEqual(expect.any(String));
      expect((await request(srv()).get(`/publicaciones/${pubId}`)).body.estado).toBe('reclamado');
      const otraVez = await request(srv())
        .post(`/reclamaciones/${reclamo.body.id}/entregada`)
        .set(conSesion(quienEncontro));
      expect(otraVez.status).toBe(409);
    });

    it('solo quien publicó puede ver y resolver; los demás reciben 403', async () => {
      const pubId = await publicarEncontrado();
      const reclamo = await request(srv())
        .post(`/publicaciones/${pubId}/reclamaciones`)
        .set(conSesion(dueno))
        .send({ prueba: PRUEBA });

      const ver = await request(srv()).get(`/publicaciones/${pubId}/reclamaciones`).set(conSesion(otro));
      expect(ver.status).toBe(403);
      expect(ver).toSatisfyApiSpec();

      const aprobarseASiMismo = await request(srv())
        .post(`/reclamaciones/${reclamo.body.id}/aprobar`)
        .set(conSesion(dueno));
      expect(aprobarseASiMismo.status).toBe(403);
      expect((await request(srv()).get(`/publicaciones/${pubId}`)).body.estado).toBe('en_verificacion');
    });

    it('rechazar con motivo devuelve el objeto a publicado; resolver dos veces responde 409', async () => {
      const pubId = await publicarEncontrado();
      const reclamo = await request(srv())
        .post(`/publicaciones/${pubId}/reclamaciones`)
        .set(conSesion(dueno))
        .send({ prueba: PRUEBA });

      const rechazo = await request(srv())
        .post(`/reclamaciones/${reclamo.body.id}/rechazar`)
        .set(conSesion(quienEncontro))
        .send({ motivo: 'La descripción no coincide' });
      expect(rechazo.status).toBe(200);
      expect(rechazo).toSatisfyApiSpec();
      expect((await request(srv()).get(`/publicaciones/${pubId}`)).body.estado).toBe('publicado');

      const otraVez = await request(srv())
        .post(`/reclamaciones/${reclamo.body.id}/aprobar`)
        .set(conSesion(quienEncontro));
      expect(otraVez.status).toBe(409);
      expect(otraVez).toSatisfyApiSpec();
    });

    it('no se puede reclamar sin sesión, la propia publicación, ni con una prueba vacía', async () => {
      const pubId = await publicarEncontrado();
      const ruta = `/publicaciones/${pubId}/reclamaciones`;

      expect((await request(srv()).post(ruta).send({ prueba: PRUEBA })).status).toBe(401);
      const propia = await request(srv()).post(ruta).set(conSesion(quienEncontro)).send({ prueba: PRUEBA });
      expect(propia.status).toBe(409);
      expect(propia).toSatisfyApiSpec();
      const vacia = await request(srv()).post(ruta).set(conSesion(dueno)).send({ prueba: 'es mío' });
      expect(vacia.status).toBe(400);
      expect(vacia).toSatisfyApiSpec();
      const inexistente = await request(srv())
        .post('/publicaciones/no-existe/reclamaciones')
        .set(conSesion(dueno))
        .send({ prueba: PRUEBA });
      expect(inexistente.status).toBe(404);
    });
  });
});
