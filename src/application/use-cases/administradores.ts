import { Cuenta } from '../../domain/entities/cuenta';

/**
 * Administradores: las cuentas cuyo correo está en `ADMIN_CORREOS` (separados
 * por comas, se define en el panel de Dokploy, nunca en el repositorio). No hay
 * rol guardado en la base ni pantalla para asignarlo (ADR-0022).
 */
export function correosAdministradores(): string[] {
  return (process.env.ADMIN_CORREOS ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export function esAdministrador(cuenta: Cuenta): boolean {
  return !cuenta.eliminadaEn && correosAdministradores().includes(cuenta.correo);
}
