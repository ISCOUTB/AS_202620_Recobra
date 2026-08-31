const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../src/infrastructure/adapters/http/server');
const { MemoriaPublicacionRepository } = require('../src/infrastructure/adapters/persistence/memoria-publicacion-repository');

function iniciarServidor() {
  const publicacionRepository = new MemoriaPublicacionRepository();
  const app = createApp({ publicacionRepository });
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server));
  });
}

function post(port, ruta, cuerpo) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(cuerpo);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: ruta,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(port, ruta) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${ruta}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
      })
      .on('error', reject);
  });
}

test('POST /publicaciones crea una publicación y GET /publicaciones/:id la devuelve', async () => {
  const server = await iniciarServidor();
  const { port } = server.address();

  const creada = await post(port, '/publicaciones', {
    tipo: 'encontrado',
    descripcion: 'Llavero con 3 llaves',
    categoria: 'llaves',
    ubicacion: 'Biblioteca UTB',
  });

  assert.strictEqual(creada.statusCode, 201);
  assert.strictEqual(creada.body.estado, 'publicado');
  assert.ok(creada.body.id);

  const consultada = await get(port, `/publicaciones/${creada.body.id}`);
  assert.strictEqual(consultada.statusCode, 200);
  assert.strictEqual(consultada.body.descripcion, 'Llavero con 3 llaves');

  server.close();
});

test('POST /publicaciones con tipo inválido responde 400', async () => {
  const server = await iniciarServidor();
  const { port } = server.address();

  const respuesta = await post(port, '/publicaciones', {
    tipo: 'robado',
    descripcion: 'x',
    categoria: 'x',
    ubicacion: 'x',
  });

  assert.strictEqual(respuesta.statusCode, 400);
  assert.ok(respuesta.body.error);

  server.close();
});

test('GET /publicaciones/:id con id inexistente responde 404', async () => {
  const server = await iniciarServidor();
  const { port } = server.address();

  const respuesta = await get(port, '/publicaciones/no-existe');
  assert.strictEqual(respuesta.statusCode, 404);

  server.close();
});
