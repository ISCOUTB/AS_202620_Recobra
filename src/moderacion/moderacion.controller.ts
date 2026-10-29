import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Cuenta } from '../domain/entities/cuenta';
import { ListarReportesAbiertos, ReportarPublicacion, ResolverReporte } from '../application/use-cases/moderacion';
import { AdministradorGuard } from '../identidad/administrador.guard';
import { AutenticacionGuard, CuentaActual } from '../identidad/autenticacion.guard';
import { Limitar, LimiteGuard } from '../seguridad/limite-de-uso';

/** Moderación mínima (ADR-0022): reportar una publicación y, para administradores, resolver los reportes. */
@Controller()
export class ModeracionController {
  constructor(
    private readonly reportar: ReportarPublicacion,
    private readonly listar: ListarReportesAbiertos,
    private readonly resolver: ResolverReporte,
  ) {}

  @Post('publicaciones/:id/reportar')
  @HttpCode(201)
  @UseGuards(AutenticacionGuard, LimiteGuard)
  @Limitar('reportar')
  async reportarPublicacion(
    @Param('id') id: string,
    @Body() cuerpo: { motivo: string; detalle?: string },
    @CuentaActual() cuenta: Cuenta,
  ) {
    const reporte = await this.reportar.ejecutar(id, cuenta, cuerpo?.motivo, cuerpo?.detalle);
    // Quien reporta no necesita más que la confirmación.
    return { id: reporte.id, publicacionId: reporte.publicacionId, estado: reporte.estado };
  }

  @Get('moderacion/reportes')
  @UseGuards(AutenticacionGuard, AdministradorGuard)
  reportesAbiertos() {
    return this.listar.ejecutar();
  }

  @Post('moderacion/reportes/:id/resolver')
  @HttpCode(200)
  @UseGuards(AutenticacionGuard, AdministradorGuard)
  resolverReporte(
    @Param('id') id: string,
    @Body() cuerpo: { decision: string; nota?: string },
    @CuentaActual() cuenta: Cuenta,
  ) {
    return this.resolver.ejecutar(id, cuenta, cuerpo?.decision, cuerpo?.nota);
  }
}
