/**
 * Puerto para derivar y comprobar hashes de contraseñas. El dominio y los
 * casos de uso no conocen el algoritmo (hoy scrypt, ver ADR-0013).
 */
export abstract class HashContrasenas {
  abstract derivar(contrasena: string): Promise<string>;
  abstract verificar(contrasena: string, hash: string): Promise<boolean>;
}
