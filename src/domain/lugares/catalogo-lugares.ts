/**
 * Catálogo de lugares del campus en dos niveles: el lugar (edificio o zona) y,
 * si aplica, sus niveles (pisos). Es la única fuente de la lista: la vitrina y
 * la app la piden por `GET /lugares` en vez de copiarla.
 *
 * El lugar viaja en `ubicacion` (filtro de búsqueda y emparejamiento) y el
 * piso, salón o punto de referencia en `detalleUbicacion` (solo se muestra).
 * Una publicación puede usar un lugar fuera del catálogo ("Otra…").
 *
 * PENDIENTE DEL EQUIPO: confirmar en el campus cuántos pisos tiene cada
 * edificio; los niveles de abajo son una primera versión.
 */
export interface LugarCampus {
  nombre: string;
  /** Niveles que se ofrecen como submenú; vacío si el lugar no tiene pisos. */
  niveles: string[];
}

const pisos = (cantidad: number): string[] => Array.from({ length: cantidad }, (_, i) => `Piso ${i + 1}`);

export const CATALOGO_LUGARES: readonly LugarCampus[] = [
  { nombre: 'Bloque A1', niveles: pisos(4) },
  { nombre: 'Bloque A2', niveles: pisos(4) },
  { nombre: 'Bloque A3', niveles: pisos(4) },
  { nombre: 'Bloque A4', niveles: pisos(4) },
  { nombre: 'Bloque A5', niveles: pisos(4) },
  { nombre: 'Biblioteca', niveles: pisos(3) },
  { nombre: 'Entrada principal', niveles: [] },
  { nombre: 'Cafetería central', niveles: [] },
];
