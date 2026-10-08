/**
 * Mide la búsqueda con filtros (GET /publicaciones) contra el escenario S1:
 * p95 <= 400 ms con hasta 200 usuarios concurrentes. Usa autocannon (carga
 * HTTP concurrente real; un bucle secuencial no mide concurrencia).
 *
 * Variables: BASE_URL (por defecto http://127.0.0.1:3000), SEMBRAR (cantidad
 * de publicaciones a crear antes de medir, por defecto 1000; 0 = no sembrar,
 * útil para medir contra un entorno sin ensuciar sus datos),
 * CONEXIONES (200), DURACION_S (15), LOTE_SIEMBRA (20), PREFIJO_CATEGORIA ('';
 * p. ej. 'carga-s10-' para poder borrar después lo sembrado en un entorno real).
 *
 * Autocannon reporta p97.5 y no p95: como p95 <= p97.5, comprobar que p97.5
 * cumple el umbral es una condición más estricta que la del escenario.
 */
const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const SEMBRAR = Number(process.env.SEMBRAR ?? 1000);
const CONEXIONES = Number(process.env.CONEXIONES || 200);
const DURACION_S = Number(process.env.DURACION_S || 15);
const LOTE_SIEMBRA = Number(process.env.LOTE_SIEMBRA || 20);
// Prefijo de las categorías sembradas: permite aislar y borrar después los
// datos de la medición en un entorno real (DELETE ... WHERE categoria LIKE 'carga-s10-%').
const PREFIJO_CATEGORIA = process.env.PREFIJO_CATEGORIA ?? '';
const UMBRAL_MS = 400;

const CATEGORIAS = ['electronica', 'mochilas', 'llaves', 'documentos', 'ropa', 'accesorios'];
const UBICACIONES = ['Bloque A1', 'Bloque A2', 'Bloque A3', 'Bloque A4', 'Bloque A5', 'Biblioteca'];

async function crear(i) {
  const respuesta = await fetch(new URL('/publicaciones', BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: i % 2 === 0 ? 'perdido' : 'encontrado',
      descripcion: `Medicion busqueda ${i}`,
      categoria: `${PREFIJO_CATEGORIA}${CATEGORIAS[i % CATEGORIAS.length]}`,
      ubicacion: UBICACIONES[i % UBICACIONES.length],
    }),
  });
  return respuesta.status;
}

(async () => {
  // Se siembra por lotes concurrentes: miles de peticiones secuenciales
  // contra un servidor remoto tardarían minutos.
  for (let desde = 0; desde < SEMBRAR; desde += LOTE_SIEMBRA) {
    const indices = Array.from({ length: Math.min(LOTE_SIEMBRA, SEMBRAR - desde) }, (_, k) => desde + k);
    const estados = await Promise.all(indices.map(crear));
    const malo = estados.find((estado) => estado !== 201);
    if (malo !== undefined) throw new Error(`Esperaba 201 al sembrar, recibí ${malo}`);
  }

  const resultado = await autocannon({
    url: `${BASE_URL}/publicaciones?categoria=${PREFIJO_CATEGORIA}electronica&ubicacion=Bloque%20A1&limite=20`,
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
