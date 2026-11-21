#!/usr/bin/env node
/**
 * Verificación automática de la documentación (criterio «Coherencia y trazabilidad»):
 *
 * 1. Todo enlace relativo de los Markdown del repositorio (README, correcciones y docs/) apunta a un
 *    archivo o carpeta que existe; si lleva `#ancla` hacia otro Markdown, ese encabezado existe.
 * 2. Los ADR siguen la convención `NNNN-titulo-en-kebab-case.md`, sin números repetidos, y cada uno
 *    tiene una sección «Estado».
 * 3. Todo ADR aparece en arc42 §9 (la sección de decisiones), para que se pueda recorrer la evolución.
 *
 * Sale con código 1 y lista cada problema si algo falla. Sin dependencias: solo Node.
 */
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const problemas = [];

/**
 * Enlaces rotos dentro de ADR ya aceptados: la regla de ADR-0011 prohíbe editarlos, así que se
 * registran aquí con su motivo en vez de corregirlos. Cada entrada es «archivo → destino».
 */
const ENLACES_HISTORICOS = new Set([
  // La carpeta docs/calidad/ se creó después; el escenario ahora vive en docs/calidad/escenarios_calidad.md.
  'docs/adr/0003-reto-corte1-stack-obligatorio.md → ../escenarios_calidad.md',
]);

function markdownsDe(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) return markdownsDe(ruta);
    return e.name.endsWith('.md') ? [ruta] : [];
  });
}

/** Ancla como la genera GitHub: minúsculas, sin puntuación (conserva letras con tilde, `-` y `_`), espacios a `-`. */
function ancla(titulo) {
  return titulo
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

const cacheAnclas = new Map();
function anclasDe(archivo) {
  if (!cacheAnclas.has(archivo)) {
    const vistas = new Map();
    const anclas = new Set();
    let enCodigo = false;
    for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      if (/^\s*```/.test(linea)) enCodigo = !enCodigo;
      const m = !enCodigo && /^#{1,6}\s+(.*)$/.exec(linea);
      if (!m) continue;
      const base = ancla(m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'));
      const n = vistas.get(base) ?? 0;
      vistas.set(base, n + 1);
      anclas.add(n === 0 ? base : `${base}-${n}`);
    }
    cacheAnclas.set(archivo, anclas);
  }
  return cacheAnclas.get(archivo);
}

function revisarEnlaces(archivo) {
  const texto = fs.readFileSync(archivo, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const m of texto.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const destino = m[1];
    if (/^(https?:|mailto:)/.test(destino)) continue;
    const [rutaCodificada, fragmento] = destino.split('#');
    const relativo = path.relative(raiz, archivo).split(path.sep).join('/');
    if (ENLACES_HISTORICOS.has(`${relativo} → ${rutaCodificada}`)) continue;
    let ruta;
    try {
      ruta = rutaCodificada ? path.resolve(path.dirname(archivo), decodeURIComponent(rutaCodificada)) : archivo;
    } catch {
      problemas.push(`${relativo}: enlace mal formado «${destino}»`);
      continue;
    }
    if (!fs.existsSync(ruta)) {
      problemas.push(`${relativo}: el enlace «${destino}» apunta a un archivo que no existe`);
      continue;
    }
    if (fragmento && ruta.endsWith('.md') && !/^L\d+/.test(fragmento)) {
      if (!anclasDe(ruta).has(decodeURIComponent(fragmento).toLowerCase())) {
        problemas.push(`${relativo}: el enlace «${destino}» apunta a un encabezado que no existe`);
      }
    }
  }
}

const archivos = [
  path.join(raiz, 'README.md'),
  path.join(raiz, 'correcciones.md'),
  ...markdownsDe(path.join(raiz, 'docs')),
].filter((a) => fs.existsSync(a));
archivos.forEach(revisarEnlaces);

// ADR: convención de nombre, números únicos, sección de estado y presencia en arc42 §9.
const carpetaAdr = path.join(raiz, 'docs', 'adr');
const adrs = fs.readdirSync(carpetaAdr).filter((n) => n.endsWith('.md'));
const numeros = new Set();
const arc42 = fs.readFileSync(path.join(raiz, 'docs', 'arc42', 'arc42.md'), 'utf8');
const seccion9 = arc42.slice(arc42.indexOf('## 9.'), arc42.indexOf('## 10.'));
for (const nombre of adrs) {
  const m = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.exec(nombre);
  if (!m) {
    problemas.push(`docs/adr/${nombre}: no sigue la convención NNNN-titulo-en-kebab-case.md`);
    continue;
  }
  if (numeros.has(m[1])) problemas.push(`docs/adr/${nombre}: número de ADR repetido (${m[1]})`);
  numeros.add(m[1]);
  if (!/^## Estado\s*$/m.test(fs.readFileSync(path.join(carpetaAdr, nombre), 'utf8'))) {
    problemas.push(`docs/adr/${nombre}: le falta la sección «## Estado»`);
  }
  if (!seccion9.includes(`ADR-${m[1]}`)) {
    problemas.push(`docs/arc42/arc42.md §9: no menciona ADR-${m[1]}`);
  }
}

if (problemas.length > 0) {
  console.error(`Documentación: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`Documentación verificada: ${archivos.length} archivos Markdown, ${adrs.length} ADR, sin enlaces rotos.`);
