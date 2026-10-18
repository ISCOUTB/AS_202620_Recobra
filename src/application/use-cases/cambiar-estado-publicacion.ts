import { Injectable } from '@nestjs/common';
import { EstadoPublicacion, Publicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

/**
 * Única puerta para cambiar el estado de una publicación (contexto
 * Publicaciones, dueño del dato). Reclamaciones lo usa en vez de escribir la
 * tabla `publicaciones`, para respetar la regla de dueño único
 * (docs/modulo-datos.md). Exige una transición válida del ciclo de vida y la
 * aplica solo si el estado sigue siendo el esperado.
 */
@Injectable()
export class CambiarEstadoPublicacion {
  constructor(private readonly publicaciones: PublicacionRepository) {}

  /** `reclamacionAprobadaId`: al pasar a "por_entregar", qué reclamación se aprobó (ADR-0020). */
  async ejecutar(id: string, de: EstadoPublicacion, a: EstadoPublicacion, reclamacionAprobadaId?: string): Promise<boolean> {
    Publicacion.exigirTransicion(de, a);
    return this.publicaciones.cambiarEstado(id, de, a, reclamacionAprobadaId);
  }
}

/** Publicaciones de la cuenta que consulta (para gestionar sus reclamaciones). */
@Injectable()
export class ListarPublicacionesDeAutor {
  constructor(private readonly publicaciones: PublicacionRepository) {}

  ejecutar(autorId: string): Promise<Publicacion[]> {
    return this.publicaciones.listarPorAutor(autorId);
  }
}
