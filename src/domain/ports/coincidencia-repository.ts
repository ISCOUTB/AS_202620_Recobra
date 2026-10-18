import { Coincidencia } from '../entities/coincidencia';

export abstract class CoincidenciaRepository {
  abstract guardar(coincidencia: Coincidencia): Promise<Coincidencia>;
  abstract listarPorPublicacion(publicacionId: string): Promise<Coincidencia[]>;
  /** Coincidencias detectadas desde `desde`, las más antiguas primero; las usa la conciliación de avisos (ADR-0024). */
  abstract listarCreadasDesde(desde: string, limite: number): Promise<Coincidencia[]>;
}
