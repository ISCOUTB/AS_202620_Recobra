/**
 * Errores de dominio de Identidad y Reclamaciones. El dominio los nombra sin
 * saber nada de HTTP; `ErroresDeDominioFilter` (adaptador HTTP) los traduce a
 * 400, 401, 403, 404 y 409 con el esquema de error único.
 */
export class DatoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'DatoInvalidoError';
  }
}

/** No hay sesión válida (falta el token, es incorrecto o venció). */
export class NoAutenticadoError extends Error {
  constructor(mensaje = 'Debes iniciar sesión') {
    super(mensaje);
    this.name = 'NoAutenticadoError';
  }
}

/** Hay sesión, pero esa cuenta no puede hacer la operación. */
export class PermisoDenegadoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'PermisoDenegadoError';
  }
}

export class NoEncontradoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'NoEncontradoError';
  }
}

/** La operación choca con el estado actual (correo ya usado, reclamación repetida, transición inválida). */
export class ConflictoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ConflictoError';
  }
}
