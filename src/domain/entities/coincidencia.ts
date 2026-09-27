export type EstadoCoincidencia = 'detectada';

export interface DatosCoincidencia {
  id: string;
  publicacionOrigenId: string;
  publicacionCoincidenteId: string;
  score: number;
  creadoEn: string;
}

/**
 * Entidad del contexto Emparejamiento (soporte, ver docs/context-map.md).
 * No conoce el modelo completo de Publicacion — solo referencia sus ids
 * (regla de dueño único, ver docs/modulo-datos.md), consistente con el
 * patrón Cliente/Proveedor documentado entre Publicaciones y Emparejamiento.
 */
export class Coincidencia {
  readonly id: string;
  readonly publicacionOrigenId: string;
  readonly publicacionCoincidenteId: string;
  readonly score: number;
  readonly estado: EstadoCoincidencia;
  readonly creadoEn: string;

  constructor({ id, publicacionOrigenId, publicacionCoincidenteId, score, creadoEn }: DatosCoincidencia) {
    if (score < 0 || score > 1) {
      throw new Error('score de coincidencia debe estar entre 0 y 1');
    }
    if (publicacionOrigenId === publicacionCoincidenteId) {
      throw new Error('una publicación no puede coincidir consigo misma');
    }

    this.id = id;
    this.publicacionOrigenId = publicacionOrigenId;
    this.publicacionCoincidenteId = publicacionCoincidenteId;
    this.score = score;
    this.estado = 'detectada';
    this.creadoEn = creadoEn;
  }
}
