#!/usr/bin/env node
/**
 * Barrido de secretos del repositorio y de todo su historial (docs/seguridad/barrido-de-secretos.md,
 * ADR-0030). El repositorio es público: quitar un secreto del último commit no lo
 * quita del historial, así que se revisan todas las líneas que alguna vez se
 * agregaron, en todas las ramas.
 *
 * Busca firmas de alta confianza (llaves de nube, claves privadas, tokens de
 * GitHub y de Slack, llaves de API, cadenas de conexión con contraseña,
 * contraseñas literales) y archivos sensibles. Las contraseñas de las cuentas
 * de PRUEBA locales están en la lista de excepciones de abajo, con su motivo.
 * Sale con 1 si encuentra algo.
 *
 * Uso: node scripts/barrido-secretos.js [--repo <carpeta>]
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const argRepo = process.argv.indexOf('--repo');
const REPO = argRepo >= 0 ? path.resolve(process.argv[argRepo + 1]) : path.join(__dirname, '..');

const FIRMAS = [
  ['llave de acceso de AWS', /AKIA[0-9A-Z]{16}/],
  ['clave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['token de GitHub', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|github_pat_\w{22,}/],
  ['token de Slack', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['llave de API (sk-)', /\bsk-[A-Za-z0-9]{20,}/],
  ['cadena de conexión con contraseña', /\bpostgres(?:ql)?:\/\/[^:@/\s]+:[^@/\s]{4,}@/i],
  ['contraseña o secreto literal', /\b(?:password|passwd|secret|api_?key|token)["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i],
];

/** Lo que parece secreto pero no lo es, con el motivo. Se revisa a mano antes de agregar algo aquí. */
const EXCEPCIONES = [
  [/contrasena(-[a-z]+)*-?\d*|clave-local|contrasena-segura/i, 'contraseñas de cuentas de PRUEBA locales (pruebas y comandos de ejemplo), sin acceso a nada'],
  [/token-viejo|tok-\d+|token-de-prueba|token-123/i, 'tokens de sesión inventados en las pruebas de la app, sin valor fuera de ellas'],
  [/ejemplo|example|xxxx|\*{3,}|<[^>]{0,40}(?:contrase|clave|password)[^>]{0,40}>|desde-el-panel/i, 'marcadores de posición en la documentación'],
  [/postgres(?:ql)?:\/\/postgres@localhost/i, 'base efímera del flujo de integración, sin contraseña (trust)'],
];

const ARCHIVOS_SENSIBLES = [
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.(?!example$)[a-z]+$/i,
  /\.(pem|p12|jks|keystore)$/i,
  /(^|\/)id_(rsa|dsa|ed25519)$/i,
  /google-services\.json$/i,
];

const esArchivoSensible = (nombre) => ARCHIVOS_SENSIBLES.some((patron) => patron.test(nombre));

function excepcion(linea) {
  return EXCEPCIONES.find(([patron]) => patron.test(linea));
}

async function barrerHistorial() {
  const hallazgos = [];
  let commit = '(sin commit)';
  let archivo = '';
  await new Promise((resolver, rechazar) => {
    const git = spawn('git', ['-C', REPO, 'log', '--all', '-p', '--no-color', '--format=@@commit %H'], { maxBuffer: Infinity }); // NOSONAR S4036: herramienta de desarrollo; git se busca en el PATH del ejecutor, nombre fijo
    let resto = '';
    const procesar = (linea) => {
      if (linea.startsWith('@@commit ')) commit = linea.slice(9, 16);
      else if (linea.startsWith('+++ b/')) archivo = linea.slice(6);
      else if (linea.startsWith('+') && !linea.startsWith('+++')) {
        for (const [nombre, patron] of FIRMAS) {
          if (patron.test(linea) && !excepcion(linea)) hallazgos.push({ commit, archivo, nombre, linea: linea.slice(1, 90) });
        }
      }
    };
    git.stdout.on('data', (trozo) => {
      const lineas = (resto + trozo.toString('utf-8')).split('\n');
      resto = lineas.pop();
      lineas.forEach(procesar);
    });
    git.on('error', rechazar);
    git.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error(`git log terminó con ${codigo}`))));
  });
  return hallazgos;
}

function archivosSensibles() {
  const r = spawnSync('git', ['-C', REPO, 'log', '--all', '--name-only', '--pretty=format:'], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }); // NOSONAR S4036: igual que arriba
  return [...new Set(r.stdout.split('\n').filter(Boolean))].filter(esArchivoSensible);
}

async function main() {
  const commits = spawnSync('git', ['-C', REPO, 'rev-list', '--all', '--count'], { encoding: 'utf-8' }).stdout.trim(); // NOSONAR S4036: igual que arriba
  const hallazgos = await barrerHistorial();
  const sensibles = archivosSensibles();
  console.log(`Barrido de ${commits} commits (todas las ramas): ${FIRMAS.length} firmas, ${EXCEPCIONES.length} excepciones revisadas.`);
  for (const h of hallazgos) console.error(`  SECRETO? ${h.commit} ${h.archivo}: ${h.nombre} -> ${h.linea}`);
  for (const f of sensibles) console.error(`  ARCHIVO SENSIBLE alguna vez versionado: ${f}`);
  if (hallazgos.length + sensibles.length > 0) {
    console.error('\nSe encontró algo. Si es una credencial real: rótala YA (quitarla del último commit no la quita del historial) y avisa al equipo el mismo día.');
    process.exit(1);
  }
  console.log('Sin credenciales en el árbol ni en el historial.');
}

main().catch((e) => {
  console.error(`No se pudo ejecutar el barrido: ${e.message}`);
  process.exit(2);
});
