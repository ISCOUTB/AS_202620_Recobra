const test = require('node:test');
const assert = require('node:assert');
const { CrearPublicacion } = require('../src/application/use-cases/crear-publicacion');
const { ConsultarPublicacion } = require('../src/application/use-cases/consultar-publicacion');
const { MemoriaPublicacionRepository } = require('../src/infrastructure/adapters/persistence/memoria-publicacion-repository');

test('consulta una publicación existente por id', async () => {
  const repositorio = new MemoriaPublicacionRepository();
  const crearPublicacion = new CrearPublicacion(repositorio);
  const consultarPublicacion = new ConsultarPublicacion(repositorio);

  const creada = await crearPublicacion.ejecutar({
    tipo: 'perdido',
    descripcion: 'Sombrilla negra',
    categoria: 'accesorios',
    ubicacion: 'Cafetería central',
  });

  const encontrada = await consultarPublicacion.ejecutar({ id: creada.id });

  assert.ok(encontrada);
  assert.strictEqual(encontrada.descripcion, 'Sombrilla negra');
});

test('devuelve null cuando el id no existe, sin lanzar error', async () => {
  const repositorio = new MemoriaPublicacionRepository();
  const consultarPublicacion = new ConsultarPublicacion(repositorio);

  const resultado = await consultarPublicacion.ejecutar({ id: 'no-existe' });

  assert.strictEqual(resultado, null);
});
