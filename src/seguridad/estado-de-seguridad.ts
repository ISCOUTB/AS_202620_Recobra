/**
 * Estado de seguridad que se ve en `GET /metrics` (bloque `seguridad`). Vive en la
 * memoria del proceso, como el resto de las métricas.
 */
class EstadoDeSeguridad {
  /** Correos de `ADMIN_CORREOS` que todavía no tienen cuenta (null = aún no se ha comprobado). */
  administradoresSinCuenta: number | null = null;
}

export const estadoDeSeguridad = new EstadoDeSeguridad();
