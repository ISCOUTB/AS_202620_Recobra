export type ContadorDeEventos = 'emitidos' | 'procesados' | 'reintentos' | 'enColaDeFallidos' | 'reprocesados';

/**
 * Contadores de los eventos entre contextos, para `GET /metrics` (ADR-0026).
 * Viven en la memoria del proceso y se reinician con él, como el resto de las
 * métricas; sirven para ver que la cuenta cierra: lo emitido se procesa, se
 * reintenta, o termina en la cola de fallidos y se reprocesa.
 */
class MetricasDeEventos {
  private contadores: Record<ContadorDeEventos, number> = this.inicial();

  registrar(contador: ContadorDeEventos): void {
    this.contadores[contador] += 1;
  }

  resumen(): Record<ContadorDeEventos, number> {
    return { ...this.contadores };
  }

  reiniciar(): void {
    this.contadores = this.inicial();
  }

  private inicial(): Record<ContadorDeEventos, number> {
    return { emitidos: 0, procesados: 0, reintentos: 0, enColaDeFallidos: 0, reprocesados: 0 };
  }
}

export const metricasDeEventos = new MetricasDeEventos();
