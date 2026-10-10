/**
 * Falla el pipeline si el Quality Gate público de SonarCloud no aprueba el
 * commit que se está integrando. No necesita token: SonarCloud analiza cada
 * push (GitHub App o scanner) y publica el resultado en una API de lectura
 * pública. Espera hasta que aparezca el análisis de ESTE commit y entonces
 * decide, así que no valida por error el resultado de un commit anterior.
 *
 * Variables: GITHUB_SHA (commit a verificar), ESPERA_MAXIMA_S (por omisión
 * 600) e INTERVALO_S (por omisión 10). El proyecto y el servidor son
 * constantes: ninguna variable de entorno forma parte de las URL consultadas.
 * Solo se imprimen mensajes fijos y contadores propios, nunca texto de la
 * respuesta ni valores de entorno.
 */
const BASE = 'https://sonarcloud.io/api';
const PROYECTO = 'ISCOUTB_AS_202620_Recobra';
const COMMIT = process.env.GITHUB_SHA;
const acotar = (valor, porOmision, minimo, maximo) => {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.min(maximo, Math.max(minimo, n)) : porOmision;
};
const ESPERA_MAXIMA_S = acotar(process.env.ESPERA_MAXIMA_S, 600, 1, 1800);
const INTERVALO_S = acotar(process.env.INTERVALO_S, 10, 1, 60);

const dormir = (s) => new Promise((resolver) => setTimeout(resolver, s * 1000));

async function leer(ruta) {
  const respuesta = await fetch(`${BASE}${ruta}`);
  if (!respuesta.ok) throw new Error(`SonarCloud respondió HTTP ${Number(respuesta.status)}`);
  return respuesta.json();
}

async function buscarAnalisis() {
  const limite = Date.now() + ESPERA_MAXIMA_S * 1000;
  let intentos = 0;
  while (Date.now() < limite) {
    intentos += 1;
    const datos = await leer(`/project_analyses/search?project=${encodeURIComponent(PROYECTO)}&ps=20`);
    const encontrado = (datos.analyses || []).find((a) => a.revision === COMMIT);
    if (encontrado) return encontrado.key;
    console.log(`Esperando el análisis de SonarCloud para el commit (intento ${intentos})...`);
    await dormir(INTERVALO_S);
  }
  return null;
}

(async () => {
  if (!COMMIT) throw new Error('Falta GITHUB_SHA');
  const analisis = await buscarAnalisis();
  if (!analisis) {
    console.error('SonarCloud no publicó el análisis del commit dentro del tiempo de espera');
    process.exit(1);
  }

  // La clave viene de la respuesta de SonarCloud: se exige su forma antes de usarla en una URL.
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(analisis)) throw new Error('Identificador de análisis inesperado');
  const gate = await leer(`/qualitygates/project_status?analysisId=${analisis}`);
  const estado = gate.projectStatus || {};
  const condiciones = estado.conditions || [];
  const falladas = condiciones.filter((c) => c.status !== 'OK').length;
  const aprobado = estado.status === 'OK';
  console.log(`Quality Gate: ${aprobado ? 'aprobado' : 'NO aprobado'} (${condiciones.length} condiciones, ${falladas} fallidas)`);
  process.exit(aprobado ? 0 : 1);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Error al consultar SonarCloud');
  process.exit(1);
});
