import { Controller, Get } from '@nestjs/common';
import { estadoDeSeguridad } from '../seguridad/estado-de-seguridad';
import { LimiteDeUso } from '../seguridad/limite-de-uso';
import { MetricasService } from './metricas.service';

@Controller('metrics')
export class MetricasController {
  constructor(
    private readonly metricas: MetricasService,
    private readonly limite: LimiteDeUso,
  ) {}

  @Get()
  obtener() {
    return {
      ...this.metricas.snapshot(),
      // Cuántas veces se pasó cada límite de uso desde que arrancó el proceso (ADR-0028).
      seguridad: {
        limitesExcedidos: { ...this.limite.excedidos },
        // Correos de ADMIN_CORREOS sin cuenta (amenaza T01); null hasta la primera comprobación.
        administradoresSinCuenta: estadoDeSeguridad.administradoresSinCuenta,
      },
    };
  }
}
