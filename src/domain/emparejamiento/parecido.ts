import { Publicacion } from '../entities/publicacion';

/**
 * Parecido entre un objeto perdido y uno encontrado de la misma categoría
 * (ADR-0018). Heurística determinista y explicable (ADR-0007: sin modelo
 * generativo): 50 % el lugar, 30 % las palabras en común de la descripción y
 * 20 % la cercanía de las fechas. Devuelve un valor entre 0 y 1 con dos
 * decimales.
 */
export const PESO_LUGAR = 0.5;
export const PESO_TEXTO = 0.3;
export const PESO_FECHA = 0.2;

/** Por debajo de este parecido no se guarda la coincidencia ni se avisa. */
export const UMBRAL_COINCIDENCIA = 0.3;

const PALABRAS_VACIAS = new Set([
  'con', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'por', 'para', 'que', 'sin', 'muy', 'mas',
  'este', 'esta', 'esto', 'tiene', 'color', 'como',
]);
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Palabras significativas: minúsculas, sin tildes, de 3 letras o más y sin palabras vacías. */
export function palabrasClave(texto: string): Set<string> {
  const normal = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return new Set(normal.split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 3 && !PALABRAS_VACIAS.has(p)));
}

export function parecidoLugar(a: Publicacion, b: Publicacion): number {
  const la = a.ubicacion.trim().toLowerCase();
  const lb = b.ubicacion.trim().toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.6;
  return 0;
}

/** Índice de Jaccard entre las palabras clave de las dos descripciones. */
export function parecidoTexto(a: Publicacion, b: Publicacion): number {
  const pa = palabrasClave(a.descripcion);
  const pb = palabrasClave(b.descripcion);
  if (pa.size === 0 || pb.size === 0) return 0;
  const comunes = [...pa].filter((p) => pb.has(p)).length;
  return comunes / (pa.size + pb.size - comunes);
}

export function parecidoFecha(a: Publicacion, b: Publicacion): number {
  const dias = Math.abs(Date.parse(a.creadoEn) - Date.parse(b.creadoEn)) / MS_POR_DIA;
  if (Number.isNaN(dias)) return 0;
  if (dias <= 2) return 1;
  if (dias <= 7) return 0.6;
  if (dias <= 30) return 0.3;
  return 0;
}

export function calcularParecido(a: Publicacion, b: Publicacion): number {
  const total = PESO_LUGAR * parecidoLugar(a, b) + PESO_TEXTO * parecidoTexto(a, b) + PESO_FECHA * parecidoFecha(a, b);
  return Math.round(Math.min(1, total) * 100) / 100;
}
