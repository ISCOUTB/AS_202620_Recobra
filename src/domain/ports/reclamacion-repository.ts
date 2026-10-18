import { Reclamacion } from '../entities/reclamacion';

/** Puerto de persistencia de reclamaciones (contexto Reclamaciones, dueño único de `reclamaciones`). */
export abstract class ReclamacionRepository {
  /** Inserta o reemplaza por id. */
  abstract guardar(reclamacion: Reclamacion): Promise<Reclamacion>;
  abstract buscarPorId(id: string): Promise<Reclamacion | null>;
  abstract listarPorPublicacion(publicacionId: string): Promise<Reclamacion[]>;
  abstract listarPorReclamante(reclamanteId: string): Promise<Reclamacion[]>;

  /**
   * Reclamaciones que todavía no terminaron: pendientes y aprobadas sin entrega
   * confirmada. Son pocas (duran lo que dura una revisión o una entrega) y es
   * lo que recorre el reconciliador (ADR-0020).
   */
  abstract listarAbiertas(limite: number): Promise<Reclamacion[]>;

  /** Reemplaza el texto de las pruebas de un reclamante (al eliminar su cuenta) y dice cuántas. */
  abstract anonimizarPruebasDe(reclamanteId: string): Promise<number>;
}
