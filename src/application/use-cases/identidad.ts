import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import { ConflictoError, NoAutenticadoError } from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { HashContrasenas } from '../../domain/ports/hash-contrasenas';
import { SesionRepository } from '../../domain/ports/sesion-repository';

/** Duración de una sesión (ADR-0013). */
export const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;

/** Del token solo se guarda su hash (SHA-256): el token completo solo lo tiene el cliente. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface DatosRegistro {
  correo: string;
  nombre: string;
  contrasena: string;
}

/** Contexto Identidad: alta de una cuenta con correo institucional. */
@Injectable()
export class RegistrarCuenta {
  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly hash: HashContrasenas,
  ) {}

  async ejecutar({ correo, nombre, contrasena }: DatosRegistro): Promise<Cuenta> {
    Cuenta.validarContrasena(contrasena);
    const cuenta = new Cuenta({
      id: randomUUID(),
      correo,
      nombre,
      hashContrasena: await this.hash.derivar(contrasena),
      creadoEn: new Date().toISOString(),
    });
    // La unicidad del correo la garantiza el adaptador de forma atómica.
    if (!(await this.cuentas.guardarSiCorreoLibre(cuenta))) {
      throw new ConflictoError('ya existe una cuenta con ese correo');
    }
    return cuenta;
  }
}

export interface ResultadoInicioSesion {
  token: string;
  expiraEn: string;
  cuenta: Cuenta;
}

/**
 * Inicio de sesión con correo y contraseña. El mensaje de error es el mismo si
 * el correo no existe o si la contraseña no coincide, para no revelar qué
 * correos tienen cuenta; y en ambos casos se calcula un hash, para que el
 * tiempo de respuesta tampoco lo revele.
 */
@Injectable()
export class IniciarSesion {
  private hashDeRelleno?: Promise<string>;

  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly sesiones: SesionRepository,
    private readonly hash: HashContrasenas,
  ) {}

  async ejecutar(correo: string, contrasena: string): Promise<ResultadoInicioSesion> {
    const cuenta = await this.cuentas.buscarPorCorreo(Cuenta.normalizarCorreo(correo));
    const guardado = cuenta?.hashContrasena ?? (await this.relleno());
    const valida = typeof contrasena === 'string' && (await this.hash.verificar(contrasena, guardado));
    if (!cuenta || !valida) throw new NoAutenticadoError('correo o contraseña incorrectos');

    const token = randomBytes(32).toString('base64url');
    const ahora = Date.now();
    const expiraEn = new Date(ahora + DURACION_SESION_MS).toISOString();
    await this.sesiones.guardar({
      tokenHash: hashToken(token),
      cuentaId: cuenta.id,
      creadaEn: new Date(ahora).toISOString(),
      expiraEn,
    });
    return { token, expiraEn, cuenta };
  }

  private relleno(): Promise<string> {
    this.hashDeRelleno ??= this.hash.derivar(randomBytes(16).toString('hex'));
    return this.hashDeRelleno;
  }
}

/** Resuelve la cuenta de un token; si no existe o venció, NoAutenticadoError. */
@Injectable()
export class ResolverSesion {
  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly sesiones: SesionRepository,
  ) {}

  async ejecutar(token: string | undefined): Promise<Cuenta> {
    if (!token) throw new NoAutenticadoError();
    const tokenHash = hashToken(token);
    const sesion = await this.sesiones.buscarPorTokenHash(tokenHash);
    if (!sesion) throw new NoAutenticadoError('la sesión no es válida');
    if (new Date(sesion.expiraEn).getTime() <= Date.now()) {
      await this.sesiones.eliminar(tokenHash);
      throw new NoAutenticadoError('la sesión venció; inicia sesión de nuevo');
    }
    const cuenta = await this.cuentas.buscarPorId(sesion.cuentaId);
    if (!cuenta) throw new NoAutenticadoError('la sesión no es válida');
    return cuenta;
  }
}

@Injectable()
export class CerrarSesion {
  constructor(private readonly sesiones: SesionRepository) {}

  async ejecutar(token: string): Promise<void> {
    await this.sesiones.eliminar(hashToken(token));
  }
}
