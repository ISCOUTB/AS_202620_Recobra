import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { HashContrasenas } from '../../domain/ports/hash-contrasenas';

const derivarClave = promisify(scrypt) as (clave: string, sal: Buffer, largo: number) => Promise<Buffer>;
const LARGO = 64;

/**
 * scrypt de la biblioteca estándar de Node (sin dependencias nuevas, ADR-0013),
 * con sal aleatoria de 16 bytes por contraseña. Formato guardado:
 * `scrypt$<sal base64>$<hash base64>`. La comparación es de tiempo constante.
 */
@Injectable()
export class ScryptHashContrasenas extends HashContrasenas {
  async derivar(contrasena: string): Promise<string> {
    const sal = randomBytes(16);
    const hash = await derivarClave(contrasena, sal, LARGO);
    return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
  }

  async verificar(contrasena: string, guardado: string): Promise<boolean> {
    const [algoritmo, salB64, hashB64] = (guardado ?? '').split('$');
    if (algoritmo !== 'scrypt' || !salB64 || !hashB64) return false;
    const esperado = Buffer.from(hashB64, 'base64');
    const calculado = await derivarClave(contrasena, Buffer.from(salB64, 'base64'), esperado.length);
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  }
}
