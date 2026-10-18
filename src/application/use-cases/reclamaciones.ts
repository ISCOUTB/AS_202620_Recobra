import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { Publicacion } from '../../domain/entities/publicacion';
import { ConflictoError, NoEncontradoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';
import { CambiarEstadoPublicacion } from './cambiar-estado-publicacion';
import { RECLAMACION_CREADA, RECLAMACION_RESUELTA } from '../events/eventos-dominio';

const MENSAJE_NO_RECLAMABLE: Partial<Record<string, string>> = {
  por_entregar: 'quien lo encontró ya aprobó otra reclamación',
  reclamado: 'este objeto ya fue entregado a su dueño',
  cerrado: 'esta publicación está cerrada',
};

/**
 * Contexto Reclamaciones (escenario S2, ADR-0014). Lee publicaciones y cuentas
 * a través de sus puertos y cambia el estado de una publicación solo a través
 * de `CambiarEstadoPublicacion`, que pertenece a Publicaciones.
 */
@Injectable()
export class CrearReclamacion {
  constructor(
    private readonly reclamaciones: ReclamacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cambiarEstado: CambiarEstadoPublicacion,
    private readonly eventos: EventEmitter2,
  ) {}

  async ejecutar(publicacionId: string, reclamanteId: string, prueba: string): Promise<Reclamacion> {
    const publicacion = await this.publicaciones.buscarPorId(publicacionId);
    if (!publicacion) throw new NoEncontradoError('Publicación no encontrada');
    if (publicacion.tipo !== 'encontrado') {
      throw new ConflictoError('solo se pueden reclamar objetos publicados como encontrados');
    }
    if (!publicacion.autorId) {
      throw new ConflictoError('esta publicación no tiene un autor que pueda verificar la reclamación');
    }
    if (publicacion.autorId === reclamanteId) {
      throw new ConflictoError('no puedes reclamar tu propia publicación');
    }
    if (publicacion.estado !== 'publicado' && publicacion.estado !== 'en_verificacion') {
      throw new ConflictoError(MENSAJE_NO_RECLAMABLE[publicacion.estado] ?? 'este objeto ya no se puede reclamar');
    }
    const previas = await this.reclamaciones.listarPorPublicacion(publicacionId);
    if (previas.some((r) => r.reclamanteId === reclamanteId && r.estado === 'pendiente')) {
      throw new ConflictoError('ya tienes una reclamación pendiente para este objeto');
    }

    const reclamacion = new Reclamacion({
      id: randomUUID(),
      publicacionId,
      reclamanteId,
      prueba,
      creadoEn: new Date().toISOString(),
    });
    await this.reclamaciones.guardar(reclamacion);
    if (publicacion.estado === 'publicado') {
      // Si otra reclamación ya la puso en verificación, no hay nada que cambiar.
      await this.cambiarEstado.ejecutar(publicacionId, 'publicado', 'en_verificacion');
    }
    this.eventos.emit(RECLAMACION_CREADA, { reclamacion, publicacion });
    return reclamacion;
  }
}

@Injectable()
export class ResolverReclamacion {
  constructor(
    private readonly reclamaciones: ReclamacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cambiarEstado: CambiarEstadoPublicacion,
    private readonly eventos: EventEmitter2,
  ) {}

  /**
   * Quien publicó el objeto aprueba la reclamación: es la única forma de que
   * la publicación pase a "por_entregar" (y luego, al confirmar la entrega, a
   * "reclamado"). Las demás reclamaciones pendientes del mismo objeto se
   * rechazan.
   */
  async aprobar(reclamacionId: string, solicitanteId: string): Promise<Reclamacion> {
    const { reclamacion, publicacion } = await this.cargarParaResolver(reclamacionId, solicitanteId);
    const aprobada = reclamacion.aprobar(new Date().toISOString());

    const cambio = await this.cambiarEstado.ejecutar(reclamacion.publicacionId, 'en_verificacion', 'por_entregar');
    if (!cambio) throw new ConflictoError('el estado del objeto cambió; vuelve a cargar las reclamaciones');
    await this.reclamaciones.guardar(aprobada);

    const pendientes = (await this.reclamaciones.listarPorPublicacion(reclamacion.publicacionId)).filter(
      (r) => r.estado === 'pendiente' && r.id !== reclamacion.id,
    );
    this.eventos.emit(RECLAMACION_RESUELTA, { reclamacion: aprobada, publicacion });
    for (const otra of pendientes) {
      const rechazada = otra.rechazar(aprobada.resueltaEn as string, 'Otra reclamación fue aprobada');
      await this.reclamaciones.guardar(rechazada);
      this.eventos.emit(RECLAMACION_RESUELTA, { reclamacion: rechazada, publicacion });
    }
    return aprobada;
  }

  /** Rechaza con un motivo; si no quedan pendientes, el objeto vuelve a "publicado". */
  async rechazar(reclamacionId: string, solicitanteId: string, motivo: string): Promise<Reclamacion> {
    const { reclamacion, publicacion } = await this.cargarParaResolver(reclamacionId, solicitanteId);
    const rechazada = reclamacion.rechazar(new Date().toISOString(), motivo);
    await this.reclamaciones.guardar(rechazada);
    this.eventos.emit(RECLAMACION_RESUELTA, { reclamacion: rechazada, publicacion });

    const quedan = (await this.reclamaciones.listarPorPublicacion(reclamacion.publicacionId)).some(
      (r) => r.estado === 'pendiente',
    );
    if (!quedan) await this.cambiarEstado.ejecutar(reclamacion.publicacionId, 'en_verificacion', 'publicado');
    return rechazada;
  }

  private async cargarParaResolver(
    reclamacionId: string,
    solicitanteId: string,
  ): Promise<{ reclamacion: Reclamacion; publicacion: Publicacion }> {
    const reclamacion = await this.reclamaciones.buscarPorId(reclamacionId);
    if (!reclamacion) throw new NoEncontradoError('Reclamación no encontrada');
    const publicacion = await this.publicaciones.buscarPorId(reclamacion.publicacionId);
    if (!publicacion || publicacion.autorId !== solicitanteId) {
      throw new PermisoDenegadoError('solo quien publicó el objeto puede resolver sus reclamaciones');
    }
    return { reclamacion, publicacion };
  }
}

/**
 * Confirmar la entrega (ADR-0017): aprobar dice "es el dueño"; esto dice "ya
 * lo tiene". Lo puede confirmar quien reclamó ("lo recibí") o quien lo
 * encontró ("lo entregué"); la primera confirmación cierra el ciclo.
 */
@Injectable()
export class ConfirmarEntrega {
  constructor(
    private readonly reclamaciones: ReclamacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cambiarEstado: CambiarEstadoPublicacion,
  ) {}

  async ejecutar(reclamacionId: string, solicitanteId: string): Promise<Reclamacion> {
    const reclamacion = await this.reclamaciones.buscarPorId(reclamacionId);
    if (!reclamacion) throw new NoEncontradoError('Reclamación no encontrada');
    const publicacion = await this.publicaciones.buscarPorId(reclamacion.publicacionId);
    const esParte = solicitanteId === reclamacion.reclamanteId || solicitanteId === publicacion?.autorId;
    if (!publicacion || !esParte) {
      throw new PermisoDenegadoError('solo quien reclamó o quien encontró el objeto confirma la entrega');
    }
    const entregada = reclamacion.confirmarEntrega(new Date().toISOString());
    const cambio = await this.cambiarEstado.ejecutar(publicacion.id, 'por_entregar', 'reclamado');
    if (!cambio) throw new ConflictoError('el estado del objeto cambió; vuelve a cargar');
    await this.reclamaciones.guardar(entregada);
    return entregada;
  }
}

/** Lo que ve quien publicó el objeto: la prueba, y el contacto del reclamante solo si aprobó. */
export interface VistaReclamacionParaAutor {
  id: string;
  publicacionId: string;
  estado: string;
  prueba: string;
  creadoEn: string;
  resueltaEn: string | null;
  motivoRechazo: string | null;
  entregadaEn: string | null;
  reclamante: { nombre: string; correo?: string };
}

/** Lo que ve quien reclamó: el estado, y el contacto de quien encontró el objeto solo si se aprobó. */
export interface VistaReclamacionPropia {
  id: string;
  publicacionId: string;
  estado: string;
  creadoEn: string;
  resueltaEn: string | null;
  motivoRechazo: string | null;
  entregadaEn: string | null;
  contactoQuienEncontro?: { nombre: string; correo: string };
}

@Injectable()
export class ConsultarReclamaciones {
  constructor(
    private readonly reclamaciones: ReclamacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cuentas: CuentaRepository,
  ) {}

  async dePublicacion(publicacionId: string, solicitanteId: string): Promise<VistaReclamacionParaAutor[]> {
    const publicacion = await this.publicaciones.buscarPorId(publicacionId);
    if (!publicacion) throw new NoEncontradoError('Publicación no encontrada');
    if (publicacion.autorId !== solicitanteId) {
      throw new PermisoDenegadoError('solo quien publicó el objeto puede ver sus reclamaciones');
    }
    const lista = await this.reclamaciones.listarPorPublicacion(publicacionId);
    return Promise.all(
      lista.map(async (r) => {
        const cuenta = await this.cuentas.buscarPorId(r.reclamanteId);
        return {
          id: r.id,
          publicacionId: r.publicacionId,
          estado: r.estado,
          prueba: r.prueba,
          creadoEn: r.creadoEn,
          resueltaEn: r.resueltaEn,
          motivoRechazo: r.motivoRechazo,
          entregadaEn: r.entregadaEn,
          reclamante: {
            nombre: cuenta?.nombre ?? 'cuenta eliminada',
            ...(r.estado === 'aprobada' && cuenta ? { correo: cuenta.correo } : {}),
          },
        };
      }),
    );
  }

  async propias(reclamanteId: string): Promise<VistaReclamacionPropia[]> {
    const lista = await this.reclamaciones.listarPorReclamante(reclamanteId);
    return Promise.all(
      lista.map(async (r) => {
        const vista: VistaReclamacionPropia = {
          id: r.id,
          publicacionId: r.publicacionId,
          estado: r.estado,
          creadoEn: r.creadoEn,
          resueltaEn: r.resueltaEn,
          motivoRechazo: r.motivoRechazo,
          entregadaEn: r.entregadaEn,
        };
        if (r.estado === 'aprobada') {
          const publicacion = await this.publicaciones.buscarPorId(r.publicacionId);
          const autor = publicacion?.autorId ? await this.cuentas.buscarPorId(publicacion.autorId) : null;
          if (autor) vista.contactoQuienEncontro = { nombre: autor.nombre, correo: autor.correo };
        }
        return vista;
      }),
    );
  }
}
