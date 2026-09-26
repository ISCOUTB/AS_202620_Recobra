import { Injectable } from '@nestjs/common';

const MAX_MUESTRAS = 200;

/**
 * Métrica consultable ligada al escenario S5 (mantenibilidad / migración de
 * stack sin degradar el corte vertical, ver docs/medicion-corte1.md): la
 * misma operación que ya se midió offline (POST /publicaciones) se sigue
 * midiendo en producción, en memoria, para poder contrastar el p95 real
 * contra el objetivo local de 100 ms sin depender de una corrida manual.
 */
@Injectable()
export class MetricasService {
  private readonly muestras: number[] = [];

  registrarLatenciaPublicacion(ms: number): void {
    this.muestras.push(ms);
    if (this.muestras.length > MAX_MUESTRAS) {
      this.muestras.shift();
    }
  }

  private percentil(ordenadas: number[], p: number): number | null {
    if (ordenadas.length === 0) return null;
    const idx = Math.min(ordenadas.length - 1, Math.ceil((p / 100) * ordenadas.length) - 1);
    return Number(ordenadas[idx].toFixed(2));
  }

  snapshot() {
    const ordenadas = [...this.muestras].sort((a, b) => a - b);
    const n = ordenadas.length;
    const avg = n > 0 ? Number((ordenadas.reduce((a, b) => a + b, 0) / n).toFixed(2)) : null;

    return {
      escenario: 'S5 (mantenibilidad) — ver docs/calidad/escenarios_calidad.md y docs/medicion-corte1.md',
      metrica: 'latencia_post_publicaciones_ms',
      n,
      avgMs: avg,
      p50Ms: this.percentil(ordenadas, 50),
      p95Ms: this.percentil(ordenadas, 95),
      objetivoP95Ms: 100,
      ventana: `últimas ${MAX_MUESTRAS} peticiones (en memoria, se reinicia con el proceso)`,
    };
  }
}
