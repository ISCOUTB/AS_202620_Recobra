import { Injectable } from '@nestjs/common';
import { Publicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

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
}
