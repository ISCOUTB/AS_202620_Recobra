import { DatoInvalidoError } from '../errors/errores-de-dominio';

/** Solo se aceptan correos institucionales (escenario S2, ADR-0013). */
export const DOMINIO_INSTITUCIONAL = 'utb.edu.co';
const FORMATO_CORREO = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+[a-z]{2,}$/;

export interface DatosCuenta {
  id: string;
  correo: string;
  nombre: string;
  /** Hash de la contraseña (nunca la contraseña): lo produce el adaptador de hash. */
  hashContrasena: string;
  creadoEn: string;
}

/**
 * Cuenta de usuario del contexto Identidad. El correo es la identidad: se
 * guarda en minúsculas y debe ser del dominio institucional, que es el
 * mecanismo de verificación que fija el escenario S2.
 */
export class Cuenta {
  readonly id: string;
  readonly correo: string;
  readonly nombre: string;
  readonly hashContrasena: string;
  readonly creadoEn: string;

  constructor({ id, correo, nombre, hashContrasena, creadoEn }: DatosCuenta) {
    const correoNormalizado = Cuenta.normalizarCorreo(correo);
    Cuenta.validar(correoNormalizado, nombre);
    this.id = id;
    this.correo = correoNormalizado;
    this.nombre = nombre.trim();
    this.hashContrasena = hashContrasena;
    this.creadoEn = creadoEn;
  }

  static normalizarCorreo(correo: string): string {
    return (correo ?? '').trim().toLowerCase();
  }

  static validar(correo: string, nombre: string): void {
    if (!FORMATO_CORREO.test(correo)) {
      throw new DatoInvalidoError('correo no tiene un formato válido');
    }
    if (!correo.endsWith(`@${DOMINIO_INSTITUCIONAL}`)) {
      throw new DatoInvalidoError(`correo debe ser institucional (@${DOMINIO_INSTITUCIONAL})`);
    }
    if (!nombre || nombre.trim().length < 2 || nombre.trim().length > 80) {
      throw new DatoInvalidoError('nombre debe tener entre 2 y 80 caracteres');
    }
  }

  static validarContrasena(contrasena: string): void {
    if (typeof contrasena !== 'string' || contrasena.length < 8 || contrasena.length > 128) {
      throw new DatoInvalidoError('contrasena debe tener entre 8 y 128 caracteres');
    }
  }

  /** Lo que se puede mostrar de la cuenta: nunca el hash. */
  vistaPublica() {
    return { id: this.id, correo: this.correo, nombre: this.nombre };
  }
}
