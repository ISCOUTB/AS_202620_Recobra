import { Controller, Get } from '@nestjs/common';
import { MetricasService } from './metricas.service';

@Controller('metrics')
export class MetricasController {
  constructor(private readonly metricas: MetricasService) {}

  @Get()
  obtener() {
    return this.metricas.snapshot();
  }
}
