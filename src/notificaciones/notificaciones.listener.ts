import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notificar } from '../application/use-cases/notificaciones';
import {
  COINCIDENCIA_DETECTADA,
  CoincidenciaDetectada,
  EventoReclamacion,
  RECLAMACION_CREADA,
  RECLAMACION_RESUELTA,
} from '../application/events/eventos-dominio';

/**
 * Escucha los eventos de Emparejamiento y Reclamaciones y genera avisos
 * (ADR-0015). Es asíncrono y no bloqueante: un fallo aquí se registra, pero
 * no afecta a la operación que emitió el evento.
 */
@Injectable()
export class NotificacionesListener {
  private readonly logger = new Logger(NotificacionesListener.name);

  constructor(private readonly notificar: Notificar) {}

  @OnEvent(COINCIDENCIA_DETECTADA, { async: true })
  async alDetectarCoincidencia(coincidencia: CoincidenciaDetectada): Promise<void> {
    await this.seguro(() => this.notificar.porCoincidencia(coincidencia));
  }

  @OnEvent(RECLAMACION_CREADA, { async: true })
  async alCrearReclamacion({ reclamacion, publicacion }: EventoReclamacion): Promise<void> {
    await this.seguro(() => this.notificar.porReclamacionCreada(reclamacion, publicacion));
  }

  @OnEvent(RECLAMACION_RESUELTA, { async: true })
  async alResolverReclamacion({ reclamacion, publicacion }: EventoReclamacion): Promise<void> {
    await this.seguro(() => this.notificar.porReclamacionResuelta(reclamacion, publicacion));
  }

  private async seguro(tarea: () => Promise<unknown>): Promise<void> {
    try {
      await tarea();
    } catch {
      this.logger.warn('No se pudo generar una notificación', 'Notificaciones');
    }
  }
}
