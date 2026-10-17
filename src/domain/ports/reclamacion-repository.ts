import { Reclamacion } from '../entities/reclamacion';

/** Puerto de persistencia de reclamaciones (contexto Reclamaciones, dueño único de `reclamaciones`). */
export abstract class ReclamacionRepository {
  /** Inserta o reemplaza por id. */
  abstract guardar(reclamacion: Reclamacion): Promise<Reclamacion>;
  abstract buscarPorId(id: string): Promise<Reclamacion | null>;
  abstract listarPorPublicacion(publicacionId: string): Promise<Reclamacion[]>;
  abstract listarPorReclamante(reclamanteId: string): Promise<Reclamacion[]>;
}
