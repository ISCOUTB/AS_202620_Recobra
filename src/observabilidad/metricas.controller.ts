import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { estadoDeSeguridad } from '../seguridad/estado-de-seguridad';
import { huellaDe, LimiteDeUso } from '../seguridad/limite-de-uso';
import { saltosDeProxy } from '../seguridad/configurar-seguridad';
import { MetricasService } from './metricas.service';

@Controller('metrics')
export class MetricasController {
  constructor(
    private readonly metricas: MetricasService,
    private readonly limite: LimiteDeUso,
  ) {}

  @Get()
  obtener(@Req() peticion: Request) {
    return {
      ...this.metricas.snapshot(),
      // Cuántas veces se pasó cada límite de uso desde que arrancó el proceso (ADR-0028).
      seguridad: {
        limitesExcedidos: { ...this.limite.excedidos },
        // Correos de ADMIN_CORREOS sin cuenta (amenaza T01); null hasta la primera comprobación.
        administradoresSinCuenta: estadoDeSeguridad.administradoresSinCuenta,
        // Lo que el servidor cree de quien pregunta, para comprobar el proxy de confianza en producción:
        // `origen` es la misma huella que ven los registros de los límites (nunca la dirección).
        cliente: {
          origen: huellaDe(`origen:${peticion.ip ?? 'desconocido'}`),
          conexionSegura: peticion.secure,
          saltosDeProxy: saltosDeProxy(),
        },
      },
    };
  }
}
