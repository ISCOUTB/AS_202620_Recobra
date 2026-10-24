/**
 * Con tantos eventos esperando en la cola de fallidos (o más) se emite la alerta:
 * una línea de nivel `error` en el registro y la marca `alertaCola` en `/metrics`.
 * Uno o dos eventos son una caída breve; cinco juntos ya son algo que mirar.
 */
export const UMBRAL_ALERTA_COLA = 5;

export type ContadorDeEventos = 'emitidos' | 'procesados' | 'reintentos' | 'enColaDeFallidos' | 'reprocesados';

/**
 * Contadores de los eventos entre contextos, para `GET /metrics` (ADR-0026).
 * Viven en la memoria del proceso y se reinician con él, como el resto de las
 * métricas; sirven para ver que la cuenta cierra: lo emitido se procesa, se
 * reintenta, o termina en la cola de fallidos y se reprocesa.
 */
class MetricasDeEventos {
  private contadores: Record<ContadorDeEventos, number> = this.inicial();
  private pendientes = 0;

  registrar(contador: ContadorDeEventos): void {
    this.contadores[contador] += 1;
  }

  /** Cuántos eventos esperan en la cola de fallidos tras la última pasada de reproceso. */
  fijarPendientesEnCola(n: number): void {
    this.pendientes = n;
  }

  resumen(): Record<ContadorDeEventos, number> & { pendientesEnCola: number } {
    return { ...this.contadores, pendientesEnCola: this.pendientes };
  }

  reiniciar(): void {
    this.contadores = this.inicial();
    this.pendientes = 0;
  }

  private inicial(): Record<ContadorDeEventos, number> {
    return { emitidos: 0, procesados: 0, reintentos: 0, enColaDeFallidos: 0, reprocesados: 0 };
  }
}

export const metricasDeEventos = new MetricasDeEventos();
