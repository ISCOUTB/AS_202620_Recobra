import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

export interface DatosCrearPublicacion {
  tipo: TipoPublicacion;
  descripcion: string;
  categoria: string;
  ubicacion: string;
}

/**
 * @Injectable() es un decorador de metadatos de NestJS, no una dependencia
 * de HTTP ni de persistencia: el caso de uso sigue dependiendo únicamente
 * del puerto `PublicacionRepository` (ver ADR-0002). Es lo que permite que
 * Nest resuelva e inyecte el adaptador concreto sin que este archivo sepa
 * cuál es.
 */
@Injectable()
export class CrearPublicacion {
  constructor(private readonly publicacionRepository: PublicacionRepository) {}

  async ejecutar({ tipo, descripcion, categoria, ubicacion }: DatosCrearPublicacion): Promise<Publicacion> {
    const publicacion = new Publicacion({
      id: randomUUID(),
      tipo,
      descripcion,
      categoria,
      ubicacion,
      creadoEn: new Date().toISOString(),
    });

    await this.publicacionRepository.guardar(publicacion);

    return publicacion;
  }
}
