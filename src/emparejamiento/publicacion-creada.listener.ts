import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Publicacion } from '../domain/entities/publicacion';
import { BuscarCoincidencias } from '../application/use-cases/buscar-coincidencias';
import { PUBLICACION_CREADA } from '../application/events/publicacion-creada.event';

@Injectable()
export class PublicacionCreadaListener {
  private readonly logger = new Logger(PublicacionCreadaListener.name);

  constructor(private readonly buscarCoincidencias: BuscarCoincidencias) {}

  @OnEvent(PUBLICACION_CREADA, { async: true })
  async manejar(publicacion: Publicacion): Promise<void> {
    const encontradas = await this.buscarCoincidencias.ejecutar(publicacion);
    if (encontradas.length > 0) {
      this.logger.log(
        `${encontradas.length} coincidencia(s) detectada(s) para ${publicacion.id}`,
        'Emparejamiento',
      );
    }
  }
}
