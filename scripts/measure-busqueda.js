/**
 * Mide la búsqueda con filtros (GET /publicaciones) contra el escenario S1:
 * p95 <= 400 ms con hasta 200 usuarios concurrentes. Usa autocannon (carga
 * HTTP concurrente real; un bucle secuencial no mide concurrencia).
 *
 * Variables: BASE_URL (por defecto http://127.0.0.1:3000), SEMBRAR (cantidad
 * de publicaciones a crear antes de medir, por defecto 1000; 0 = no sembrar,
 * útil para medir contra un entorno sin ensuciar sus datos),
 * CONEXIONES (200), DURACION_S (15).
 *
 * Autocannon reporta p97.5 y no p95: como p95 <= p97.5, comprobar que p97.5
 * cumple el umbral es una condición más estricta que la del escenario.
 */
const http = require('node:http');
const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const SEMBRAR = Number(process.env.SEMBRAR ?? 1000);
const CONEXIONES = Number(process.env.CONEXIONES || 200);
const DURACION_S = Number(process.env.DURACION_S || 15);
const UMBRAL_MS = 400;

const CATEGORIAS = ['electronica', 'mochilas', 'llaves', 'documentos', 'ropa', 'accesorios'];
const UBICACIONES = ['Bloque A1', 'Bloque A2', 'Bloque A3', 'Bloque A4', 'Bloque A5', 'Biblioteca'];

function crear(i) {
  return new Promise((resolve, reject) => {
    const cuerpo = JSON.stringify({
      tipo: i % 2 === 0 ? 'perdido' : 'encontrado',
      descripcion: `Medicion busqueda ${i}`,
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      ubicacion: UBICACIONES[i % UBICACIONES.length],
    });
    const url = new URL('/publicaciones', BASE_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(cuerpo) },
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );
    req.on('error', reject);
    req.write(cuerpo);
    req.end();
  });
}

(async () => {
  for (let i = 0; i < SEMBRAR; i += 1) {
    const estado = await crear(i);
    if (estado !== 201) throw new Error(`Esperaba 201 al sembrar, recibí ${estado}`);
  }

  const resultado = await autocannon({
    url: `${BASE_URL}/publicaciones?categoria=electronica&ubicacion=Bloque%20A1&limite=20`,
    connections: CONEXIONES,
    duration: DURACION_S,
  });

  const p975 = resultado.latency.p97_5;
  // Solo se imprimen métricas numéricas calculadas por autocannon, nunca
  // campos del cuerpo de las respuestas (evita rutas de dato de red a console.log).
  console.log(
    JSON.stringify(
      {
        escenario: `S1 (p95 <= ${UMBRAL_MS} ms con hasta 200 usuarios concurrentes)`,
        publicacionesSembradas: SEMBRAR,
        conexionesConcurrentes: CONEXIONES,
        duracionSegundos: DURACION_S,
        peticionesPorSegundo: Math.round(resultado.requests.average),
        respuestas2xx: resultado['2xx'],
        respuestasNo2xx: resultado.non2xx,
        errores: resultado.errors,
        latenciaMs: {
          p50: resultado.latency.p50,
          p90: resultado.latency.p90,
          p97_5: p975,
          p99: resultado.latency.p99,
          max: resultado.latency.max,
        },
        cumpleUmbral: p975 <= UMBRAL_MS && resultado.non2xx === 0 && resultado.errors === 0,
      },
      null,
      2,
    ),
  );
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
