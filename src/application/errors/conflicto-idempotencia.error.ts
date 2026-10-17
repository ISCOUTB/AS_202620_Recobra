/**
 * Se reutilizó una clave de idempotencia con datos distintos a los de la
 * primera petición. No es un reintento legítimo (el cliente cambió lo que
 * pedía), así que no se puede devolver la publicación original como si nada:
 * el adaptador HTTP lo traduce a 422.
 */
export class ConflictoIdempotenciaError extends Error {
  constructor() {
    super('La clave de idempotencia ya se usó con datos distintos');
    this.name = 'ConflictoIdempotenciaError';
  }
}
