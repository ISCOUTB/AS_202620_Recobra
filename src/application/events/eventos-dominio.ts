import { Coincidencia } from '../../domain/entities/coincidencia';
import { Publicacion } from '../../domain/entities/publicacion';
import { Reclamacion } from '../../domain/entities/reclamacion';

/**
 * Eventos en proceso entre contextos (ADR-0004, ADR-0015). Quien emite no
 * espera a quien escucha: si Notificaciones falla, la operación original ya
 * respondió.
 */
export const COINCIDENCIA_DETECTADA = 'coincidencia.detectada';
export const RECLAMACION_CREADA = 'reclamacion.creada';
export const RECLAMACION_RESUELTA = 'reclamacion.resuelta';

export type CoincidenciaDetectada = Coincidencia;

export interface EventoReclamacion {
  reclamacion: Reclamacion;
  publicacion: Publicacion;
}
