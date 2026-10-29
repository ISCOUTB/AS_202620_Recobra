import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Cuenta } from '../domain/entities/cuenta';
import { DatosHallazgo, ReportarHallazgo } from '../application/use-cases/reportar-hallazgo';
import { AutenticacionGuard, CuentaActual } from '../identidad/autenticacion.guard';
import { Limitar, LimiteGuard } from '../seguridad/limite-de-uso';

/** "Lo tengo yo" sobre un objeto perdido (ADR-0019). */
@Controller('publicaciones')
export class HallazgosController {
  constructor(private readonly reportar: ReportarHallazgo) {}

  @Post(':id/lo-tengo')
  @HttpCode(201)
  @UseGuards(AutenticacionGuard, LimiteGuard)
  @Limitar('publicar')
  loTengo(@Param('id') perdidoId: string, @Body() cuerpo: DatosHallazgo, @CuentaActual() cuenta: Cuenta) {
    return this.reportar.ejecutar(perdidoId, cuenta.id, cuerpo ?? ({} as DatosHallazgo));
  }
}
