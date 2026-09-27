import { Injectable } from '@nestjs/common';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';

@Injectable()
export class MemoriaCoincidenciaRepository extends CoincidenciaRepository {
  private readonly coincidencias: Coincidencia[] = [];

  async guardar(coincidencia: Coincidencia): Promise<Coincidencia> {
    this.coincidencias.push(coincidencia);
    return coincidencia;
  }

  async listarPorPublicacion(publicacionId: string): Promise<Coincidencia[]> {
    return this.coincidencias.filter(
      (c) => c.publicacionOrigenId === publicacionId || c.publicacionCoincidenteId === publicacionId,
    );
  }
}
