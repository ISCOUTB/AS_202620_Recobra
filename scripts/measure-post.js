/**
 * Mide latencia de POST /publicaciones (línea base / resultado corte 1).
 * Uso: con el servidor levantado (`npm run start`), ejecutar `npm run measure:post`.
 */
const http = require('node:http');

const PORT = process.env.PORT || 3000;
const N = Number(process.env.MEASURE_N || 50);

function postOnce() {
  const body = JSON.stringify({
    tipo: 'perdido',
    descripcion: `Medicion ${Date.now()}`,
    categoria: 'electronica',
    ubicacion: 'Bloque 3',
  });

  return new Promise((resolve, reject) => {
    const started = process.hrtime.bigint();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/publicaciones',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
          resolve({ status: res.statusCode, elapsedMs });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

(async () => {
  const samples = [];
  for (let i = 0; i < N; i += 1) {
    const result = await postOnce();
    if (result.status !== 201) {
      throw new Error(`Esperaba 201, recibí ${result.status}`);
    }
    samples.push(result.elapsedMs);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((acc, v) => acc + v, 0);
  console.log(
    JSON.stringify(
      {
        n: N,
        avgMs: Number((sum / samples.length).toFixed(2)),
        p50Ms: Number(percentile(samples, 50).toFixed(2)),
        p95Ms: Number(percentile(samples, 95).toFixed(2)),
        minMs: Number(samples[0].toFixed(2)),
        maxMs: Number(samples[samples.length - 1].toFixed(2)),
      },
      null,
      2,
    ),
  );
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
