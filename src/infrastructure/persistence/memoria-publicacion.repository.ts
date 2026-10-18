import { Injectable } from '@nestjs/common';
import {
  Custodia,
  ESTADOS_ACTIVOS,
  EstadoPublicacion,
  MotivoCierre,
  Publicacion,
  TipoPublicacion,
} from '../../domain/entities/publicacion';
import { FiltrosBusqueda, PublicacionRepository } from '../../domain/ports/publicacion-repository';

@Injectable()
export class MemoriaPublicacionRepository extends PublicacionRepository {
  private readonly publicaciones = new Map<string, Publicacion>();

  async guardar(publicacion: Publicacion): Promise<Publicacion> {
    this.publicaciones.set(publicacion.id, publicacion);
    return publicacion;
  }

  // Atómico: el bucle de eventos de Node no intercala otra petición entre la
  // comprobación y la escritura, porque no hay ningún await en medio.
  async guardarSiNoExiste(publicacion: Publicacion): Promise<boolean> {
    if (this.publicaciones.has(publicacion.id)) return false;
    this.publicaciones.set(publicacion.id, publicacion);
    return true;
  }

  async cambiarEstado(id: string, de: EstadoPublicacion, a: EstadoPublicacion): Promise<boolean> {
    const actual = this.publicaciones.get(id);
    if (!actual || actual.estado !== de) return false;
    this.publicaciones.set(id, new Publicacion({ ...actual, estado: a }));
    return true;
  }

  async cerrar(id: string, motivo: MotivoCierre, fecha: string): Promise<boolean> {
    const actual = this.publicaciones.get(id);
    if (!actual || actual.estado !== 'publicado') return false;
    this.publicaciones.set(id, new Publicacion({ ...actual, estado: 'cerrado', motivoCierre: motivo, cerradoEn: fecha }));
    return true;
  }

  async cambiarCustodia(id: string, custodia: Custodia, punto: string | null): Promise<boolean> {
    const actual = this.publicaciones.get(id);
    if (!actual) return false;
    this.publicaciones.set(id, new Publicacion({ ...actual, custodia, puntoCustodia: punto }));
    return true;
  }

  async cerrarVencidas(creadasAntesDe: string, fecha: string): Promise<number> {
    let cerradas = 0;
    for (const p of this.publicaciones.values()) {
      if (p.estado === 'publicado' && p.creadoEn < creadasAntesDe && (await this.cerrar(p.id, 'vencido', fecha))) {
        cerradas++;
      }
    }
    return cerradas;
  }

  async listarPorAutor(autorId: string): Promise<Publicacion[]> {
    return [...this.publicaciones.values()]
      .filter((p) => p.autorId === autorId)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }

  async buscarPorId(id: string): Promise<Publicacion | null> {
    return this.publicaciones.get(id) ?? null;
  }

  async listarPorTipo(tipo: TipoPublicacion): Promise<Publicacion[]> {
    return [...this.publicaciones.values()].filter((p) => p.tipo === tipo);
  }

  async buscar({ tipo, categoria, ubicacion, limite }: FiltrosBusqueda): Promise<Publicacion[]> {
    return [...this.publicaciones.values()]
      .filter((p) => ESTADOS_ACTIVOS.includes(p.estado))
      .filter((p) => !tipo || p.tipo === tipo)
      .filter((p) => !categoria || p.categoria.trim().toLowerCase() === categoria)
      .filter((p) => !ubicacion || p.ubicacion.trim().toLowerCase() === ubicacion)
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
      .slice(0, limite);
  }
}
