import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Cuenta } from '../domain/entities/cuenta';
import { PermisoDenegadoError } from '../domain/errors/errores-de-dominio';
import { esAdministrador } from '../application/use-cases/moderacion';

/**
 * Exige que la cuenta de la sesión sea administradora (ADR-0022). Va después de
 * `AutenticacionGuard`, que es quien resuelve la sesión.
 */
@Injectable()
export class AdministradorGuard implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const cuenta = contexto.switchToHttp().getRequest<Request & { cuenta?: Cuenta }>().cuenta;
    if (!cuenta || !esAdministrador(cuenta)) throw new PermisoDenegadoError('solo los administradores pueden hacer esto');
    return true;
  }
}
