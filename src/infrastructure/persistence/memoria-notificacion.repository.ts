import { Injectable } from '@nestjs/common';
import { Notificacion } from '../../domain/entities/notificacion';
import { NotificacionRepository } from '../../domain/ports/notificacion-repository';

@Injectable()
export class MemoriaNotificacionRepository extends NotificacionRepository {
  private readonly notificaciones = new Map<string, Notificacion>();

  // Atómico: no hay await entre la comprobación y la escritura.
  async guardarSiNoExiste(notificacion: Notificacion): Promise<boolean> {
    if (this.notificaciones.has(notificacion.id)) return false;
    this.notificaciones.set(notificacion.id, notificacion);
    return true;
  }

  async listarPorCuenta(cuentaId: string, limite: number): Promise<Notificacion[]> {
    return this.deCuenta(cuentaId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .slice(0, limite);
  }

  async contarNoLeidas(cuentaId: string): Promise<number> {
    return this.deCuenta(cuentaId).filter((n) => !n.leida).length;
  }

  async marcarLeida(id: string, cuentaId: string): Promise<boolean> {
    const actual = this.notificaciones.get(id);
    if (!actual || actual.cuentaId !== cuentaId) return false;
    this.notificaciones.set(id, new Notificacion({ ...actual, leida: true }));
    return true;
  }

  async marcarTodasLeidas(cuentaId: string): Promise<void> {
    for (const n of this.deCuenta(cuentaId)) this.notificaciones.set(n.id, new Notificacion({ ...n, leida: true }));
  }

  async eliminarDeCuenta(cuentaId: string): Promise<void> {
    for (const n of this.deCuenta(cuentaId)) this.notificaciones.delete(n.id);
  }

  async eliminarAnterioresA(fecha: string): Promise<number> {
    let borradas = 0;
    for (const [id, n] of this.notificaciones) {
      if (n.creadoEn < fecha) {
        this.notificaciones.delete(id);
        borradas++;
      }
    }
    return borradas;
  }

  private deCuenta(cuentaId: string): Notificacion[] {
    return [...this.notificaciones.values()].filter((n) => n.cuentaId === cuentaId);
  }
}
