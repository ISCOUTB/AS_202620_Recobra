import { CanActivate, ExecutionContext, Injectable, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { Cuenta } from '../domain/entities/cuenta';
import { ResolverSesion } from '../application/use-cases/identidad';

type PeticionConCuenta = Request & { cuenta?: Cuenta; token?: string };

/** Extrae el token de `Authorization: Bearer <token>`. */
export function tokenDe(peticion: Request): string | undefined {
  const cabecera = peticion.headers.authorization ?? '';
  const [esquema, token] = cabecera.split(' ');
  return esquema?.toLowerCase() === 'bearer' && token ? token : undefined;
}

/**
 * Exige una sesión válida (ADR-0013). Si falta o no sirve, ResolverSesion lanza
 * NoAutenticadoError y el filtro de errores de dominio responde 401.
 */
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(private readonly resolverSesion: ResolverSesion) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<PeticionConCuenta>();
    const token = tokenDe(peticion);
    peticion.cuenta = await this.resolverSesion.ejecutar(token);
    peticion.token = token;
    return true;
  }
}

/** Cuenta de la sesión actual; solo en rutas protegidas por AutenticacionGuard. */
export const CuentaActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): Cuenta =>
    contexto.switchToHttp().getRequest<PeticionConCuenta>().cuenta as Cuenta,
);

/** Token de la sesión actual (para cerrarla). */
export const TokenActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): string =>
    contexto.switchToHttp().getRequest<PeticionConCuenta>().token as string,
);
