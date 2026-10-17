import { Cuenta } from '../entities/cuenta';

/** Puerto de persistencia de cuentas (contexto Identidad, dueño único de `cuentas`). */
export abstract class CuentaRepository {
  /** Inserta solo si el correo no está registrado; dice si la insertó (atómico en los adaptadores reales). */
  abstract guardarSiCorreoLibre(cuenta: Cuenta): Promise<boolean>;
  abstract buscarPorCorreo(correo: string): Promise<Cuenta | null>;
  abstract buscarPorId(id: string): Promise<Cuenta | null>;
}
