import { Injectable } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import { Foto } from '../../domain/entities/foto';
import { Publicacion } from '../../domain/entities/publicacion';
import {
  ConflictoError,
  DatoInvalidoError,
  NoEncontradoError,
  PermisoDenegadoError,
} from '../../domain/errors/errores-de-dominio';
import { FotoRepository } from '../../domain/ports/foto-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Decodifica la miniatura que llega en base64 (cabecera X-Miniatura); rechaza lo que no sea base64 estricto. */
function decodificarMiniatura(valor: unknown): Buffer {
  if (typeof valor !== 'string' || valor.length === 0) {
    throw new DatoInvalidoError('falta la miniatura (cabecera X-Miniatura con un JPEG pequeño en base64)');
  }
  if (!BASE64.test(valor) || valor.length % 4 !== 0) throw new DatoInvalidoError('la miniatura no es base64 válido');
  return Buffer.from(valor, 'base64');
}

/** Sólo quien publicó la maneja, y sólo mientras nadie la reclama (no se cambia la prueba a mitad de una verificación). */
function exigirAutorSinReclamo(publicacion: Publicacion | null, cuenta: Cuenta): Publicacion {
  if (!publicacion) throw new NoEncontradoError('Publicación no encontrada');
  if (publicacion.autorId !== cuenta.id) throw new PermisoDenegadoError('solo quien publicó puede cambiar su foto');
  if (publicacion.estado !== 'publicado') {
    throw new ConflictoError('la foto solo se cambia mientras la publicación no tenga una reclamación en curso ni esté cerrada');
  }
  return publicacion;
}

/** Agregar o reemplazar la foto de una publicación propia (ADR-0023). */
@Injectable()
export class SubirFoto {
  constructor(
    private readonly fotos: FotoRepository,
    private readonly publicaciones: PublicacionRepository,
  ) {}

  async ejecutar(publicacionId: string, cuenta: Cuenta, completa: unknown, miniaturaBase64: unknown): Promise<Publicacion> {
    exigirAutorSinReclamo(await this.publicaciones.buscarPorId(publicacionId), cuenta);
    const foto = Foto.crear(publicacionId, completa, decodificarMiniatura(miniaturaBase64), new Date().toISOString());
    await this.fotos.guardar(foto);
    await this.publicaciones.marcarFoto(publicacionId, true);
    return (await this.publicaciones.buscarPorId(publicacionId)) as Publicacion;
  }
}

/** Quitar la foto de una publicación propia. */
@Injectable()
export class QuitarFoto {
  constructor(
    private readonly fotos: FotoRepository,
    private readonly publicaciones: PublicacionRepository,
  ) {}

  async ejecutar(publicacionId: string, cuenta: Cuenta): Promise<Publicacion> {
    exigirAutorSinReclamo(await this.publicaciones.buscarPorId(publicacionId), cuenta);
    await this.fotos.eliminar(publicacionId);
    await this.publicaciones.marcarFoto(publicacionId, false);
    return (await this.publicaciones.buscarPorId(publicacionId)) as Publicacion;
  }
}

export type VarianteFoto = 'completa' | 'miniatura';

/**
 * Leer la foto de una publicación (ADR-0023). La miniatura es pública. La foto
 * completa de un objeto perdido también (quien lo perdió quiere que lo
 * encuentren); la de un objeto encontrado es la mejor prueba de que algo es
 * tuyo, así que solo la ven quien lo publicó y quien lo reclamó cuando su
 * reclamación ya fue aprobada.
 */
@Injectable()
export class ObtenerFoto {
  constructor(
    private readonly fotos: FotoRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly reclamaciones: ReclamacionRepository,
  ) {}

  async ejecutar(publicacionId: string, cuenta: Cuenta | null, variante: VarianteFoto): Promise<Buffer> {
    const publicacion = await this.publicaciones.buscarPorId(publicacionId);
    if (!publicacion) throw new NoEncontradoError('Publicación no encontrada');
    if (variante === 'completa' && !(await this.puedeVerCompleta(publicacion, cuenta))) {
      throw new PermisoDenegadoError(
        'la foto completa de un objeto encontrado solo la ven quien lo publicó y, tras aprobarse su reclamación, quien lo reclamó',
      );
    }
    const foto = await this.fotos.buscarPorPublicacion(publicacionId);
    if (!foto) throw new NoEncontradoError('Esta publicación no tiene foto');
    return variante === 'completa' ? foto.completa : foto.miniatura;
  }

  private async puedeVerCompleta(publicacion: Publicacion, cuenta: Cuenta | null): Promise<boolean> {
    if (publicacion.tipo === 'perdido') return true;
    if (!cuenta) return false;
    if (publicacion.autorId === cuenta.id) return true;
    const reclamaciones = await this.reclamaciones.listarPorPublicacion(publicacion.id);
    return reclamaciones.some((r) => r.reclamanteId === cuenta.id && r.estado === 'aprobada');
  }
}

/**
 * Borrar la foto de una publicación por una razón del sistema (moderación,
 * eliminación de la cuenta, retención). No exige autor: lo llaman otros casos
 * de uso que ya comprobaron quién puede hacerlo.
 */
@Injectable()
export class EliminarFotoDe {
  constructor(
    private readonly fotos: FotoRepository,
    private readonly publicaciones: PublicacionRepository,
  ) {}

  async ejecutar(publicacionId: string): Promise<boolean> {
    const habia = await this.fotos.eliminar(publicacionId);
    await this.publicaciones.marcarFoto(publicacionId, false);
    return habia;
  }
}

/**
 * Retención (ADR-0023): la foto solo sirve mientras el objeto se puede
 * reclamar. Cuando la publicación se cerró o se entregó (o ya no existe), se
 * borra; el historial queda sin imagen.
 */
@Injectable()
export class LimpiarFotosDeCerradas {
  constructor(
    private readonly fotos: FotoRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly eliminar: EliminarFotoDe,
  ) {}

  async ejecutar(limite = 500): Promise<number> {
    let borradas = 0;
    for (const id of await this.fotos.listarPublicacionIds(limite)) {
      const publicacion = await this.publicaciones.buscarPorId(id);
      const terminada = !publicacion || publicacion.estado === 'cerrado' || publicacion.estado === 'reclamado';
      if (terminada && (await this.eliminar.ejecutar(id))) borradas++;
    }
    return borradas;
  }
}
