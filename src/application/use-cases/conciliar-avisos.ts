import { Injectable } from '@nestjs/common';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';
import { ReporteRepository } from '../../domain/ports/reporte-repository';
import { Notificar } from './notificaciones';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Hasta cuándo hacia atrás se buscan avisos que faltan: lo que se perdió hace más ya no le sirve a nadie. */
export const DIAS_VENTANA_CONCILIACION = 3;
const LIMITE_POR_TIPO = 500;

export interface AvisosRecreados {
  coincidencias: number;
  reclamaciones: number;
  moderaciones: number;
}

/**
 * Conciliación de avisos (ADR-0024). Los avisos se generan con eventos en
 * proceso, que son rápidos pero no durables: si el proceso se reinicia entre
 * guardar el dato y procesar su evento, o la base falla justo al escribir el
 * aviso, ese aviso se pierde. Como el id de cada aviso se deriva del dato que lo
 * origina (la coincidencia, la reclamación, la publicación ocultada) y guardarlo
 * es idempotente, basta con repasar lo reciente y volver a pedir los avisos: los
 * que ya existen no se duplican y los que faltan se crean. Es la misma idea que
 * la reconciliación de ADR-0020, y evita una tabla de eventos pendientes que
 * habría que escribir de forma atómica junto con cada cambio.
 */
@Injectable()
export class ConciliarAvisos {
  constructor(
    private readonly notificar: Notificar,
    private readonly coincidencias: CoincidenciaRepository,
    private readonly reclamaciones: ReclamacionRepository,
    private readonly reportes: ReporteRepository,
    private readonly publicaciones: PublicacionRepository,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<AvisosRecreados> {
    const desde = new Date(ahora.getTime() - DIAS_VENTANA_CONCILIACION * MS_POR_DIA).toISOString();
    return {
      coincidencias: await this.deCoincidencias(desde),
      reclamaciones: await this.deReclamaciones(desde),
      moderaciones: await this.deModeracion(desde),
    };
  }

  private async deCoincidencias(desde: string): Promise<number> {
    let creados = 0;
    for (const c of await this.coincidencias.listarCreadasDesde(desde, LIMITE_POR_TIPO)) {
      creados += (await this.notificar.porCoincidencia(c)).length;
    }
    return creados;
  }

  private async deReclamaciones(desde: string): Promise<number> {
    let creados = 0;
    for (const r of await this.reclamaciones.listarCreadasDesde(desde, LIMITE_POR_TIPO)) {
      const publicacion = await this.publicaciones.buscarPorId(r.publicacionId);
      if (!publicacion) continue;
      creados += (await this.notificar.porReclamacionCreada(r, publicacion)).length;
      creados += (await this.notificar.porReclamacionResuelta(r, publicacion)).length;
    }
    return creados;
  }

  private async deModeracion(desde: string): Promise<number> {
    let creados = 0;
    const vistas = new Set<string>(); // varios reportes se resuelven juntos con la misma publicación
    for (const reporte of await this.reportes.listarOcultadosDesde(desde, LIMITE_POR_TIPO)) {
      if (vistas.has(reporte.publicacionId)) continue;
      vistas.add(reporte.publicacionId);
      const publicacion = await this.publicaciones.buscarPorId(reporte.publicacionId);
      if (publicacion) creados += (await this.notificar.porModeracion(publicacion)).length;
    }
    return creados;
  }
}
