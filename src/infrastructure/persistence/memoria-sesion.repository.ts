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

  async eliminarDeCuenta(cuentaId: string): Promise<void> {
    for (const [hash, s] of this.sesiones) if (s.cuentaId === cuentaId) this.sesiones.delete(hash);
  }

  async eliminarExpiradas(ahora: string): Promise<number> {
    let borradas = 0;
    for (const [hash, s] of this.sesiones) {
      if (s.expiraEn <= ahora) {
        this.sesiones.delete(hash);
        borradas++;
      }
    }
    return borradas;
  }
}
