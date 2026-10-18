import { ConflictoError, DatoInvalidoError } from '../errors/errores-de-dominio';

/** Por qué se reporta una publicación (moderación, ADR-0022). */
export const MOTIVOS_REPORTE = ['falso', 'spam', 'inapropiado', 'datos_personales', 'otro'] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

/** abierto → ocultada (se cerró la publicación) o descartado (el reporte no procedía). */
export type EstadoReporte = 'abierto' | 'ocultada' | 'descartado';
export type DecisionModeracion = 'ocultar' | 'descartar';

const DETALLE_MAXIMO = 300;

/** Lo que queda en lugar del detalle cuando su autor elimina la cuenta (ADR-0021). */
export const DETALLE_ANONIMIZADO = '[detalle eliminado a petición de su titular]';
const NOTA_MAXIMA = 300;

export interface DatosReporte {
  id: string;
  publicacionId: string;
  reportanteId: string;
  motivo: string;
  detalle?: string | null;
  estado?: EstadoReporte;
  creadoEn: string;
  resueltoEn?: string | null;
  resueltoPor?: string | null;
  nota?: string | null;
}

/**
 * Reporte de abuso sobre una publicación (contexto Moderación). Lo crea
 * cualquier cuenta; lo resuelve un administrador, que oculta la publicación o
 * descarta el reporte.
 */
export class Reporte {
  readonly id: string;
  readonly publicacionId: string;
  readonly reportanteId: string;
  readonly motivo: MotivoReporte;
  readonly detalle: string | null;
  readonly estado: EstadoReporte;
  readonly creadoEn: string;
  readonly resueltoEn: string | null;
  readonly resueltoPor: string | null;
  readonly nota: string | null;

  constructor(datos: DatosReporte) {
    if (!MOTIVOS_REPORTE.includes(datos.motivo as MotivoReporte)) {
      throw new DatoInvalidoError(`motivo debe ser uno de: ${MOTIVOS_REPORTE.join(', ')}`);
    }
    const detalle = (datos.detalle ?? '').trim();
    if (detalle.length > DETALLE_MAXIMO) {
      throw new DatoInvalidoError(`detalle debe tener como máximo ${DETALLE_MAXIMO} caracteres`);
    }
    if (datos.motivo === 'otro' && detalle.length < 5) {
      throw new DatoInvalidoError('cuéntanos en el detalle qué pasa (mínimo 5 caracteres)');
    }
    this.id = datos.id;
    this.publicacionId = datos.publicacionId;
    this.reportanteId = datos.reportanteId;
    this.motivo = datos.motivo as MotivoReporte;
    this.detalle = detalle || null;
    this.estado = datos.estado ?? 'abierto';
    this.creadoEn = datos.creadoEn;
    this.resueltoEn = datos.resueltoEn ?? null;
    this.resueltoPor = datos.resueltoPor ?? null;
    this.nota = datos.nota ?? null;
  }

  resolver(decision: DecisionModeracion, administradorId: string, nota: string | undefined, ahora: string): Reporte {
    if (this.estado !== 'abierto') throw new ConflictoError(`el reporte ya está ${this.estado}`);
    const texto = (nota ?? '').trim();
    if (texto.length > NOTA_MAXIMA) throw new DatoInvalidoError(`nota debe tener como máximo ${NOTA_MAXIMA} caracteres`);
    return new Reporte({
      ...this,
      estado: decision === 'ocultar' ? 'ocultada' : 'descartado',
      resueltoEn: ahora,
      resueltoPor: administradorId,
      nota: texto || null,
    });
  }
}
