import * as path from 'node:path';
import * as jestOpenAPI from 'jest-openapi';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';

/** Privacidad y datos personales (ADR-0021), contra el contrato 5.0.0. */
jestOpenAPI.default(path.join(__dirname, '../docs/contracts/openapi.yaml'));

describe('Privacidad (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let leo: UsuarioDePrueba;
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });
  const CLAVE = 'contrasena-segura-1'; // la que usa crearUsuario

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana Pérez');
    leo = await crearUsuario(app, 'Leo Gómez');
  });

  afterAll(async () => {
    await app.close();
  });

  it('el aviso de privacidad es público, está versionado y habla de los derechos', async () => {
    const r = await request(srv()).get('/privacidad');
    expect(r.status).toBe(200);
    expect(r).toSatisfyApiSpec();
    expect(r.body.version).toEqual(expect.any(String));
    expect(r.body.secciones.map((s: { titulo: string }) => s.titulo)).toEqual(
      expect.arrayContaining(['Qué datos guardamos', 'Tus derechos']),
    );
  });

  it('crear una cuenta exige aceptar el aviso de privacidad', async () => {
    const cuerpo = { correo: 'sin.aceptar@utb.edu.co', nombre: 'Sin Aceptar', contrasena: CLAVE };
    for (const extra of [{}, { aceptoPrivacidad: false }, { aceptoPrivacidad: 'si' }]) {
      const r = await request(srv()).post('/cuentas').send({ ...cuerpo, ...extra });
      expect(r.status).toBe(400);
      expect(r).toSatisfyApiSpec();
      expect(r.body.message).toContain('aviso de privacidad');
    }
    const ok = await request(srv()).post('/cuentas').send({ ...cuerpo, aceptoPrivacidad: true });
    expect(ok.status).toBe(201);
  });

  it('tras 5 intentos fallidos de inicio de sesión responde 429 con Retry-After', async () => {
    const correo = 'limite.intentos@utb.edu.co';
    await request(srv()).post('/cuentas').send({ correo, nombre: 'Límite', contrasena: CLAVE, aceptoPrivacidad: true });
    for (let i = 0; i < 5; i++) {
      const r = await request(srv()).post('/sesiones').send({ correo, contrasena: 'equivocada-1' });
      expect(r.status).toBe(401);
    }
    const bloqueado = await request(srv()).post('/sesiones').send({ correo, contrasena: CLAVE });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado).toSatisfyApiSpec();
    expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
  });

  describe('descargar mis datos', () => {
    it('trae lo propio, nunca la contraseña ni lo de otras personas, y exige sesión', async () => {
      await request(srv())
        .post('/publicaciones')
        .set(con(ana))
        .send({ tipo: 'perdido', descripcion: 'Termo azul', categoria: 'privacidad-export', ubicacion: 'Biblioteca' });
      await request(srv())
        .post('/publicaciones')
        .set(con(leo))
        .send({ tipo: 'encontrado', descripcion: 'Paraguas de Leo', categoria: 'privacidad-export', ubicacion: 'Alcatraz' });

      const r = await request(srv()).get('/cuentas/yo/datos').set(con(ana));
      expect(r.status).toBe(200);
      expect(r).toSatisfyApiSpec();
      expect(r.body.cuenta).toMatchObject({ id: ana.id, correo: ana.correo, nombre: 'Ana Pérez' });
      expect(r.body.cuenta.avisoDePrivacidadAceptadoEn).toEqual(expect.any(String));
      expect(r.body.publicaciones.map((p: { descripcion: string }) => p.descripcion)).toEqual(['Termo azul']);
      const texto = JSON.stringify(r.body);
      expect(texto).not.toContain('hashContrasena');
      expect(texto).not.toContain('Paraguas de Leo');
      expect(texto).not.toContain(leo.correo);

      const sinSesion = await request(srv()).get('/cuentas/yo/datos');
      expect(sinSesion.status).toBe(401);
    });
  });

  describe('eliminar mi cuenta', () => {
    it('pide la contraseña, no deja mientras haya algo en curso y luego anonimiza todo', async () => {
      const mia = await request(srv())
        .post('/publicaciones')
        .set(con(ana))
        .send({ tipo: 'perdido', descripcion: 'Calculadora Casio', categoria: 'privacidad-borrar', ubicacion: 'Bloque A1' });
      const deLeo = await request(srv())
        .post('/publicaciones')
        .set(con(leo))
        .send({ tipo: 'encontrado', descripcion: 'Llaves con tortuga', categoria: 'llaves', ubicacion: 'Alcatraz' });
      const reclamo = await request(srv())
        .post(`/publicaciones/${deLeo.body.id}/reclamaciones`)
        .set(con(ana))
        .send({ prueba: 'Tienen un llavero de tortuga con un cascabel dorado' });
      expect(reclamo.status).toBe(201);

      const eliminar = (clave: string) =>
        request(srv()).delete('/cuentas/yo').set(con(ana)).send({ contrasena: clave });

      const equivocada = await eliminar('otra-contrasena-1');
      expect(equivocada.status).toBe(403);
      expect(equivocada).toSatisfyApiSpec();

      // Con una reclamación pendiente no se puede: dejaría a Leo esperando.
      const enCurso = await eliminar(CLAVE);
      expect(enCurso.status).toBe(409);
      expect(enCurso).toSatisfyApiSpec();
      expect(enCurso.body.message).toContain('reclamación');

      await request(srv()).post(`/reclamaciones/${reclamo.body.id}/rechazar`).set(con(leo)).send({ motivo: 'No coincide' });

      const hecho = await eliminar(CLAVE);
      expect(hecho.status).toBe(204);

      // La sesión y las credenciales ya no sirven.
      expect((await request(srv()).get('/cuentas/yo').set(con(ana))).status).toBe(401);
      const login = await request(srv()).post('/sesiones').send({ correo: ana.correo, contrasena: CLAVE });
      expect(login.status).toBe(401);

      // Su publicación se retiró y sale de la búsqueda.
      const publicacion = await request(srv()).get(`/publicaciones/${mia.body.id}`);
      expect(publicacion.body).toMatchObject({ estado: 'cerrado', motivoCierre: 'retirado' });
      expect((await request(srv()).get('/publicaciones?categoria=privacidad-borrar')).body).toHaveLength(0);

      // Quien publicó el objeto ve la reclamación sin datos personales.
      const reclamaciones = await request(srv()).get(`/publicaciones/${deLeo.body.id}/reclamaciones`).set(con(leo));
      expect(reclamaciones.body[0].reclamante.nombre).toBe('Cuenta eliminada');
      expect(reclamaciones.body[0].prueba).toContain('eliminada');
      expect(JSON.stringify(reclamaciones.body)).not.toContain('cascabel');

      // Su correo queda libre: puede crear una cuenta nueva.
      const nueva = await request(srv())
        .post('/cuentas')
        .send({ correo: ana.correo, nombre: 'Ana otra vez', contrasena: CLAVE, aceptoPrivacidad: true });
      expect(nueva.status).toBe(201);
    });
  });
});
