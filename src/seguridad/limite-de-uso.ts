import { createHash } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { LimiteDeUsoExcedidoError } from '../domain/errors/errores-de-dominio';

/**
 * Límites de uso (ADR-0028, modelo de amenazas T05 y T06). Sin ellos, una sola
 * cuenta puede llenar la base compartida con publicaciones y fotos de 1 MB, o
 * inundar de reportes y reclamaciones a las demás personas.
 *
 * Una regla dice cuántas veces se puede hacer algo en una ventana de tiempo. Se
 * cuenta por **cuenta** cuando hay sesión (lo que no se ve afectado por quién
 * comparte el Wi-Fi) y por **origen** cuando no la hay (crear cuenta, iniciar
 * sesión). Los límites por origen son holgados a propósito: detrás de la red del
 * campus muchas personas salen por la misma dirección.
 */
export interface ReglaDeLimite {
  /** Cuántas veces se permite dentro de la ventana. */
  maximo: number;
  ventanaMs: number;
  /** Cómo se nombra en el mensaje: "publicaciones", "reportes"… */
  descripcion: string;
  /** Con sesión se cuenta por cuenta; sin ella, por origen. */
  por: 'cuenta' | 'origen';
}

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

export const REGLAS_DE_LIMITE = {
  /** Un uso normal publica unas pocas veces al día; 20 por hora deja margen de sobra. */
  publicar: { maximo: 20, ventanaMs: HORA, descripcion: 'publicaciones', por: 'cuenta' },
  reclamar: { maximo: 10, ventanaMs: HORA, descripcion: 'reclamaciones', por: 'cuenta' },
  reportar: { maximo: 20, ventanaMs: 24 * HORA, descripcion: 'reportes', por: 'cuenta' },
  foto: { maximo: 30, ventanaMs: HORA, descripcion: 'cambios de foto', por: 'cuenta' },
  /** Por origen y holgado: la red del campus comparte dirección. Frena el registro automatizado, no a las personas. */
  cuentaNueva: { maximo: 60, ventanaMs: HORA, descripcion: 'cuentas nuevas desde esta conexión', por: 'origen' },
  /** Se suma al límite de 5 fallos por correo (ADR-0021); este protege contra probar muchos correos desde un mismo origen. */
  sesion: { maximo: 300, ventanaMs: 15 * MINUTO, descripcion: 'inicios de sesión desde esta conexión', por: 'origen' },
} as const satisfies Record<string, ReglaDeLimite>;

export type NombreDeRegla = keyof typeof REGLAS_DE_LIMITE;

const CLAVES_MAXIMAS = 20_000;

/**
 * Contador por ventana fija en la memoria del proceso: simple y sin
 * dependencias. Límites que se conocen (ADR-0028): con varias instancias cada
 * una contaría por su lado, un reinicio los pone en cero, y en el borde de la
 * ventana alguien puede hacer hasta el doble de lo permitido en un instante.
 */
@Injectable()
export class LimiteDeUso {
  private readonly ventanas = new Map<string, { inicio: number; cuenta: number }>();
  private readonly logger = new Logger('Seguridad');

  /** Reglas vigentes; las pruebas las reemplazan por unas holgadas, o por unas mínimas para probar el 429. */
  reglas: Record<NombreDeRegla, ReglaDeLimite> = REGLAS_DE_LIMITE;
  /** Cuántas veces se excedió cada regla desde que arrancó el proceso (para `GET /metrics`). */
  readonly excedidos: Partial<Record<NombreDeRegla, number>> = {};
  /** El reloj se puede cambiar en las pruebas. */
  reloj: () => number = Date.now;

  /** Cuenta un uso; lanza `LimiteDeUsoExcedidoError` si ya se pasó del máximo de la ventana. */
  /** Cuenta la petición y devuelve cuántas quedan en la ventana; si se pasó del máximo, lanza `LimiteDeUsoExcedidoError`. */
  consumir(nombre: NombreDeRegla, clave: string): number {
    const regla = this.reglas[nombre];
    const ahora = this.reloj();
    if (this.ventanas.size >= CLAVES_MAXIMAS) this.podar(ahora);

    const id = `${nombre}:${clave}`;
    let ventana = this.ventanas.get(id);
    if (!ventana || ahora - ventana.inicio >= regla.ventanaMs) {
      ventana = { inicio: ahora, cuenta: 0 };
      this.ventanas.set(id, ventana);
    }
    ventana.cuenta += 1;
    if (ventana.cuenta > regla.maximo) {
      this.excedidos[nombre] = (this.excedidos[nombre] ?? 0) + 1;
      const esperarSegundos = Math.max(1, Math.ceil((ventana.inicio + regla.ventanaMs - ahora) / 1000));
      // Sin la dirección ni el id en claro: una huella corta alcanza para ver si es siempre la misma.
      this.logger.warn({ evento: 'seguridad.limite_excedido', regla: nombre, origen: huellaDe(clave), esperarSegundos });
      throw new LimiteDeUsoExcedidoError(regla.descripcion, esperarSegundos);
    }
    return regla.maximo - ventana.cuenta;
  }

  private podar(ahora: number): void {
    for (const [id, ventana] of this.ventanas) {
      const regla = this.reglas[id.slice(0, id.indexOf(':')) as NombreDeRegla];
      if (!regla || ahora - ventana.inicio >= regla.ventanaMs) this.ventanas.delete(id);
    }
  }
}

function huellaDe(clave: string): string {
  return createHash('sha256').update(clave).digest('hex').slice(0, 8);
}

const CLAVE_DE_REGLA = 'limite-de-uso';

/** Marca una ruta con la regla de límite que le toca. Va junto con `@UseGuards(…, LimiteGuard)`, después de la autenticación. */
export const Limitar = (regla: NombreDeRegla) => SetMetadata(CLAVE_DE_REGLA, regla);

type PeticionConCuenta = Request & { cuenta?: { id: string } };

/**
 * Aplica la regla de `@Limitar`. Debe ir DESPUÉS del guardia de autenticación,
 * que es el que deja la cuenta en la petición: con cuenta se cuenta por cuenta;
 * sin ella, por origen (`req.ip`, que detrás de un proxy de confianza es la
 * dirección real del cliente; ver `configurarSeguridad`).
 */
@Injectable()
export class LimiteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limite: LimiteDeUso,
  ) {}

  canActivate(contexto: ExecutionContext): boolean {
    const nombre = this.reflector.get<NombreDeRegla | undefined>(CLAVE_DE_REGLA, contexto.getHandler());
    if (!nombre) return true;
    const peticion = contexto.switchToHttp().getRequest<PeticionConCuenta>();
    const regla = this.limite.reglas[nombre];
    const clave = regla.por === 'cuenta' && peticion.cuenta ? `cuenta:${peticion.cuenta.id}` : `origen:${peticion.ip ?? 'desconocido'}`;
    return this.limite.consumir(nombre, clave) >= 0;
  }
}
