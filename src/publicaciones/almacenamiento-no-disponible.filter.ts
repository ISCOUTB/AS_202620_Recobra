import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AlmacenamientoNoDisponibleError } from '../domain/errors/almacenamiento-no-disponible.error';

/**
 * Traduce la caída del almacenamiento a 503 con el esquema de error único
 * (`{ statusCode, message }`, ADR-0009). El mensaje es genérico a propósito:
 * no filtra el nombre del host ni de la base.
 */
@Catch(AlmacenamientoNoDisponibleError)
export class AlmacenamientoNoDisponibleFilter implements ExceptionFilter {
  catch(_exception: AlmacenamientoNoDisponibleError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'El almacenamiento no está disponible. Intenta de nuevo en unos segundos.',
      });
  }
}
