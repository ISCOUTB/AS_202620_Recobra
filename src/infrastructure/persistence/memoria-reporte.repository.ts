import { Injectable } from '@nestjs/common';
import { DETALLE_ANONIMIZADO, Reporte } from '../../domain/entities/reporte';
import { ReporteRepository } from '../../domain/ports/reporte-repository';

@Injectable()
export class MemoriaReporteRepository extends ReporteRepository {
  private readonly reportes = new Map<string, Reporte>();

  async guardar(reporte: Reporte): Promise<Reporte> {
    this.reportes.set(reporte.id, reporte);
    return reporte;
  }

  async buscarPorId(id: string): Promise<Reporte | null> {
    return this.reportes.get(id) ?? null;
  }

  async buscarDe(publicacionId: string, reportanteId: string): Promise<Reporte | null> {
    return (
      [...this.reportes.values()].find((r) => r.publicacionId === publicacionId && r.reportanteId === reportanteId) ?? null
    );
  }

  async listarAbiertos(limite: number): Promise<Reporte[]> {
    return [...this.reportes.values()]
      .filter((r) => r.estado === 'abierto')
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
      .slice(0, limite);
  }

  async listarPorReportante(reportanteId: string): Promise<Reporte[]> {
    return [...this.reportes.values()]
      .filter((r) => r.reportanteId === reportanteId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }

  async anonimizarDetallesDe(reportanteId: string): Promise<number> {
    let cambiados = 0;
    for (const r of this.reportes.values()) {
      if (r.reportanteId !== reportanteId || !r.detalle || r.detalle === DETALLE_ANONIMIZADO) continue;
      this.reportes.set(r.id, new Reporte({ ...r, detalle: DETALLE_ANONIMIZADO }));
      cambiados++;
    }
    return cambiados;
  }

  async listarAbiertosDe(publicacionId: string): Promise<Reporte[]> {
    return [...this.reportes.values()].filter((r) => r.publicacionId === publicacionId && r.estado === 'abierto');
  }
}
