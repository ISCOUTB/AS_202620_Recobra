export type TipoNotificacion =
  | 'coincidencia'
  | 'reclamacion_nueva'
  | 'reclamacion_aprobada'
  | 'reclamacion_rechazada'
  | 'publicacion_ocultada';

export interface DatosNotificacion {
  /** Determinista por evento y destinatario: el mismo evento repetido no la duplica. */
  id: string;
  cuentaId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  /** Publicación a la que lleva la notificación. */
  publicacionId: string;
  leida?: boolean;
  creadoEn: string;
}

/**
 * Aviso dentro de la app para una cuenta (contexto Notificaciones, escenario
 * S3, ADR-0015). No conoce el modelo de Publicacion ni de Reclamacion: guarda
 * el texto ya redactado y el id de la publicación.
 */
export class Notificacion {
  readonly id: string;
  readonly cuentaId: string;
  readonly tipo: TipoNotificacion;
  readonly titulo: string;
  readonly mensaje: string;
  readonly publicacionId: string;
  readonly leida: boolean;
  readonly creadoEn: string;

  constructor(datos: DatosNotificacion) {
    this.id = datos.id;
    this.cuentaId = datos.cuentaId;
    this.tipo = datos.tipo;
    this.titulo = datos.titulo;
    this.mensaje = datos.mensaje;
    this.publicacionId = datos.publicacionId;
    this.leida = datos.leida ?? false;
    this.creadoEn = datos.creadoEn;
  }
}
