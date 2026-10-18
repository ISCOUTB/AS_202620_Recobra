import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cuenta } from '../../domain/entities/cuenta';
import { Publicacion } from '../../domain/entities/publicacion';
import { DecisionModeracion, Reporte } from '../../domain/entities/reporte';
import { ConflictoError, DatoInvalidoError, NoEncontradoError } from '../../domain/errors/errores-de-dominio';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReporteRepository } from '../../domain/ports/reporte-repository';
import { PUBLICACION_MODERADA } from '../events/eventos-dominio';
import { EliminarFotoDe } from './fotos';

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

/**
 * Reportar una publicación (abuso, spam, datos de terceros…). Una cuenta
 * reporta una publicación una sola vez, y no la propia ni una ya cerrada.
 */
@Injectable()
export class ReportarPublicacion {
  constructor(
    private readonly reportes: ReporteRepository,
    private readonly publicaciones: PublicacionRepository,
  ) {}

  async ejecutar(publicacionId: string, reportante: Cuenta, motivo: string, detalle?: string): Promise<Reporte> {
    const publicacion = await this.publicaciones.buscarPorId(publicacionId);
    if (!publicacion) throw new NoEncontradoError('Publicación no encontrada');
    if (publicacion.autorId === reportante.id) throw new ConflictoError('no puedes reportar tu propia publicación');
    if (publicacion.estado === 'cerrado') throw new ConflictoError('esta publicación ya está cerrada');
    if (await this.reportes.buscarDe(publicacionId, reportante.id)) {
      throw new ConflictoError('ya reportaste esta publicación; un administrador la revisará');
    }
    const reporte = new Reporte({
      id: randomUUID(),
      publicacionId,
      reportanteId: reportante.id,
      motivo,
      detalle,
      creadoEn: new Date().toISOString(),
    });
    await this.reportes.guardar(reporte);
    return reporte;
  }
}

/** Un reporte abierto con lo mínimo de la publicación para decidir, y cuántos reportes tiene. */
export interface ReporteParaModerar {
  reporte: Reporte;
  publicacion: Pick<Publicacion, 'id' | 'tipo' | 'descripcion' | 'categoria' | 'ubicacion' | 'estado'> | null;
  reportesDeLaPublicacion: number;
}

@Injectable()
export class ListarReportesAbiertos {
  constructor(
    private readonly reportes: ReporteRepository,
    private readonly publicaciones: PublicacionRepository,
  ) {}

  async ejecutar(): Promise<ReporteParaModerar[]> {
    const abiertos = await this.reportes.listarAbiertos(100);
    const porPublicacion = new Map<string, number>();
    for (const r of abiertos) porPublicacion.set(r.publicacionId, (porPublicacion.get(r.publicacionId) ?? 0) + 1);
    return Promise.all(
      abiertos.map(async (reporte) => {
        const p = await this.publicaciones.buscarPorId(reporte.publicacionId);
        return {
          reporte,
          publicacion: p
            ? { id: p.id, tipo: p.tipo, descripcion: p.descripcion, categoria: p.categoria, ubicacion: p.ubicacion, estado: p.estado }
            : null,
          reportesDeLaPublicacion: porPublicacion.get(reporte.publicacionId) ?? 1,
        };
      }),
    );
  }
}

/**
 * Resolver un reporte (solo administradores): "ocultar" cierra la publicación
 * con motivo `moderado` (sale de la búsqueda y del emparejamiento), resuelve de
 * paso los demás reportes abiertos de esa publicación y avisa a su autor;
 * "descartar" deja la publicación como está. Solo se puede ocultar mientras la
 * publicación está "publicado": con una reclamación o una entrega en curso hay
 * otra persona esperando, así que primero se resuelve eso.
 */
@Injectable()
export class ResolverReporte {
  constructor(
    private readonly reportes: ReporteRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly eventos: EventEmitter2,
    private readonly fotos: EliminarFotoDe,
  ) {}

  async ejecutar(reporteId: string, administrador: Cuenta, decision: string, nota?: string): Promise<Reporte> {
    if (decision !== 'ocultar' && decision !== 'descartar') {
      throw new DatoInvalidoError('decision debe ser "ocultar" o "descartar"');
    }
    const reporte = await this.reportes.buscarPorId(reporteId);
    if (!reporte) throw new NoEncontradoError('Reporte no encontrado');
    const ahora = new Date().toISOString();
    const resuelto = reporte.resolver(decision as DecisionModeracion, administrador.id, nota, ahora);

    if (decision === 'ocultar') await this.ocultar(reporte.publicacionId, administrador, nota, ahora);
    await this.reportes.guardar(resuelto);
    return resuelto;
  }

  private async ocultar(publicacionId: string, administrador: Cuenta, nota: string | undefined, ahora: string): Promise<void> {
    const publicacion = await this.publicaciones.buscarPorId(publicacionId);
    if (!publicacion) throw new NoEncontradoError('La publicación ya no existe');
    if (publicacion.estado === 'publicado') {
      if (!(await this.publicaciones.cerrar(publicacionId, 'moderado', ahora))) {
        throw new ConflictoError('la publicación cambió mientras tanto; vuelve a cargar el reporte');
      }
      await this.fotos.ejecutar(publicacionId); // lo que se oculta no conserva su imagen (ADR-0023)
      this.eventos.emit(PUBLICACION_MODERADA, publicacion);
    } else if (publicacion.estado !== 'cerrado') {
      throw new ConflictoError(
        'la publicación tiene una reclamación o una entrega en curso; espera a que se resuelva antes de ocultarla',
      );
    }
    // Los demás reportes abiertos de la misma publicación quedan resueltos con ella.
    for (const otro of await this.reportes.listarAbiertosDe(publicacionId)) {
      await this.reportes.guardar(otro.resolver('ocultar', administrador.id, nota, ahora));
    }
  }
}
