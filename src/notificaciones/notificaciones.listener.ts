import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Notificar } from '../application/use-cases/notificaciones';
import { ProcesadorDeEventos } from '../application/use-cases/entrega-de-eventos';
import {
  COINCIDENCIA_DETECTADA,
  EventoDominio,
  PUBLICACION_MODERADA,
  RECLAMACION_CREADA,
  RECLAMACION_RESUELTA,
} from '../application/events/eventos-dominio';

/**
 * Escucha los eventos de Emparejamiento, Reclamaciones y Moderación y genera
 * avisos (ADR-0015). Es asíncrono y no bloqueante: la operación que emitió el
 * evento ya respondió. Cada evento se entrega con reintentos y, si no hay caso,
 * pasa a la cola de fallidos (ADR-0026); nunca tumba el proceso.
 */
@Injectable()
export class NotificacionesListener {
  constructor(
    private readonly notificar: Notificar,
    private readonly procesador: ProcesadorDeEventos,
  ) {}

  @OnEvent(COINCIDENCIA_DETECTADA, { async: true })
  alDetectarCoincidencia(evento: EventoDominio): Promise<unknown> {
    return this.entregar(evento);
  }

  @OnEvent(RECLAMACION_CREADA, { async: true })
  alCrearReclamacion(evento: EventoDominio): Promise<unknown> {
    return this.entregar(evento);
  }

  @OnEvent(RECLAMACION_RESUELTA, { async: true })
  alResolverReclamacion(evento: EventoDominio): Promise<unknown> {
    return this.entregar(evento);
  }

  @OnEvent(PUBLICACION_MODERADA, { async: true })
  alModerar(evento: EventoDominio): Promise<unknown> {
    return this.entregar(evento);
  }

  private entregar(evento: EventoDominio): Promise<unknown> {
    return this.procesador.procesar(evento, (e) => this.notificar.procesar(e));
  }
}
