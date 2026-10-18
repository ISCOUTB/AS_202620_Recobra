/**
 * Catálogo de lugares del campus en dos niveles: el lugar (edificio o zona) y,
 * si aplica, sus niveles sugeridos (pisos o zonas). Es la única fuente de la
 * lista: la vitrina y la app la piden por `GET /lugares` en vez de copiarla.
 *
 * El lugar viaja en `ubicacion` (filtro de búsqueda y emparejamiento) y el
 * piso, zona, salón o punto de referencia en `detalleUbicacion` (solo se
 * muestra). Los niveles son **sugerencias**: la persona puede escribir otro
 * piso, salón o referencia en texto libre, y también un lugar que no esté en
 * la lista ("Otra…"), porque el campus tiene más sitios de los que aquí caben.
 *
 * Datos dados por el equipo (2026-10-18): todos los bloques tienen 4 pisos como
 * mínimo y el A2 llega hasta el quinto; la biblioteca tiene la hemeroteca (sala
 * con revistas y computadores) y 3 pisos, el tercero es la sala de estudio; el
 * Alcatraz tiene 2 pisos.
 */
export interface LugarCampus {
  nombre: string;
  /** Pisos o zonas que se ofrecen como sugerencia; vacío si el lugar no tiene. */
  niveles: string[];
}

const pisos = (cantidad: number): string[] => Array.from({ length: cantidad }, (_, i) => `Piso ${i + 1}`);

export const CATALOGO_LUGARES: readonly LugarCampus[] = [
  { nombre: 'Bloque A1', niveles: pisos(4) },
  { nombre: 'Bloque A2', niveles: pisos(5) },
  { nombre: 'Bloque A3', niveles: pisos(4) },
  { nombre: 'Bloque A4', niveles: pisos(4) },
  { nombre: 'Bloque A5', niveles: pisos(4) },
  { nombre: 'Biblioteca', niveles: ['Hemeroteca', 'Piso 1', 'Piso 2', 'Piso 3 (sala de estudio)'] },
  { nombre: 'Alcatraz', niveles: pisos(2) },
  { nombre: 'El Mesón', niveles: [] },
  { nombre: 'Cafetería central', niveles: [] },
  { nombre: 'Panadería', niveles: [] },
  { nombre: 'Los Bohíos', niveles: [] },
  { nombre: 'Entrada principal', niveles: [] },
  { nombre: 'Gimnasio', niveles: [] },
  { nombre: 'Canchas', niveles: [] },
  { nombre: 'Parqueadero', niveles: [] },
];
