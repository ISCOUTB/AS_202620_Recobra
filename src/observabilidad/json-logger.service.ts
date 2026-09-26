import { LoggerService } from '@nestjs/common';

/**
 * Logger estructurado (JSON por línea) para evidencia S8. Sin dependencias
 * nuevas: NestJS ya inyecta un LoggerService en todo el framework (HTTP,
 * lifecycle, errores); esta implementación solo cambia el formato de salida
 * de texto plano a JSON con campos fijos, para que un proveedor de logs
 * (Render, CloudWatch, etc.) los pueda indexar por campo.
 */
export class JsonLoggerService implements LoggerService {
  private linea(level: string, message: unknown, context?: string, extra?: Record<string, unknown>) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'App',
      message,
      ...extra,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  }

  log(message: unknown, context?: string) {
    this.linea('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.linea('error', message, context, trace ? { trace } : undefined);
  }

  warn(message: unknown, context?: string) {
    this.linea('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.linea('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.linea('verbose', message, context);
  }
}
