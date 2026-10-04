import { Injectable } from '@nestjs/common';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { FiltrosBusqueda, PublicacionRepository } from '../../domain/ports/publicacion-repository';

@Injectable()
export class MemoriaPublicacionRepository extends PublicacionRepository {
  private readonly publicaciones = new Map<string, Publicacion>();

  async guardar(publicacion: Publicacion): Promise<Publicacion> {
    this.publicaciones.set(publicacion.id, publicacion);
    return publicacion;
  }

  async buscarPorId(id: string): Promise<Publicacion | null> {
    return this.publicaciones.get(id) ?? null;
  }

  async listarPorTipo(tipo: TipoPublicacion): Promise<Publicacion[]> {
    return [...this.publicaciones.values()].filter((p) => p.tipo === tipo);
  }

  async buscar({ tipo, categoria, ubicacion, limite }: FiltrosBusqueda): Promise<Publicacion[]> {
    return [...this.publicaciones.values()]
      .filter((p) => !tipo || p.tipo === tipo)
      .filter((p) => !categoria || p.categoria.trim().toLowerCase() === categoria)
      .filter((p) => !ubicacion || p.ubicacion.trim().toLowerCase() === ubicacion)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .slice(0, limite);
  }
}
