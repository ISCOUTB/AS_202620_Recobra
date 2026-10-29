#!/usr/bin/env node
/**
 * Análisis de dependencias con decisiones revisadas (docs/seguridad/analisis-de-dependencias.md,
 * ADR-0030). Hace dos consultas y las compara con el registro de decisiones
 * `docs/seguridad/hallazgos-dependencias.json`:
 *
 *   1. npm audit de las dependencias de PRODUCCIÓN (lo que lleva la imagen);
 *   2. OSV (osv.dev) para las dependencias de la app Flutter (`mobile/pubspec.lock`).
 *
 * Falla (código 1) si:
 *   - aparece un aviso que NO está en el registro (un hallazgo nuevo sin revisar);
 *   - una decisión de aceptación ya venció (`venceEn`): hay que revisarla de nuevo;
 *   - una entrada del registro no tiene decisión, alcance o fecha.
 * Un hallazgo del registro que ya no aparece solo se avisa: se puede quitar.
 *
 * Uso: node scripts/revisar-dependencias.js [--sin-red]   (--sin-red omite OSV)
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const REGISTRO = path.join(RAIZ, 'docs', 'seguridad', 'hallazgos-dependencias.json');
const DECISIONES = new Set(['aceptado', 'mitigado', 'pendiente-de-actualizacion']);
const sinRed = process.argv.includes('--sin-red');
const hoy = (process.env.HOY ?? new Date().toISOString()).slice(0, 10);

function auditoriaNpm() {
  const r = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd: RAIZ, encoding: 'utf-8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 }); // NOSONAR S4036: herramienta de desarrollo; npm se busca en el PATH del ejecutor del flujo, nombre fijo y sin entrada externa
  // npm audit sale con 1 si hay hallazgos: el resultado útil está en stdout.
  const datos = JSON.parse(r.stdout);
  if (datos.error) throw new Error(`npm audit falló: ${datos.error.summary ?? JSON.stringify(datos.error)}`);
  const avisos = new Map();
  for (const [paquete, v] of Object.entries(datos.vulnerabilities ?? {})) {
    for (const via of v.via) {
      if (typeof via === 'object' && via.url) {
        const id = via.url.split('/').pop();
        avisos.set(id, { id, paquete: via.name ?? paquete, severidad: via.severity, titulo: via.title, origen: 'npm' });
      }
    }
  }
  return { avisos, resumen: datos.metadata?.vulnerabilities ?? {} };
}

function paquetesDePub() {
  const texto = fs.readFileSync(path.join(RAIZ, 'mobile', 'pubspec.lock'), 'utf-8').replaceAll('\r\n', '\n');
  const cuerpo = texto.split('packages:\n')[1].split('\nsdks:')[0];
  const paquetes = [];
  for (const m of cuerpo.matchAll(/^ {2}(\S+):\n((?: {4}.*\n?)+)/gm)) {
    const version = /version: "?([^"\n]+)"?/.exec(m[2]);
    const fuente = /source: (\w+)/.exec(m[2]);
    if (version && fuente?.[1] === 'hosted') paquetes.push({ nombre: m[1], version: version[1] });
  }
  return paquetes;
}

async function auditoriaPub() {
  const paquetes = paquetesDePub();
  const respuesta = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries: paquetes.map((p) => ({ package: { name: p.nombre, ecosystem: 'Pub' }, version: p.version })) }),
  });
  if (!respuesta.ok) throw new Error(`OSV respondió ${respuesta.status}`);
  const { results } = await respuesta.json();
  const avisos = new Map();
  results.forEach((r, i) => {
    for (const v of r.vulns ?? []) avisos.set(v.id, { id: v.id, paquete: paquetes[i].nombre, severidad: 'desconocida', titulo: '(ver osv.dev)', origen: 'pub' });
  });
  return { avisos, total: paquetes.length };
}

function leerRegistro() {
  const registro = JSON.parse(fs.readFileSync(REGISTRO, 'utf-8'));
  const problemas = [];
  for (const h of registro.hallazgos) {
    for (const campo of ['id', 'paquete', 'decision', 'alcance', 'venceEn']) {
      if (!h[campo]) problemas.push(`${h.id ?? '(sin id)'}: falta "${campo}" en el registro`);
    }
    if (h.decision && !DECISIONES.has(h.decision)) problemas.push(`${h.id}: decisión "${h.decision}" no válida (${[...DECISIONES].join(', ')})`);
  }
  return { registro, problemas };
}

async function main() {
  const { registro, problemas } = leerRegistro();
  const porId = new Map(registro.hallazgos.map((h) => [h.id, h]));
  const npm = auditoriaNpm();
  let pub = { avisos: new Map(), total: 0 };
  if (!sinRed) pub = await auditoriaPub();
  const todos = [...npm.avisos.values(), ...pub.avisos.values()];

  const sinRevisar = todos.filter((a) => !porId.has(a.id));
  const vencidos = todos.filter((a) => porId.has(a.id) && porId.get(a.id).venceEn < hoy);
  const ya_no_aparecen = registro.hallazgos.filter((h) => !todos.some((a) => a.id === h.id));

  console.log(`Dependencias de producción (npm): ${JSON.stringify(npm.resumen)}`);
  const resumenPub = sinRed ? 'omitida (--sin-red)' : `${pub.total} paquetes, ${pub.avisos.size} con avisos`;
  console.log(`Aplicación Flutter (OSV): ${resumenPub}`);
  console.log(`Avisos encontrados: ${todos.length} · revisados en el registro: ${todos.length - sinRevisar.length} · registro del ${registro.revisadoEn}`);
  for (const a of todos.filter((x) => porId.has(x.id))) {
    const h = porId.get(a.id);
    console.log(`  ok   ${a.id}  ${a.paquete.padEnd(14)} ${String(a.severidad).padEnd(8)} ${h.decision} (vence ${h.venceEn})`);
  }
  for (const h of ya_no_aparecen) console.log(`  aviso: ${h.id} (${h.paquete}) ya no aparece; se puede quitar del registro`);

  let fallo = false;
  for (const p of problemas) {
    console.error(`  ERROR ${p}`);
    fallo = true;
  }
  for (const a of sinRevisar) {
    console.error(`  ERROR hallazgo SIN REVISAR: ${a.id} ${a.paquete} (${a.severidad}) ${a.titulo}\n        https://github.com/advisories/${a.id}`);
    fallo = true;
  }
  for (const a of vencidos) {
    console.error(`  ERROR decisión VENCIDA el ${porId.get(a.id).venceEn}: ${a.id} ${a.paquete}; revisarla de nuevo`);
    fallo = true;
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const filas = todos.map((a) => `| ${a.id} | ${a.paquete} | ${a.severidad} | ${porId.get(a.id)?.decision ?? '**SIN REVISAR**'} | ${porId.get(a.id)?.venceEn ?? ''} |`);
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Análisis de dependencias\n\nnpm (producción): ${JSON.stringify(npm.resumen)}\n\n| Aviso | Paquete | Severidad | Decisión | Vence |\n|---|---|---|---|---|\n${filas.join('\n')}\n`,
    );
  }
  if (fallo) {
    console.error('\nEl análisis de dependencias NO pasa. Corrige el hallazgo o regístralo con su decisión en docs/seguridad/hallazgos-dependencias.json.');
    process.exit(1);
  }
  console.log('\nEl análisis de dependencias pasa: todo hallazgo está revisado y vigente.');
}

main().catch((e) => {
  console.error(`No se pudo ejecutar el análisis: ${e.message}`);
  process.exit(2);
});
