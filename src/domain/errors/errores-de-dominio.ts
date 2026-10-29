/**
 * Errores de dominio de Identidad y Reclamaciones. El dominio los nombra sin
 * saber nada de HTTP; `ErroresDeDominioFilter` (adaptador HTTP) los traduce a
 * 400, 401, 403, 404, 409 y 429 con el esquema de error único.
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

/** Demasiados intentos seguidos: hay que esperar antes de volver a probar (429). */
export class DemasiadosIntentosError extends Error {
  constructor(readonly esperarSegundos: number) {
    super(`Demasiados intentos fallidos. Espera ${Math.ceil(esperarSegundos / 60)} minuto(s) antes de volver a intentarlo.`);
    this.name = 'DemasiadosIntentosError';
  }
}

/**
 * Se pasó del límite de uso de una operación (ADR-0028): demasiadas publicaciones,
 * reportes, fotos… en poco tiempo. Es un 429 con `Retry-After`, como el de los
 * intentos de inicio de sesión, pero no es un intento fallido: es volumen.
 */
export class LimiteDeUsoExcedidoError extends Error {
  constructor(
    readonly descripcion: string,
    readonly esperarSegundos: number,
  ) {
    super(`Hiciste demasiados ${descripcion} en poco tiempo. Vuelve a intentarlo en ${formatearEspera(esperarSegundos)}.`);
    this.name = 'LimiteDeUsoExcedidoError';
  }
}

function formatearEspera(segundos: number): string {
  if (segundos < 90) return `${segundos} segundo(s)`;
  if (segundos < 90 * 60) return `${Math.ceil(segundos / 60)} minuto(s)`;
  return `${Math.ceil(segundos / 3600)} hora(s)`;
}

/** La operación choca con el estado actual (correo ya usado, reclamación repetida, transición inválida). */
export class ConflictoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ConflictoError';
  }
}
