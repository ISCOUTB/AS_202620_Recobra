import { Injectable } from '@nestjs/common';
import { EventoFallido } from '../../domain/entities/evento-fallido';
import { EventoFallidoRepository } from '../../domain/ports/evento-fallido-repository';

@Injectable()
export class MemoriaEventoFallidoRepository extends EventoFallidoRepository {
  private readonly eventos = new Map<string, EventoFallido>();

  async guardar(evento: EventoFallido): Promise<void> {
    this.eventos.set(evento.id, evento);
  }

  async buscarPorId(id: string): Promise<EventoFallido | null> {
    return this.eventos.get(id) ?? null;
  }

  async listarPendientes(limite: number): Promise<EventoFallido[]> {
    return [...this.eventos.values()]
      .filter((e) => e.estado === 'pendiente')
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .slice(0, limite);
  }

  async eliminarAnterioresA(fecha: string): Promise<number> {
    let borrados = 0;
    for (const e of this.eventos.values()) {
      if (e.creadoEn < fecha) {
        this.eventos.delete(e.id);
        borrados++;
      }
    }
    return borrados;
  }
}
