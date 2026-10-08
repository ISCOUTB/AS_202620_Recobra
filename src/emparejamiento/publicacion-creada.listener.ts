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
    try {
      const encontradas = await this.buscarCoincidencias.ejecutar(publicacion);
      if (encontradas.length > 0) {
        this.logger.log(
          `${encontradas.length} coincidencia(s) detectada(s) para ${publicacion.id}`,
          'Emparejamiento',
        );
      }
    } catch {
      // El emparejamiento es asíncrono y no bloqueante (ADR-0004): si falla
      // (p. ej. el almacenamiento no responde) no debe afectar a quien publicó
      // ni tumbar el proceso.
      this.logger.warn(`No se pudo calcular coincidencias para ${publicacion.id}`, 'Emparejamiento');
    }
  }
}
