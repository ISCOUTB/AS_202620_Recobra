const test = require('node:test');
const assert = require('node:assert');
const { CrearPublicacion } = require('../src/application/use-cases/crear-publicacion');
const { PublicacionInvalidaError } = require('../src/domain/entities/publicacion');
const { MemoriaPublicacionRepository } = require('../src/infrastructure/adapters/persistence/memoria-publicacion-repository');

test('crea y persiste una publicación válida', async () => {
  const repositorio = new MemoriaPublicacionRepository();
  const crearPublicacion = new CrearPublicacion(repositorio);

  const publicacion = await crearPublicacion.ejecutar({
    tipo: 'perdido',
    descripcion: 'Mochila azul con laptop',
    categoria: 'mochilas',
    ubicacion: 'Bloque 5, UTB',
  });

  assert.strictEqual(publicacion.estado, 'publicado');
  assert.ok(publicacion.id);

  const guardada = await repositorio.buscarPorId(publicacion.id);
  assert.strictEqual(guardada.descripcion, 'Mochila azul con laptop');
});

test('rechaza un tipo inválido antes de tocar el repositorio', async () => {
  const repositorio = new MemoriaPublicacionRepository();
  const crearPublicacion = new CrearPublicacion(repositorio);

  await assert.rejects(
    () =>
      crearPublicacion.ejecutar({
        tipo: 'robado',
        descripcion: 'x',
        categoria: 'x',
        ubicacion: 'x',
      }),
    PublicacionInvalidaError
  );

  assert.strictEqual(repositorio.publicaciones.size, 0);
});

test('rechaza una descripcion vacía', async () => {
  const repositorio = new MemoriaPublicacionRepository();
  const crearPublicacion = new CrearPublicacion(repositorio);

  await assert.rejects(
    () =>
      crearPublicacion.ejecutar({
        tipo: 'encontrado',
        descripcion: '   ',
        categoria: 'x',
        ubicacion: 'x',
      }),
    PublicacionInvalidaError
  );
});
