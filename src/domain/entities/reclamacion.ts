import { ConflictoError, DatoInvalidoError } from '../errors/errores-de-dominio';

export type EstadoReclamacion = 'pendiente' | 'aprobada' | 'rechazada';

export interface DatosReclamacion {
  id: string;
  publicacionId: string;
  reclamanteId: string;
  /** Lo que el reclamante dice saber del objeto y que solo su dueño sabría. */
  prueba: string;
  estado?: EstadoReclamacion;
  creadoEn: string;
  resueltaEn?: string | null;
  motivoRechazo?: string | null;
  /** Cuándo se confirmó que el objeto llegó a su dueño (ADR-0017). */
  entregadaEn?: string | null;
}

const PRUEBA_MINIMA = 20;

/** Lo que queda en lugar de la prueba cuando su autor elimina la cuenta (ADR-0021). */
export const PRUEBA_ANONIMIZADA = '[prueba eliminada a petición de su titular]';
const PRUEBA_MAXIMA = 1000;

/**
 * Reclamación de un objeto encontrado (contexto Reclamaciones, escenario S2).
 * Cada intento queda registrado con su reclamante y su fecha, y solo una
 * reclamación aprobada por quien encontró el objeto puede llevar la
 * publicación a "reclamado" (ADR-0014).
 */
export class Reclamacion {
  readonly id: string;
  readonly publicacionId: string;
  readonly reclamanteId: string;
  readonly prueba: string;
  readonly estado: EstadoReclamacion;
  readonly creadoEn: string;
  readonly resueltaEn: string | null;
  readonly motivoRechazo: string | null;
  readonly entregadaEn: string | null;

  constructor(datos: DatosReclamacion) {
    const prueba = (datos.prueba ?? '').trim();
    if (prueba.length < PRUEBA_MINIMA || prueba.length > PRUEBA_MAXIMA) {
      throw new DatoInvalidoError(
        `prueba debe tener entre ${PRUEBA_MINIMA} y ${PRUEBA_MAXIMA} caracteres: describe algo que solo el dueño sabría`,
      );
    }
    this.id = datos.id;
    this.publicacionId = datos.publicacionId;
    this.reclamanteId = datos.reclamanteId;
    this.prueba = prueba;
    this.estado = datos.estado ?? 'pendiente';
    this.creadoEn = datos.creadoEn;
    this.resueltaEn = datos.resueltaEn ?? null;
    this.motivoRechazo = datos.motivoRechazo ?? null;
    this.entregadaEn = datos.entregadaEn ?? null;
  }

  /** Solo una reclamación aprobada y sin entregar puede confirmarse como entregada. */
  confirmarEntrega(ahora: string): Reclamacion {
    if (this.estado !== 'aprobada') {
      throw new ConflictoError('solo se confirma la entrega de una reclamación aprobada');
    }
    if (this.entregadaEn) throw new ConflictoError('la entrega ya estaba confirmada');
    return new Reclamacion({ ...this, entregadaEn: ahora });
  }

  aprobar(ahora: string): Reclamacion {
    this.exigirPendiente();
    return new Reclamacion({ ...this, estado: 'aprobada', resueltaEn: ahora });
  }

  rechazar(ahora: string, motivo: string): Reclamacion {
    this.exigirPendiente();
    const texto = (motivo ?? '').trim();
    if (texto.length < 3 || texto.length > 300) {
      throw new DatoInvalidoError('motivo debe tener entre 3 y 300 caracteres');
    }
    return new Reclamacion({ ...this, estado: 'rechazada', resueltaEn: ahora, motivoRechazo: texto });
  }

  private exigirPendiente(): void {
    if (this.estado !== 'pendiente') {
      throw new ConflictoError(`la reclamación ya está ${this.estado}`);
    }
  }
}
