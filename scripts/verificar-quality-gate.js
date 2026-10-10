/**
 * Falla el pipeline si el Quality Gate público de SonarCloud no aprueba el
 * commit que se está integrando. No necesita token: SonarCloud analiza cada
 * push (GitHub App o scanner) y publica el resultado en una API de lectura
 * pública. Espera hasta que aparezca el análisis de ESTE commit y entonces
 * decide, así que no valida por error el resultado de un commit anterior.
 *
 * Variables: GITHUB_SHA (commit a verificar), SONAR_PROJECT_KEY,
 * ESPERA_MAXIMA_S (por omisión 600), INTERVALO_S (por omisión 10).
 * Solo se imprimen mensajes fijos y números, nunca texto de la respuesta.
 */
const BASE = 'https://sonarcloud.io/api';
const PROYECTO = process.env.SONAR_PROJECT_KEY || 'ISCOUTB_AS_202620_Recobra';
const COMMIT = process.env.GITHUB_SHA;
const ESPERA_MAXIMA_S = Number(process.env.ESPERA_MAXIMA_S || 600);
const INTERVALO_S = Number(process.env.INTERVALO_S || 10);

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
    console.error(`SonarCloud no publicó el análisis del commit en ${ESPERA_MAXIMA_S} s`);
    process.exit(1);
  }

  const gate = await leer(`/qualitygates/project_status?analysisId=${encodeURIComponent(analisis)}`);
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
