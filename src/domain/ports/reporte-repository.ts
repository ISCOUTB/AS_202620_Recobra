import { Reporte } from '../entities/reporte';

/** Puerto de persistencia de reportes (contexto Moderación, dueño único de `reportes`). */
export abstract class ReporteRepository {
  /** Inserta o reemplaza por id. */
  abstract guardar(reporte: Reporte): Promise<Reporte>;
  abstract buscarPorId(id: string): Promise<Reporte | null>;
  /** El reporte que una cuenta ya hizo sobre una publicación, si existe (uno por cuenta y publicación). */
  abstract buscarDe(publicacionId: string, reportanteId: string): Promise<Reporte | null>;
  /** Los abiertos, los más antiguos primero. */
  abstract listarAbiertos(limite: number): Promise<Reporte[]>;
  abstract listarAbiertosDe(publicacionId: string): Promise<Reporte[]>;
  /** Los reportes que hizo una cuenta (derecho de acceso, ADR-0021). */
  abstract listarPorReportante(reportanteId: string): Promise<Reporte[]>;
  /** Reemplaza el texto del detalle de los reportes de una cuenta (al eliminarla) y dice cuántos. */
  abstract anonimizarDetallesDe(reportanteId: string): Promise<number>;
}
