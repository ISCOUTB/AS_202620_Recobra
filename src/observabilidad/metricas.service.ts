import { Injectable } from '@nestjs/common';

const MAX_MUESTRAS = 200;

/** Resumen de una operación medida: percentiles sobre la ventana reciente. */
export interface ResumenLatencia {
  metrica: string;
  n: number;
  errores: number;
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  objetivoP95Ms: number;
  cumpleObjetivo: boolean | null;
  ventana: string;
}

class Ventana {
  private readonly muestras: number[] = [];
  errores = 0;

  agregar(ms: number): void {
    this.muestras.push(ms);
    if (this.muestras.length > MAX_MUESTRAS) {
      this.muestras.shift();
    }
  }

  resumir(metrica: string, objetivoP95Ms: number): ResumenLatencia {
    const ordenadas = [...this.muestras].sort((a, b) => a - b);
    const n = ordenadas.length;
    const avgMs = n > 0 ? Number((ordenadas.reduce((a, b) => a + b, 0) / n).toFixed(2)) : null;
    const p95Ms = this.percentil(ordenadas, 95);
    return {
      metrica,
      n,
      errores: this.errores,
      avgMs,
      p50Ms: this.percentil(ordenadas, 50),
      p95Ms,
      objetivoP95Ms,
      cumpleObjetivo: p95Ms === null ? null : p95Ms <= objetivoP95Ms,
      ventana: `últimas ${MAX_MUESTRAS} peticiones (en memoria, se reinicia con el proceso)`,
    };
  }

  private percentil(ordenadas: number[], p: number): number | null {
    if (ordenadas.length === 0) return null;
    const idx = Math.min(ordenadas.length - 1, Math.ceil((p / 100) * ordenadas.length) - 1);
    return Number(ordenadas[idx].toFixed(2));
  }
}

/**
 * Métricas consultables en producción (`GET /metrics`), una por escenario:
 *
 * - S5 (mantenibilidad / migración de stack): latencia de `POST /publicaciones`,
 *   contra el objetivo local de 100 ms (docs/medicion-corte1.md).
 * - S1 (rendimiento de búsqueda): latencia de `GET /publicaciones` con filtros,
 *   contra el umbral del escenario, p95 <= 400 ms (docs/medicion-busqueda.md).
 *
 * Cada operación tiene su ventana propia para no mezclar umbrales distintos.
 */
@Injectable()
export class MetricasService {
  private readonly publicacion = new Ventana();
  private readonly busqueda = new Ventana();

  registrarLatenciaPublicacion(ms: number): void {
    this.publicacion.agregar(ms);
  }

  registrarLatenciaBusqueda(ms: number): void {
    this.busqueda.agregar(ms);
  }

  registrarErrorBusqueda(): void {
    this.busqueda.errores += 1;
  }

  snapshot() {
    return {
      // Campos históricos (S5), sin cambios de forma para no romper a quien ya los lee.
      escenario: 'S5 (mantenibilidad) — ver docs/calidad/escenarios_calidad.md y docs/medicion-corte1.md',
      ...this.publicacion.resumir('latencia_post_publicaciones_ms', 100),
      // Escenario S1 (búsqueda).
      busqueda: {
        escenario: 'S1 (rendimiento de búsqueda) — ver docs/calidad/escenarios_calidad.md y docs/medicion-busqueda.md',
        ...this.busqueda.resumir('latencia_get_publicaciones_ms', 400),
      },
    };
  }
}
