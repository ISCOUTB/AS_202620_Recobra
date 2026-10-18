import { Cuenta } from '../entities/cuenta';

/** Puerto de persistencia de cuentas (contexto Identidad, dueño único de `cuentas`). */
export abstract class CuentaRepository {
  /** Inserta solo si el correo no está registrado; dice si la insertó (atómico en los adaptadores reales). */
  abstract guardarSiCorreoLibre(cuenta: Cuenta): Promise<boolean>;
  abstract buscarPorCorreo(correo: string): Promise<Cuenta | null>;
  abstract buscarPorId(id: string): Promise<Cuenta | null>;
  /**
   * Quita los datos personales de la cuenta (correo, nombre, contraseña) y la
   * marca como eliminada; la fila queda para que lo ya registrado (reclamaciones,
   * publicaciones) siga apuntando a algo (ADR-0021). El correo original queda
   * libre para volver a registrarse.
   */
  abstract anonimizar(id: string, fecha: string): Promise<void>;
}
