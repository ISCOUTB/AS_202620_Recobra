import { EventoFallido } from '../entities/evento-fallido';

/** Puerto de la cola de eventos fallidos / dead-letter queue, DLQ (contexto Notificaciones, dueño único de `eventos_fallidos`). */
export abstract class EventoFallidoRepository {
  /** Inserta o reemplaza por id (el id del evento). */
  abstract guardar(evento: EventoFallido): Promise<void>;
  abstract buscarPorId(id: string): Promise<EventoFallido | null>;
  /** Los pendientes de reproceso, los más antiguos primero. */
  abstract listarPendientes(limite: number): Promise<EventoFallido[]>;
  /** Borra los creados antes de `fecha` y dice cuántos (retención). */
  abstract eliminarAnterioresA(fecha: string): Promise<number>;
}
