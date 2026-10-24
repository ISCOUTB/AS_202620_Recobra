import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { Publicacion } from '../../domain/entities/publicacion';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { metricasDeEventos } from './metricas-eventos';

/**
 * Eventos en proceso entre contextos (ADR-0004, ADR-0015, ADR-0026). Quien emite
 * no espera a quien escucha: si Notificaciones falla, la operación original ya
 * respondió.
 *
 * El contrato de los mensajes está en `docs/contracts/eventos.md` y
 * `docs/contracts/eventos.schema.json`, y lo comprueba `eventos-contrato.spec.ts`.
 */
export const COINCIDENCIA_DETECTADA = 'coincidencia.detectada';
export const RECLAMACION_CREADA = 'reclamacion.creada';
export const RECLAMACION_RESUELTA = 'reclamacion.resuelta';
/** Un administrador ocultó una publicación (ADR-0022). */
export const PUBLICACION_MODERADA = 'publicacion.moderada';

/** Versión del contrato de los cuatro eventos que consume Notificaciones. */
export const VERSION_DE_EVENTOS = 1;

/**
 * Sobre de todo evento. `id` es el identificador de correlación (correlation id,
 * el mismo que identifica el mensaje, message_id): aparece en el
 * registro de quien emite y en el de quien procesa, y en la cola de fallidos.
 */
export interface EventoDominio<T = unknown> {
  id: string;
  tipo: string;
  version: number;
  ocurridoEn: string;
  carga: T;
}

/**
 * Las cargas llevan lo mínimo que necesita quien las consume, y nada de texto
 * escrito por una persona más allá de lo que el aviso ya muestra (por ejemplo,
 * no llevan la prueba de una reclamación): pueden guardarse en la cola de
 * fallidos sin sumar datos personales.
 */
export interface CoincidenciaDetectadaV1 {
  coincidenciaId: string;
  publicacionOrigenId: string;
  publicacionCoincidenteId: string;
  score: number;
}

export interface ReclamacionCreadaV1 {
  reclamacionId: string;
  publicacionId: string;
  publicacionAutorId: string | null;
  publicacionDescripcion: string;
}

export interface ReclamacionResueltaV1 {
  reclamacionId: string;
  publicacionId: string;
  reclamanteId: string;
  resultado: 'aprobada' | 'rechazada';
  motivoRechazo: string | null;
  publicacionDescripcion: string;
}

export interface PublicacionModeradaV1 {
  publicacionId: string;
  autorId: string | null;
  descripcion: string;
}

export const cargaCoincidencia = (c: Coincidencia): CoincidenciaDetectadaV1 => ({
  coincidenciaId: c.id,
  publicacionOrigenId: c.publicacionOrigenId,
  publicacionCoincidenteId: c.publicacionCoincidenteId,
  score: c.score,
});

export const cargaReclamacionCreada = (r: Reclamacion, p: Publicacion): ReclamacionCreadaV1 => ({
  reclamacionId: r.id,
  publicacionId: p.id,
  publicacionAutorId: p.autorId,
  publicacionDescripcion: p.descripcion,
});

export const cargaReclamacionResuelta = (r: Reclamacion, p: Publicacion): ReclamacionResueltaV1 => ({
  reclamacionId: r.id,
  publicacionId: p.id,
  reclamanteId: r.reclamanteId,
  resultado: r.estado === 'aprobada' ? 'aprobada' : 'rechazada',
  motivoRechazo: r.motivoRechazo,
  publicacionDescripcion: p.descripcion,
});

export const cargaModeracion = (p: Publicacion): PublicacionModeradaV1 => ({
  publicacionId: p.id,
  autorId: p.autorId,
  descripcion: p.descripcion,
});

const logger = new Logger('Eventos');

/**
 * Emite un evento dentro de su sobre y deja la línea de registro del lado del
 * productor, con el identificador de correlación que luego repite el
 * consumidor (`evento.procesado`).
 */
export function emitirEvento<T>(emisor: EventEmitter2, tipo: string, carga: T): EventoDominio<T> {
  const evento: EventoDominio<T> = {
    id: randomUUID(),
    tipo,
    version: VERSION_DE_EVENTOS,
    ocurridoEn: new Date().toISOString(),
    carga,
  };
  metricasDeEventos.registrar('emitidos');
  logger.log({ evento: 'evento.emitido', eventoId: evento.id, tipo, version: evento.version });
  emisor.emit(tipo, evento);
  return evento;
}
