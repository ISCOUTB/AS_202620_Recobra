/**
 * Mide el tiempo real entre crear la publicación que completa una
 * coincidencia y que esa coincidencia aparezca en GET /coincidencias.
 * Contrasta contra el umbral de S3 (60 s). El evento es asíncrono en
 * proceso (ADR-0004), así que esta medición es la evidencia real de que
 * "asíncrono" no significa "lento" aquí.
 */
const http = require('node:http');

const PORT = process.env.PORT || 3000;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let body;
          try {
            body = JSON.parse(chunks || '{}');
          } catch {
            body = {};
          }
          resolve({ status: res.statusCode, body });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const categoria = `medicion-${Date.now()}`;
  const perdido = await request('POST', '/publicaciones', {
    tipo: 'perdido',
    descripcion: 'Medición emparejamiento',
    categoria,
    ubicacion: 'Medicion',
  });

  const inicio = process.hrtime.bigint();
  const encontrado = await request('POST', '/publicaciones', {
    tipo: 'encontrado',
    descripcion: 'Medición emparejamiento 2',
    categoria,
    ubicacion: 'Medicion',
  });

  let coincidencias = [];
  let intentos = 0;
  while (coincidencias.length === 0 && intentos < 200) {
    const respuesta = await request('GET', `/coincidencias?publicacionId=${encontrado.body.id}`);
    coincidencias = respuesta.body;
    if (coincidencias.length === 0) {
      await new Promise((r) => setTimeout(r, 5));
      intentos += 1;
    }
  }
  const finMs = Number(process.hrtime.bigint() - inicio) / 1e6;

  // No se registran los ids ni ningún campo tomado de la respuesta HTTP:
  // solo las métricas que calcula este mismo script, para no darle a
  // SonarCloud una ruta de datos de "respuesta de red" hacia console.log
  // (jssecurity:S5145) - el objetivo de esta medición es la latencia, no
  // los identificadores.
  const huboCoincidencia = coincidencias.length > 0;
  const scoreCoincidencia = huboCoincidencia ? Number(coincidencias[0].score) || 0 : null;
  console.log(
    JSON.stringify(
      {
        escenario: 'S3 (umbral 60000 ms)',
        latenciaDeteccionMs: Number(finMs.toFixed(2)),
        cumpleUmbral: finMs < 60000,
        huboCoincidencia,
        scoreCoincidencia,
      },
      null,
      2,
    ),
  );
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
