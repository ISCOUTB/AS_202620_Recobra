import { Notificacion } from '../entities/notificacion';

/** Puerto de persistencia de notificaciones (contexto Notificaciones, dueño único de `notificaciones`). */
export abstract class NotificacionRepository {
  /** Inserta solo si no existe una con el mismo id; dice si la insertó. */
  abstract guardarSiNoExiste(notificacion: Notificacion): Promise<boolean>;
  /** Las más recientes primero. */
  abstract listarPorCuenta(cuentaId: string, limite: number): Promise<Notificacion[]>;
  abstract contarNoLeidas(cuentaId: string): Promise<number>;
  /** Marca como leída solo si es de esa cuenta; dice si la encontró. */
  abstract marcarLeida(id: string, cuentaId: string): Promise<boolean>;
  abstract marcarTodasLeidas(cuentaId: string): Promise<void>;
  abstract eliminarDeCuenta(cuentaId: string): Promise<void>;
  /** Borra los avisos creados antes de `fecha` y dice cuántos (retención, ADR-0021). */
  abstract eliminarAnterioresA(fecha: string): Promise<number>;
}
