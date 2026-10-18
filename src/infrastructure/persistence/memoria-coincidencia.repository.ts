import { Injectable } from '@nestjs/common';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';

@Injectable()
export class MemoriaCoincidenciaRepository extends CoincidenciaRepository {
  // Por id: guardar dos veces la misma coincidencia (evento repetido) no la duplica.
  private readonly coincidencias = new Map<string, Coincidencia>();

  async guardar(coincidencia: Coincidencia): Promise<Coincidencia> {
    this.coincidencias.set(coincidencia.id, coincidencia);
    return coincidencia;
  }

  async listarCreadasDesde(desde: string, limite: number): Promise<Coincidencia[]> {
    return [...this.coincidencias.values()]
      .filter((c) => c.creadoEn >= desde)
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .slice(0, limite);
  }

  async listarPorPublicacion(publicacionId: string): Promise<Coincidencia[]> {
    return [...this.coincidencias.values()].filter(
      (c) => c.publicacionOrigenId === publicacionId || c.publicacionCoincidenteId === publicacionId,
    );
  }
}
