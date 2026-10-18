import { Injectable } from '@nestjs/common';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';

@Injectable()
export class MemoriaReclamacionRepository extends ReclamacionRepository {
  private readonly reclamaciones = new Map<string, Reclamacion>();

  async guardar(reclamacion: Reclamacion): Promise<Reclamacion> {
    this.reclamaciones.set(reclamacion.id, reclamacion);
    return reclamacion;
  }

  async buscarPorId(id: string): Promise<Reclamacion | null> {
    return this.reclamaciones.get(id) ?? null;
  }

  async listarPorPublicacion(publicacionId: string): Promise<Reclamacion[]> {
    return this.ordenar([...this.reclamaciones.values()].filter((r) => r.publicacionId === publicacionId));
  }

  async listarPorReclamante(reclamanteId: string): Promise<Reclamacion[]> {
    return this.ordenar([...this.reclamaciones.values()].filter((r) => r.reclamanteId === reclamanteId));
  }

  async listarAbiertas(limite: number): Promise<Reclamacion[]> {
    return [...this.reclamaciones.values()]
      .filter((r) => r.estado === 'pendiente' || (r.estado === 'aprobada' && !r.entregadaEn))
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .slice(0, limite);
  }

  private ordenar(lista: Reclamacion[]): Reclamacion[] {
    return lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }
}
