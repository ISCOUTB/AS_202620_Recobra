/**
 * Sesión iniciada (contexto Identidad). Del token solo se guarda su hash: si
 * alguien leyera la base, no podría usar las sesiones (ADR-0013).
 */
export interface Sesion {
  tokenHash: string;
  cuentaId: string;
  creadaEn: string;
  expiraEn: string;
}
