import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import {
  ConflictoError,
  DatoInvalidoError,
  DemasiadosIntentosError,
  NoAutenticadoError,
} from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { HashContrasenas } from '../../domain/ports/hash-contrasenas';
import { SesionRepository } from '../../domain/ports/sesion-repository';
import { VERSION_AVISO_PRIVACIDAD } from '../../domain/privacidad/aviso-privacidad';
import { correosAdministradores } from './administradores';

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
  /** Autorización para tratar los datos según el aviso de privacidad (ADR-0021); debe ser `true`. */
  aceptoPrivacidad: boolean;
}

/** Contexto Identidad: alta de una cuenta con correo institucional. */
@Injectable()
export class RegistrarCuenta {
  private readonly logger = new Logger('Seguridad');

  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly hash: HashContrasenas,
  ) {}

  async ejecutar({ correo, nombre, contrasena, aceptoPrivacidad }: DatosRegistro): Promise<Cuenta> {
    if (aceptoPrivacidad !== true) {
      throw new DatoInvalidoError('debes aceptar el aviso de privacidad para crear la cuenta (aceptoPrivacidad: true)');
    }
    Cuenta.validarContrasena(contrasena);
    const ahora = new Date().toISOString();
    const cuenta = new Cuenta({
      id: randomUUID(),
      correo,
      nombre,
      hashContrasena: await this.hash.derivar(contrasena),
      creadoEn: ahora,
      privacidadAceptadaEn: ahora,
      privacidadVersion: VERSION_AVISO_PRIVACIDAD,
    });
    // La unicidad del correo la garantiza el adaptador de forma atómica.
    if (!(await this.cuentas.guardarSiCorreoLibre(cuenta))) {
      throw new ConflictoError('ya existe una cuenta con ese correo');
    }
    // Amenaza T01: registrar un correo de administrador da privilegios. Si no fue su dueño, hay que enterarse.
    if (correosAdministradores().includes(cuenta.correo)) {
      this.logger.warn({ evento: 'seguridad.registro_de_administrador', cuentaId: cuenta.id, creadaEn: cuenta.creadoEn });
    }
    return cuenta;
  }
}

/**
 * Límite de intentos fallidos de inicio de sesión (ADR-0021): 5 por correo en
 * 15 minutos; después hay que esperar. Cuenta igual los correos que no existen,
 * para no revelar cuáles tienen cuenta. Vive en la memoria del proceso: un
 * reinicio lo borra (aceptable para este alcance). El costo es que alguien
 * puede bloquear 15 minutos el acceso a un correo ajeno; no puede entrar.
 */
@Injectable()
export class ControlDeIntentos {
  static readonly MAXIMO = 5;
  static readonly VENTANA_MS = 15 * 60 * 1000;
  private static readonly CLAVES_MAXIMAS = 10_000;

  private readonly fallos = new Map<string, number[]>();

  /** El reloj se puede cambiar en las pruebas. */
  reloj: () => number = Date.now;

  /** Lanza `DemasiadosIntentosError` si esa clave ya agotó sus intentos. */
  exigirPermitido(clave: string): void {
    const recientes = this.recientes(clave);
    if (recientes.length >= ControlDeIntentos.MAXIMO) {
      const espera = Math.ceil((recientes[0] + ControlDeIntentos.VENTANA_MS - this.reloj()) / 1000);
      throw new DemasiadosIntentosError(Math.max(espera, 1));
    }
  }

  registrarFallo(clave: string): void {
    if (this.fallos.size >= ControlDeIntentos.CLAVES_MAXIMAS) this.podar();
    this.fallos.set(clave, [...this.recientes(clave), this.reloj()]);
  }

  limpiar(clave: string): void {
    this.fallos.delete(clave);
  }

  private recientes(clave: string): number[] {
    const desde = this.reloj() - ControlDeIntentos.VENTANA_MS;
    return (this.fallos.get(clave) ?? []).filter((t) => t > desde);
  }

  private podar(): void {
    for (const clave of this.fallos.keys()) {
      if (this.recientes(clave).length === 0) this.fallos.delete(clave);
    }
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
    private readonly intentos: ControlDeIntentos,
  ) {}

  async ejecutar(correo: string, contrasena: string): Promise<ResultadoInicioSesion> {
    const clave = Cuenta.normalizarCorreo(correo);
    this.intentos.exigirPermitido(clave);
    const cuenta = await this.cuentas.buscarPorCorreo(clave);
    const guardado = cuenta?.hashContrasena ?? (await this.relleno());
    const valida = typeof contrasena === 'string' && (await this.hash.verificar(contrasena, guardado));
    if (!cuenta || !valida) {
      this.intentos.registrarFallo(clave);
      throw new NoAutenticadoError('correo o contraseña incorrectos');
    }
    this.intentos.limpiar(clave);

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
