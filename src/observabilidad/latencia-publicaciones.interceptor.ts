import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricasService } from './metricas.service';

/**
 * Mide la duración real de POST /publicaciones en producción y la registra
 * en MetricasService (ver ADR de la métrica ligada a S5). Se aplica solo a
 * esa ruta, no globalmente, para no mezclar operaciones con umbrales
 * distintos en la misma métrica.
 */
@Injectable()
export class LatenciaPublicacionesInterceptor implements NestInterceptor {
  constructor(private readonly metricas: MetricasService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const inicio = process.hrtime.bigint();
    return next.handle().pipe(
      tap(() => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        this.metricas.registrarLatenciaPublicacion(ms);
      }),
    );
  }
}
