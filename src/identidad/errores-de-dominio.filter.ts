import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictoError,
  DatoInvalidoError,
  DemasiadosIntentosError,
  NoAutenticadoError,
  NoEncontradoError,
  PermisoDenegadoError,
} from '../domain/errors/errores-de-dominio';

type ErrorDeDominio =
  | DatoInvalidoError
  | NoAutenticadoError
  | PermisoDenegadoError
  | NoEncontradoError
  | ConflictoError
  | DemasiadosIntentosError;

/**
 * Traduce los errores de dominio de Identidad y Reclamaciones a HTTP con el
 * esquema de error único `{ statusCode, message }` (ADR-0009).
 */
@Catch(DatoInvalidoError, NoAutenticadoError, PermisoDenegadoError, NoEncontradoError, ConflictoError, DemasiadosIntentosError)
export class ErroresDeDominioFilter implements ExceptionFilter {
  catch(error: ErrorDeDominio, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const estado = ErroresDeDominioFilter.estadoDe(error);
    if (estado === HttpStatus.UNAUTHORIZED) respuesta.setHeader('WWW-Authenticate', 'Bearer');
    if (error instanceof DemasiadosIntentosError) respuesta.setHeader('Retry-After', String(error.esperarSegundos));
    respuesta.status(estado).json({ statusCode: estado, message: error.message });
  }

  static estadoDe(error: ErrorDeDominio): number {
    if (error instanceof DatoInvalidoError) return HttpStatus.BAD_REQUEST;
    if (error instanceof NoAutenticadoError) return HttpStatus.UNAUTHORIZED;
    if (error instanceof PermisoDenegadoError) return HttpStatus.FORBIDDEN;
    if (error instanceof NoEncontradoError) return HttpStatus.NOT_FOUND;
    if (error instanceof DemasiadosIntentosError) return HttpStatus.TOO_MANY_REQUESTS;
    return HttpStatus.CONFLICT;
  }
}
