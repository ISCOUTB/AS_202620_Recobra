import { Injectable } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';

@Injectable()
export class MemoriaCuentaRepository extends CuentaRepository {
  private readonly porId = new Map<string, Cuenta>();
  private readonly idPorCorreo = new Map<string, string>();

  // Atómico: no hay await entre la comprobación y la escritura.
  async guardarSiCorreoLibre(cuenta: Cuenta): Promise<boolean> {
    if (this.idPorCorreo.has(cuenta.correo)) return false;
    this.porId.set(cuenta.id, cuenta);
    this.idPorCorreo.set(cuenta.correo, cuenta.id);
    return true;
  }

  async buscarPorCorreo(correo: string): Promise<Cuenta | null> {
    const id = this.idPorCorreo.get(correo);
    return id ? (this.porId.get(id) ?? null) : null;
  }

  async buscarPorId(id: string): Promise<Cuenta | null> {
    return this.porId.get(id) ?? null;
  }
}
