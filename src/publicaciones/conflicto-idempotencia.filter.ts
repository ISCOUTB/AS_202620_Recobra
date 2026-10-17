import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ConflictoIdempotenciaError } from '../application/errors/conflicto-idempotencia.error';

/** Clave de idempotencia reutilizada con otro contenido: 422, con el esquema de error único. */
@Catch(ConflictoIdempotenciaError)
export class ConflictoIdempotenciaFilter implements ExceptionFilter {
  catch(exception: ConflictoIdempotenciaError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json({ statusCode: HttpStatus.UNPROCESSABLE_ENTITY, message: exception.message });
  }
}
