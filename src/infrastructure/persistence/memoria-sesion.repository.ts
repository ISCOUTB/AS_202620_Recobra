import { Injectable } from '@nestjs/common';
import { Sesion } from '../../domain/entities/sesion';
import { SesionRepository } from '../../domain/ports/sesion-repository';

@Injectable()
export class MemoriaSesionRepository extends SesionRepository {
  private readonly sesiones = new Map<string, Sesion>();

  async guardar(sesion: Sesion): Promise<void> {
    this.sesiones.set(sesion.tokenHash, sesion);
  }

  async buscarPorTokenHash(tokenHash: string): Promise<Sesion | null> {
    return this.sesiones.get(tokenHash) ?? null;
  }

  async eliminar(tokenHash: string): Promise<void> {
    this.sesiones.delete(tokenHash);
  }
}
