import { Coincidencia } from '../entities/coincidencia';

export abstract class CoincidenciaRepository {
  abstract guardar(coincidencia: Coincidencia): Promise<Coincidencia>;
  abstract listarPorPublicacion(publicacionId: string): Promise<Coincidencia[]>;
}
