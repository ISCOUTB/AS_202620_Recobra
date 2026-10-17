import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Cuenta } from '../domain/entities/cuenta';
import { ConsultarNotificaciones } from '../application/use-cases/notificaciones';
import { AutenticacionGuard, CuentaActual } from '../identidad/autenticacion.guard';

/** Bandeja de avisos de la cuenta de la sesión (ADR-0015). */
@Controller('notificaciones')
@UseGuards(AutenticacionGuard)
export class NotificacionesController {
  constructor(private readonly consultar: ConsultarNotificaciones) {}

  @Get()
  bandeja(@CuentaActual() cuenta: Cuenta) {
    return this.consultar.ejecutar(cuenta.id);
  }

  @Post('leidas')
  @HttpCode(204)
  async marcarTodas(@CuentaActual() cuenta: Cuenta): Promise<void> {
    await this.consultar.marcarTodas(cuenta.id);
  }

  @Post(':id/leida')
  @HttpCode(204)
  async marcarUna(@Param('id') id: string, @CuentaActual() cuenta: Cuenta): Promise<void> {
    await this.consultar.marcarLeida(id, cuenta.id);
  }
}
