import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { PUBLICACION_CREADA } from '../events/publicacion-creada.event';

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
  constructor(
    private readonly publicacionRepository: PublicacionRepository,
    private readonly eventos: EventEmitter2,
  ) {}

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

    // Disparo asíncrono, sin esperar (ADR-0004): a Emparejamiento le llega
    // el evento, pero quien crea la publicación no espera su resultado.
    this.eventos.emit(PUBLICACION_CREADA, publicacion);

    return publicacion;
  }
}
