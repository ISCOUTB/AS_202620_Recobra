import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PublicacionInvalidaError } from '../domain/entities/publicacion';

/**
 * El dominio (`Publicacion.validar`) lanza `PublicacionInvalidaError` sin
 * saber nada de HTTP. Este filtro es la única pieza que traduce ese error
 * de negocio a un código de transporte (400) - la misma responsabilidad
 * que tenía el bloque try/catch en el adaptador Express original.
 * Responde con el mismo formato `{ statusCode, message }` que usa Nest para
 * 404/500, así el contrato tiene un solo esquema de error (`Error`).
 */
@Catch(PublicacionInvalidaError)
export class PublicacionInvalidaFilter implements ExceptionFilter {
  catch(exception: PublicacionInvalidaError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response
      .status(HttpStatus.BAD_REQUEST)
      .json({ statusCode: HttpStatus.BAD_REQUEST, message: exception.message });
  }
}
