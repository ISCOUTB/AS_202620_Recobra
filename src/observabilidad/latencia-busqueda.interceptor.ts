import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricasService } from './metricas.service';

/**
 * Mide la duración real de GET /publicaciones (búsqueda con filtros) y la
 * registra en MetricasService, ligada al escenario S1 (p95 <= 400 ms). Las
 * peticiones que terminan en error se cuentan aparte y no entran en los
 * percentiles, para que un fallo rápido no mejore la latencia aparente.
 */
@Injectable()
export class LatenciaBusquedaInterceptor implements NestInterceptor {
  constructor(private readonly metricas: MetricasService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const inicio = process.hrtime.bigint();
    return next.handle().pipe(
      tap(() => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        this.metricas.registrarLatenciaBusqueda(ms);
      }),
      catchError((error: unknown) => {
        this.metricas.registrarErrorBusqueda();
        return throwError(() => error);
      }),
    );
  }
}
