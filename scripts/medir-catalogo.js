/**
 * Mide la búsqueda (escenario S1: p95 <= 400 ms con 200 usuarios a la vez) con
 * un catálogo representativo, en respuesta a la observación S16: la medición
 * S14 se hizo con dos publicaciones y respuesta vacía.
 *
 * Siembra directamente en PostgreSQL (generate_series) 1.000, 10.000 y 100.000
 * publicaciones con una distribución parecida al uso real: 7 categorías,
 * 20 lugares, 75 % activas y fechas repartidas en 180 días. Para cada tamaño
 * mide con autocannon tres búsquedas:
 *   - frecuente: categoría y lugar con resultados (llena las 20 filas pronto);
 *   - sin filtros: lo que ve quien abre Inicio;
 *   - sin coincidencias: un filtro que no encuentra nada, el peor caso
 *     (obliga a recorrer todo el catálogo si no hay un índice que lo evite).
 * Guarda además el plan de PostgreSQL (EXPLAIN ANALYZE) del peor caso.
 *
 * Nunca se usa contra producción: exige DATABASE_URL de una base de prueba y
 * BASE_URL de un backend conectado a ella. Variables: TAMANOS (1000,10000,100000),
 * CONEXIONES (200), DURACION_S (10), SALIDA (archivo JSON con los resultados).
 */
const fs = require('node:fs');
const autocannon = require('autocannon');
const { Client } = require('pg');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const TAMANOS = (process.env.TAMANOS || '1000,10000,100000').split(',').map(Number);
const CONEXIONES = Number(process.env.CONEXIONES || 200);
const DURACION_S = Number(process.env.DURACION_S || 10);
const SALIDA = process.env.SALIDA || 'medicion-catalogo.json';
const UMBRAL_MS = 400;

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL (base de prueba, nunca producción)');
if (/recobra\.iscoutb\.dev/.test(BASE_URL)) throw new Error('Esta medición siembra datos: no se usa contra producción');

const CONSULTAS = {
  frecuente: '/publicaciones?categoria=electronica&ubicacion=Biblioteca&limite=20',
  sinFiltros: '/publicaciones?limite=20',
  sinCoincidencias: '/publicaciones?categoria=paraguas&limite=20',
};

async function sembrar(cliente, total) {
  await cliente.query('TRUNCATE publicaciones');
  await cliente.query(
    `INSERT INTO publicaciones (id, tipo, descripcion, categoria, ubicacion, estado, creado_en)
     SELECT 'carga-' || g,
            CASE WHEN g % 2 = 0 THEN 'perdido' ELSE 'encontrado' END,
            'Objeto de prueba ' || g,
            (ARRAY['electronica','mochilas','llaves','documentos','ropa','accesorios','otros'])[1 + g % 7],
            CASE WHEN g % 20 = 0 THEN 'Biblioteca' ELSE 'Bloque ' || (1 + g % 19) END,
            CASE WHEN g % 4 = 0 THEN 'cerrado' ELSE 'publicado' END,
            now() - (g % 180) * interval '1 day' - (g % 1440) * interval '1 minute'
     FROM generate_series(1, $1) AS g`,
    [total],
  );
  await cliente.query('ANALYZE publicaciones');
}

async function medir(ruta) {
  const r = await autocannon({ url: BASE_URL + ruta, connections: CONEXIONES, duration: DURACION_S });
  return {
    p50: r.latency.p50,
    p97_5: r.latency.p97_5,
    p99: r.latency.p99,
    peticionesPorSegundo: Math.round(r.requests.average),
    respuestas2xx: r['2xx'],
    respuestasNo2xx: r.non2xx,
    errores: r.errors,
    cumpleS1: r.latency.p97_5 <= UMBRAL_MS && r.non2xx === 0 && r.errors === 0,
  };
}

async function planPeorCaso(cliente) {
  const { rows } = await cliente.query(
    `EXPLAIN (ANALYZE, FORMAT TEXT)
     SELECT * FROM publicaciones
     WHERE ($1::text IS NULL OR tipo = $1)
       AND ($2::text IS NULL OR lower(trim(categoria)) = $2)
       AND ($3::text IS NULL OR lower(trim(ubicacion)) = $3)
       AND estado = ANY($5::text[])
     ORDER BY creado_en DESC
     LIMIT $4`,
    [null, 'paraguas', null, 20, ['publicado', 'en_verificacion', 'por_entregar']],
  );
  return rows.map((fila) => fila['QUERY PLAN']);
}

(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  // El backend crea el esquema al arrancar; se espera a que responda.
  for (let i = 0; i < 30; i++) {
    const r = await fetch(BASE_URL + '/health/ready').catch(() => null);
    if (r && r.status === 200) break;
    await new Promise((listo) => setTimeout(listo, 1000));
  }
  await fetch(BASE_URL + '/publicaciones?limite=1'); // crea el esquema si aún no existe

  const resultados = [];
  for (const total of TAMANOS) {
    await sembrar(cliente, total);
    const fila = { publicaciones: total, consultas: {} };
    for (const [nombre, ruta] of Object.entries(CONSULTAS)) fila.consultas[nombre] = await medir(ruta);
    if (total === Math.max(...TAMANOS)) {
      fila.planPeorCaso = await planPeorCaso(cliente);
      console.log(`::notice title=Plan del peor caso (${total} publicaciones)::${fila.planPeorCaso.join(' | ')}`);
    }
    resultados.push(fila);
    for (const [nombre, m] of Object.entries(fila.consultas)) {
      // Una línea por medición: queda como anotación del run, visible sin iniciar sesión.
      console.log(
        `::notice title=S1 ${total} publicaciones · ${nombre}::p50=${m.p50} ms · p97,5=${m.p97_5} ms · ` +
          `${m.peticionesPorSegundo} pet/s · no2xx=${m.respuestasNo2xx} · errores=${m.errores} · ` +
          (m.cumpleS1 ? 'cumple' : 'NO cumple'),
      );
    }
  }
  await cliente.end();

  const informe = {
    escenario: `S1 (p95 <= ${UMBRAL_MS} ms con hasta 200 usuarios concurrentes); se reporta p97,5, más estricto`,
    entorno: 'GitHub Actions ubuntu-latest, backend y PostgreSQL 16 en la misma máquina (no es el servidor del laboratorio)',
    conexiones: CONEXIONES,
    duracionSegundos: DURACION_S,
    consultas: CONSULTAS,
    resultados,
  };
  fs.writeFileSync(SALIDA, JSON.stringify(informe, null, 2));
  console.log(JSON.stringify(informe, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
