import { Injectable } from '@nestjs/common';
import { Publicacion } from '../../domain/entities/publicacion';
import { ConflictoError, NoEncontradoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

/** Días que una publicación sin movimiento sigue visible antes de cerrarse sola. */
export const DIAS_VIGENCIA_POR_DEFECTO = 60;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Cerrar una publicación propia (ADR-0017): "recuperado" (solo objetos
 * perdidos: ya apareció) o "retirado" (ya no se necesita). Solo mientras nadie
 * la reclama; una publicación cerrada sale de la búsqueda y del emparejamiento.
 */
@Injectable()
export class CerrarPublicacion {
  constructor(private readonly publicaciones: PublicacionRepository) {}

  async ejecutar(id: string, solicitanteId: string, motivo: string): Promise<Publicacion> {
    const publicacion = await this.publicaciones.buscarPorId(id);
    if (!publicacion) throw new NoEncontradoError('Publicación no encontrada');
    if (publicacion.autorId !== solicitanteId) {
      throw new PermisoDenegadoError('solo quien publicó el objeto puede cerrar la publicación');
    }
    const motivoValido = Publicacion.exigirCierre(publicacion, motivo);
    const cerrada = await this.publicaciones.cerrar(id, motivoValido, new Date().toISOString());
    if (!cerrada) throw new ConflictoError('el estado de la publicación cambió; vuelve a cargar');
    return (await this.publicaciones.buscarPorId(id)) as Publicacion;
  }
}

/**
 * Vencimiento (ADR-0017): lo que lleva más de `dias` en "publicado", sin
 * reclamaciones, se cierra como "vencido" para que la búsqueda no se llene de
 * avisos viejos ni genere coincidencias falsas.
 */
@Injectable()
export class ArchivarVencidas {
  constructor(private readonly publicaciones: PublicacionRepository) {}

  ejecutar(ahora: Date = new Date(), dias: number = DIAS_VIGENCIA_POR_DEFECTO): Promise<number> {
    const limite = new Date(ahora.getTime() - dias * MS_POR_DIA).toISOString();
    return this.publicaciones.cerrarVencidas(limite, ahora.toISOString());
  }
}
