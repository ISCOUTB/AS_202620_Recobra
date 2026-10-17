import { Sesion } from '../entities/sesion';

/** Puerto de persistencia de sesiones (contexto Identidad). */
export abstract class SesionRepository {
  abstract guardar(sesion: Sesion): Promise<void>;
  abstract buscarPorTokenHash(tokenHash: string): Promise<Sesion | null>;
  abstract eliminar(tokenHash: string): Promise<void>;
}
