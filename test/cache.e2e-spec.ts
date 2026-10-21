import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './support/crear-app-prueba';
import { UsuarioDePrueba, crearUsuario } from './support/autenticar';
import { jpegDePrueba } from './support/jpeg-de-prueba';

/**
 * Política de caché HTTP y su invalidación tras una escritura (ADR-0025,
 * arc42 §8.3). El criterio: lo que cambia con el ciclo de vida se revalida
 * siempre (no-cache + ETag), lo privado no se guarda, y solo se cachea lo que no
 * cambia con el uso.
 */
describe('Caché HTTP (e2e)', () => {
  let app: INestApplication;
  let ana: UsuarioDePrueba;
  let bea: UsuarioDePrueba;
  const srv = () => app.getHttpServer();
  const con = (u: UsuarioDePrueba) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    app = await crearAppDePrueba();
    ana = await crearUsuario(app, 'Ana');
    bea = await crearUsuario(app, 'Bea');
  });

  afterAll(async () => {
    await app.close();
  });

  const publicar = async (u: UsuarioDePrueba, tipo: 'perdido' | 'encontrado', descripcion: string) =>
    (
      await request(srv())
        .post('/publicaciones')
        .set(con(u))
        .send({ tipo, descripcion, categoria: 'cache-e2e', ubicacion: 'Biblioteca' })
    ).body.id as string;

  it('lo que cambia con el ciclo de vida se revalida siempre: no-cache con ETag', async () => {
    const busqueda = await request(srv()).get('/publicaciones?categoria=cache-e2e');
    expect(busqueda.headers['cache-control']).toBe('no-cache');
    expect(busqueda.headers.etag).toBeTruthy();

    const id = await publicar(ana, 'perdido', 'Termo para revalidar');
    const detalle = await request(srv()).get(`/publicaciones/${id}`);
    expect(detalle.headers['cache-control']).toBe('no-cache');
  });

  it('invalidación tras escribir: la misma consulta condicional deja de dar 304 y trae lo nuevo', async () => {
    const id = await publicar(ana, 'encontrado', 'Mochila para invalidar');
    const antes = await request(srv()).get(`/publicaciones/${id}`);
    const etagAntes = antes.headers.etag;

    // Sin cambios, la revalidación responde 304 sin cuerpo.
    const igual = await request(srv()).get(`/publicaciones/${id}`).set('If-None-Match', etagAntes);
    expect(igual.status).toBe(304);

    // Una escritura (decir dónde está el objeto) cambia el contenido...
    await request(srv())
      .post(`/publicaciones/${id}/custodia`)
      .set(con(ana))
      .send({ custodia: 'punto_de_entrega', puntoCustodia: 'Portería principal' });

    // ...y el mismo validador ya no sirve: el cliente recibe lo nuevo, sin esperar un tiempo de vida.
    const despues = await request(srv()).get(`/publicaciones/${id}`).set('If-None-Match', etagAntes);
    expect(despues.status).toBe(200);
    expect(despues.body.puntoCustodia).toBe('Portería principal');
    expect(despues.headers.etag).not.toBe(etagAntes);
  });

  it('lo de una persona nunca se guarda: private, no-store con sesión', async () => {
    for (const ruta of ['/publicaciones/mias', '/notificaciones', '/reclamaciones/mias', '/cuentas/yo']) {
      const r = await request(srv()).get(ruta).set(con(ana));
      expect(r.headers['cache-control']).toBe('private, no-store');
    }
  });

  it('solo se cachea lo que no cambia con el uso: el catálogo de lugares, una hora', async () => {
    const r = await request(srv()).get('/lugares');
    expect(r.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('fotos: la miniatura vive un minuto en la caché; la completa nunca se guarda; y al quitarla el servidor ya no la sirve', async () => {
    const id = await publicar(ana, 'perdido', 'Libro con foto para la caché');
    const imagen = jpegDePrueba({ ancho: 20, alto: 20 });
    const subida = await request(srv())
      .put(`/publicaciones/${id}/foto`)
      .set(con(ana))
      .set('Content-Type', 'image/jpeg')
      .set('X-Miniatura', imagen.toString('base64'))
      .send(imagen);
    expect(subida.status).toBe(200);

    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).headers['cache-control']).toBe(
      'public, max-age=60',
    );
    expect((await request(srv()).get(`/publicaciones/${id}/foto`).set(con(bea))).headers['cache-control']).toBe(
      'private, no-store',
    );

    // Lo que pueda seguir en la caché de un cliente es la miniatura, y como mucho 60 s: el servidor ya no la tiene.
    await request(srv()).delete(`/publicaciones/${id}/foto`).set(con(ana));
    expect((await request(srv()).get(`/publicaciones/${id}/foto/miniatura`)).status).toBe(404);
  });
});
