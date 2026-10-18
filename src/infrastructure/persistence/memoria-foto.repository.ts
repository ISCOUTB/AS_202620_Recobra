import { Injectable } from '@nestjs/common';
import { Foto } from '../../domain/entities/foto';
import { FotoRepository } from '../../domain/ports/foto-repository';

@Injectable()
export class MemoriaFotoRepository extends FotoRepository {
  private readonly fotos = new Map<string, Foto>();

  async guardar(foto: Foto): Promise<void> {
    this.fotos.set(foto.publicacionId, foto);
  }

  async buscarPorPublicacion(publicacionId: string): Promise<Foto | null> {
    return this.fotos.get(publicacionId) ?? null;
  }

  async eliminar(publicacionId: string): Promise<boolean> {
    return this.fotos.delete(publicacionId);
  }

  async listarPublicacionIds(limite: number): Promise<string[]> {
    return [...this.fotos.values()]
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .slice(0, limite)
      .map((f) => f.publicacionId);
  }
}
