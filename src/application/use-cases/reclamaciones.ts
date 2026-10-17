import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { ConflictoError, NoEncontradoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';
import { CambiarEstadoPublicacion } from './cambiar-estado-publicacion';

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
    if (publicacion.estado === 'reclamado') {
      throw new ConflictoError('este objeto ya fue entregado a su dueño');
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
    return reclamacion;
  }
}

@Injectable()
export class ResolverReclamacion {
  constructor(
    private readonly reclamaciones: ReclamacionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly cambiarEstado: CambiarEstadoPublicacion,
  ) {}

  /**
   * Quien publicó el objeto aprueba la reclamación: es la única forma de que
   * la publicación llegue a "reclamado". Las demás reclamaciones pendientes del
   * mismo objeto se rechazan.
   */
  async aprobar(reclamacionId: string, solicitanteId: string): Promise<Reclamacion> {
    const reclamacion = await this.cargarParaResolver(reclamacionId, solicitanteId);
    const aprobada = reclamacion.aprobar(new Date().toISOString());

    const cambio = await this.cambiarEstado.ejecutar(reclamacion.publicacionId, 'en_verificacion', 'reclamado');
    if (!cambio) throw new ConflictoError('el estado del objeto cambió; vuelve a cargar las reclamaciones');
    await this.reclamaciones.guardar(aprobada);

    const pendientes = (await this.reclamaciones.listarPorPublicacion(reclamacion.publicacionId)).filter(
      (r) => r.estado === 'pendiente' && r.id !== reclamacion.id,
    );
    for (const otra of pendientes) {
      await this.reclamaciones.guardar(otra.rechazar(aprobada.resueltaEn as string, 'Otra reclamación fue aprobada'));
    }
    return aprobada;
  }

  /** Rechaza con un motivo; si no quedan pendientes, el objeto vuelve a "publicado". */
  async rechazar(reclamacionId: string, solicitanteId: string, motivo: string): Promise<Reclamacion> {
    const reclamacion = await this.cargarParaResolver(reclamacionId, solicitanteId);
    const rechazada = reclamacion.rechazar(new Date().toISOString(), motivo);
    await this.reclamaciones.guardar(rechazada);

    const quedan = (await this.reclamaciones.listarPorPublicacion(reclamacion.publicacionId)).some(
      (r) => r.estado === 'pendiente',
    );
    if (!quedan) await this.cambiarEstado.ejecutar(reclamacion.publicacionId, 'en_verificacion', 'publicado');
    return rechazada;
  }

  private async cargarParaResolver(reclamacionId: string, solicitanteId: string): Promise<Reclamacion> {
    const reclamacion = await this.reclamaciones.buscarPorId(reclamacionId);
    if (!reclamacion) throw new NoEncontradoError('Reclamación no encontrada');
    const publicacion = await this.publicaciones.buscarPorId(reclamacion.publicacionId);
    if (!publicacion || publicacion.autorId !== solicitanteId) {
      throw new PermisoDenegadoError('solo quien publicó el objeto puede resolver sus reclamaciones');
    }
    return reclamacion;
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
