import { Injectable } from '@nestjs/common';
import { Notificacion, TipoNotificacion } from '../../domain/entities/notificacion';
import { NoEncontradoError } from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { NotificacionRepository } from '../../domain/ports/notificacion-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import {
  COINCIDENCIA_DETECTADA,
  CoincidenciaDetectadaV1,
  EventoDominio,
  PUBLICACION_MODERADA,
  PublicacionModeradaV1,
  RECLAMACION_CREADA,
  RECLAMACION_RESUELTA,
  ReclamacionCreadaV1,
  ReclamacionResueltaV1,
  VERSION_DE_EVENTOS,
} from '../events/eventos-dominio';

const LIMITE = 50;

function recortar(texto: string, maximo = 60): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

/**
 * Redacta y guarda los avisos (escenario S3, ADR-0015). El id de cada aviso se
 * deriva del evento y del destinatario, así que un evento procesado dos veces
 * (o recreado por la conciliación, ADR-0024) no duplica el aviso (mismo criterio
 * que docs/modos-de-fallo.md).
 */
@Injectable()
export class Notificar {
  constructor(
    private readonly notificaciones: NotificacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cuentas: CuentaRepository,
  ) {}

  /**
   * Procesa un evento según su tipo. Es lo que ejecutan tanto la entrega normal
   * como el reproceso de la cola de fallidos (ADR-0026). Lanza si la versión o el
   * tipo no se conocen: un mensaje que este consumidor no entiende no se descarta
   * en silencio, va a la cola de fallidos.
   */
  async procesar(evento: EventoDominio): Promise<Notificacion[]> {
    if (evento.version !== VERSION_DE_EVENTOS) {
      throw new Error(
        `versión ${evento.version} del evento ${evento.tipo} no soportada (se entiende la ${VERSION_DE_EVENTOS})`,
      );
    }
    switch (evento.tipo) {
      case COINCIDENCIA_DETECTADA:
        return this.porCoincidencia(evento.carga as CoincidenciaDetectadaV1);
      case RECLAMACION_CREADA:
        return this.porReclamacionCreada(evento.carga as ReclamacionCreadaV1);
      case RECLAMACION_RESUELTA:
        return this.porReclamacionResuelta(evento.carga as ReclamacionResueltaV1);
      case PUBLICACION_MODERADA:
        return this.porModeracion(evento.carga as PublicacionModeradaV1);
      default:
        throw new Error(`tipo de evento desconocido: ${evento.tipo}`);
    }
  }

  /** Coincidencia detectada: avisa a quien publicó el objeto perdido, con enlace al encontrado. */
  async porCoincidencia(coincidencia: CoincidenciaDetectadaV1): Promise<Notificacion[]> {
    const [a, b] = await Promise.all([
      this.publicaciones.buscarPorId(coincidencia.publicacionOrigenId),
      this.publicaciones.buscarPorId(coincidencia.publicacionCoincidenteId),
    ]);
    if (!a || !b) return [];
    const perdido = a.tipo === 'perdido' ? a : b;
    const encontrado = a.tipo === 'perdido' ? b : a;
    if (!perdido.autorId) return [];
    return this.guardar(
      `coincidencia:${coincidencia.coincidenciaId}:${perdido.autorId}`,
      perdido.autorId,
      'coincidencia',
      'Encontraron algo que podría ser tuyo',
      `«${recortar(encontrado.descripcion)}» en ${encontrado.ubicacion} se parece a lo que perdiste («${recortar(
        perdido.descripcion,
      )}»).`,
      encontrado.id,
    );
  }

  /** Nueva reclamación: avisa a quien publicó el objeto encontrado. */
  async porReclamacionCreada(evento: ReclamacionCreadaV1): Promise<Notificacion[]> {
    if (!evento.publicacionAutorId) return [];
    return this.guardar(
      `reclamacion-nueva:${evento.reclamacionId}`,
      evento.publicacionAutorId,
      'reclamacion_nueva',
      'Alguien reclamó un objeto que publicaste',
      `Revisa la reclamación de «${recortar(evento.publicacionDescripcion)}» y decide si es el dueño.`,
      evento.publicacionId,
    );
  }

  /** Reclamación aprobada o rechazada: avisa a quien reclamó. */
  async porReclamacionResuelta(evento: ReclamacionResueltaV1): Promise<Notificacion[]> {
    const aprobada = evento.resultado === 'aprobada';
    return this.guardar(
      `reclamacion-resuelta:${evento.reclamacionId}`,
      evento.reclamanteId,
      aprobada ? 'reclamacion_aprobada' : 'reclamacion_rechazada',
      aprobada ? 'Aprobaron tu reclamación' : 'Rechazaron tu reclamación',
      aprobada
        ? `«${recortar(evento.publicacionDescripcion)}» es tuyo. Ya puedes ver el contacto para coordinar la entrega; cuando lo tengas, confírmalo en Mis cosas.`
        : `«${recortar(evento.publicacionDescripcion)}»: ${evento.motivoRechazo ?? 'sin motivo'}.`,
      evento.publicacionId,
    );
  }

  /** Un administrador ocultó una publicación: avisa a su autor (ADR-0022). */
  async porModeracion(evento: PublicacionModeradaV1): Promise<Notificacion[]> {
    if (!evento.autorId) return [];
    return this.guardar(
      `moderacion:${evento.publicacionId}`,
      evento.autorId,
      'publicacion_ocultada',
      'Ocultamos una publicación tuya',
      `«${recortar(evento.descripcion)}» no cumple las normas de uso y ya no aparece en la búsqueda. Si crees que fue un error, escríbenos.`,
      evento.publicacionId,
    );
  }

  private async guardar(
    id: string,
    cuentaId: string,
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string,
    publicacionId: string,
  ): Promise<Notificacion[]> {
    // Una cuenta eliminada ya no recibe avisos (ADR-0021): ni por un evento tardío ni por la conciliación.
    const destinataria = await this.cuentas.buscarPorId(cuentaId);
    if (destinataria?.eliminadaEn) return [];
    const notificacion = new Notificacion({
      id,
      cuentaId,
      tipo,
      titulo,
      mensaje,
      publicacionId,
      creadoEn: new Date().toISOString(),
    });
    return (await this.notificaciones.guardarSiNoExiste(notificacion)) ? [notificacion] : [];
  }
}

@Injectable()
export class ConsultarNotificaciones {
  constructor(private readonly notificaciones: NotificacionRepository) {}

  async ejecutar(cuentaId: string): Promise<{ noLeidas: number; notificaciones: Notificacion[] }> {
    const [noLeidas, notificaciones] = await Promise.all([
      this.notificaciones.contarNoLeidas(cuentaId),
      this.notificaciones.listarPorCuenta(cuentaId, LIMITE),
    ]);
    return { noLeidas, notificaciones };
  }

  async marcarLeida(id: string, cuentaId: string): Promise<void> {
    if (!(await this.notificaciones.marcarLeida(id, cuentaId))) {
      throw new NoEncontradoError('Notificación no encontrada');
    }
  }

  marcarTodas(cuentaId: string): Promise<void> {
    return this.notificaciones.marcarTodasLeidas(cuentaId);
  }
}
