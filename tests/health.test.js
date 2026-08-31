const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../src/infrastructure/adapters/http/server');
const { MemoriaPublicacionRepository } = require('../src/infrastructure/adapters/persistence/memoria-publicacion-repository');

test('GET /health responde 200 y status ok', async () => {
  const app = createApp({ publicacionRepository: new MemoriaPublicacionRepository() });
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const body = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });

  assert.strictEqual(body.statusCode, 200);
  const parsed = JSON.parse(body.data);
  assert.strictEqual(parsed.status, 'ok');

  server.close();
});
