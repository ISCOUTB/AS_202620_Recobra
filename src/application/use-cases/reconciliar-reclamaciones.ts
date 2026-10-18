import { Injectable } from '@nestjs/common';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';
import { CambiarEstadoPublicacion } from './cambiar-estado-publicacion';
import { ResolverReclamacion } from './reclamaciones';

export interface ResumenReconciliacion {
  /** Reclamación pendiente sobre un objeto "publicado": el objeto pasa a "en verificación". */
  enVerificacion: number;
  /** Objeto "en verificación" sin reclamaciones pendientes: vuelve a "publicado". */
  publicadas: number;
  /** Aprobación interrumpida: se guarda la reclamación aprobada y se rechazan las demás. */
  aprobaciones: number;
  /** Entrega interrumpida: se guarda la fecha de entrega en la reclamación. */
  entregas: number;
}

const LIMITE = 500;

/**
 * Reconciliación entre Publicaciones y Reclamaciones (ADR-0020). Cada operación
 * que cambia las dos tablas tiene dos pasos sin transacción entre ellos; si el
 * proceso cae o la base falla entre uno y otro, quedan desalineadas. Esta pasada
 * repara las cuatro interrupciones posibles, de forma idempotente:
 *
 * 1. Reclamar: reclamación guardada pero el objeto sigue "publicado".
 * 2. Rechazar: reclamación rechazada pero el objeto sigue "en verificación"
 *    aunque ya no queda ninguna pendiente.
 * 3. Aprobar: objeto en "por_entregar" (con la reclamación aprobada anotada)
 *    pero la reclamación sigue "pendiente".
 * 4. Entregar: objeto "reclamado" pero la reclamación aprobada no tiene fecha
 *    de entrega.
 *
 * Solo recorre lo que está abierto (pendiente, aprobada sin entrega, objetos en
 * verificación): lista corta, no toda la historia.
 */
@Injectable()
export class ReconciliarReclamaciones {
  constructor(
    private readonly reclamaciones: ReclamacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cambiarEstado: CambiarEstadoPublicacion,
    private readonly resolver: ResolverReclamacion,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<ResumenReconciliacion> {
    const resumen: ResumenReconciliacion = { enVerificacion: 0, publicadas: 0, aprobaciones: 0, entregas: 0 };
    const instante = ahora.toISOString();

    for (const r of await this.reclamaciones.listarAbiertas(LIMITE)) {
      const p = await this.publicaciones.buscarPorId(r.publicacionId);
      if (!p) continue;

      if (r.estado === 'pendiente') {
        if (p.estado === 'publicado') {
          if (await this.cambiarEstado.ejecutar(p.id, 'publicado', 'en_verificacion')) resumen.enVerificacion++;
        } else if (
          (p.estado === 'por_entregar' || p.estado === 'reclamado') &&
          p.reclamacionAprobadaId === r.id
        ) {
          await this.resolver.completarAprobacion(r.aprobar(instante), p);
          resumen.aprobaciones++;
        }
      } else if (r.estado === 'aprobada' && !r.entregadaEn && p.estado === 'reclamado' && p.reclamacionAprobadaId === r.id) {
        await this.reclamaciones.guardar(r.confirmarEntrega(instante));
        resumen.entregas++;
      }
    }

    for (const p of await this.publicaciones.listarPorEstado('en_verificacion', LIMITE)) {
      const hayPendientes = (await this.reclamaciones.listarPorPublicacion(p.id)).some((r) => r.estado === 'pendiente');
      if (!hayPendientes && (await this.cambiarEstado.ejecutar(p.id, 'en_verificacion', 'publicado'))) {
        resumen.publicadas++;
      }
    }
    return resumen;
  }
}
