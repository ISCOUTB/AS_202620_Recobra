import { Publicacion, TipoPublicacion } from '../entities/publicacion';

export interface FiltrosBusqueda {
  tipo?: TipoPublicacion;
  /** Comparación exacta, sin distinguir mayúsculas ni espacios de borde. */
  categoria?: string;
  /** Comparación exacta, sin distinguir mayúsculas ni espacios de borde. */
  ubicacion?: string;
  /** Máximo de resultados, ya validado por el caso de uso (1..50). */
  limite: number;
}

/**
 * Puerto de persistencia para publicaciones.
 * Se declara como clase abstracta (y no como `interface`) a propósito:
 * las interfaces de TypeScript desaparecen en tiempo de compilación y no
 * sirven como token de inyección de dependencias de NestJS, mientras que
 * una clase abstracta sí. Esto es lo que permite que `application/` (los
 * casos de uso) dependa únicamente de este puerto, y que Nest resuelva en
 * tiempo de ejecución qué adaptador concreto lo implementa (ver
 * PublicacionesModule).
 */
export abstract class PublicacionRepository {
  abstract guardar(publicacion: Publicacion): Promise<Publicacion>;
  abstract buscarPorId(id: string): Promise<Publicacion | null>;
  /**
   * Usado por Emparejamiento (contexto de soporte) para buscar candidatos de
   * coincidencia — lectura, nunca escritura, ver docs/context-map.md.
   */
  abstract listarPorTipo(tipo: TipoPublicacion): Promise<Publicacion[]>;
  /**
   * Búsqueda con filtros del escenario S1 (ADR-0008). Solo lectura; devuelve
   * las más recientes primero, hasta `filtros.limite`.
   */
  abstract buscar(filtros: FiltrosBusqueda): Promise<Publicacion[]>;
}
