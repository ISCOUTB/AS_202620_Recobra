import { Injectable } from '@nestjs/common';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { Notificacion, TipoNotificacion } from '../../domain/entities/notificacion';
import { Publicacion } from '../../domain/entities/publicacion';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { NoEncontradoError } from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { NotificacionRepository } from '../../domain/ports/notificacion-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

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

  /** Coincidencia detectada: avisa a quien publicó el objeto perdido, con enlace al encontrado. */
  async porCoincidencia(coincidencia: Coincidencia): Promise<Notificacion[]> {
    const [a, b] = await Promise.all([
      this.publicaciones.buscarPorId(coincidencia.publicacionOrigenId),
      this.publicaciones.buscarPorId(coincidencia.publicacionCoincidenteId),
    ]);
    if (!a || !b) return [];
    const perdido = a.tipo === 'perdido' ? a : b;
    const encontrado = a.tipo === 'perdido' ? b : a;
    if (!perdido.autorId) return [];
    return this.guardar(
      `coincidencia:${coincidencia.id}:${perdido.autorId}`,
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
  async porReclamacionCreada(reclamacion: Reclamacion, publicacion: Publicacion): Promise<Notificacion[]> {
    if (!publicacion.autorId) return [];
    return this.guardar(
      `reclamacion-nueva:${reclamacion.id}`,
      publicacion.autorId,
      'reclamacion_nueva',
      'Alguien reclamó un objeto que publicaste',
      `Revisa la reclamación de «${recortar(publicacion.descripcion)}» y decide si es el dueño.`,
      publicacion.id,
    );
  }

  /** Reclamación aprobada o rechazada: avisa a quien reclamó. */
  async porReclamacionResuelta(reclamacion: Reclamacion, publicacion: Publicacion): Promise<Notificacion[]> {
    if (reclamacion.estado === 'pendiente') return [];
    const aprobada = reclamacion.estado === 'aprobada';
    return this.guardar(
      `reclamacion-resuelta:${reclamacion.id}`,
      reclamacion.reclamanteId,
      aprobada ? 'reclamacion_aprobada' : 'reclamacion_rechazada',
      aprobada ? 'Aprobaron tu reclamación' : 'Rechazaron tu reclamación',
      aprobada
        ? `«${recortar(publicacion.descripcion)}» es tuyo. Ya puedes ver el contacto para coordinar la entrega; cuando lo tengas, confírmalo en Mis cosas.`
        : `«${recortar(publicacion.descripcion)}»: ${reclamacion.motivoRechazo ?? 'sin motivo'}.`,
      publicacion.id,
    );
  }

  /** Un administrador ocultó una publicación: avisa a su autor (ADR-0022). */
  async porModeracion(publicacion: Publicacion): Promise<Notificacion[]> {
    if (!publicacion.autorId) return [];
    return this.guardar(
      `moderacion:${publicacion.id}`,
      publicacion.autorId,
      'publicacion_ocultada',
      'Ocultamos una publicación tuya',
      `«${recortar(publicacion.descripcion)}» no cumple las normas de uso y ya no aparece en la búsqueda. Si crees que fue un error, escríbenos.`,
      publicacion.id,
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
