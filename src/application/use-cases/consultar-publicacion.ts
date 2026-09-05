import { Injectable } from '@nestjs/common';
import { Publicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

@Injectable()
export class ConsultarPublicacion {
  constructor(private readonly publicacionRepository: PublicacionRepository) {}

  async ejecutar({ id }: { id: string }): Promise<Publicacion | null> {
    return this.publicacionRepository.buscarPorId(id);
  }
}
