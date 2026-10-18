import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { Cuenta } from '../domain/entities/cuenta';
import {
  ConfirmarEntrega,
  ConsultarReclamaciones,
  CrearReclamacion,
  ResolverReclamacion,
} from '../application/use-cases/reclamaciones';
import { AutenticacionGuard, CuentaActual } from '../identidad/autenticacion.guard';

/** Contexto Reclamaciones (escenario S2, ADR-0014). Todas las rutas exigen sesión. */
@Controller()
@UseGuards(AutenticacionGuard)
export class ReclamacionesController {
  constructor(
    private readonly crear: CrearReclamacion,
    private readonly resolver: ResolverReclamacion,
    private readonly consultar: ConsultarReclamaciones,
    private readonly confirmarEntrega: ConfirmarEntrega,
  ) {}

  @Post('publicaciones/:id/reclamaciones')
  @HttpCode(201)
  reclamar(@Param('id') publicacionId: string, @Body() cuerpo: { prueba: string }, @CuentaActual() cuenta: Cuenta) {
    return this.crear.ejecutar(publicacionId, cuenta.id, cuerpo?.prueba);
  }

  @Get('publicaciones/:id/reclamaciones')
  deUnaPublicacion(@Param('id') publicacionId: string, @CuentaActual() cuenta: Cuenta) {
    return this.consultar.dePublicacion(publicacionId, cuenta.id);
  }

  @Get('reclamaciones/mias')
  propias(@CuentaActual() cuenta: Cuenta) {
    return this.consultar.propias(cuenta.id);
  }

  @Post('reclamaciones/:id/aprobar')
  @HttpCode(200)
  aprobar(@Param('id') id: string, @CuentaActual() cuenta: Cuenta) {
    return this.resolver.aprobar(id, cuenta.id);
  }

  /** Quien reclamó ("lo recibí") o quien lo encontró ("lo entregué") confirma la entrega (ADR-0017). */
  @Post('reclamaciones/:id/entregada')
  @HttpCode(200)
  entregada(@Param('id') id: string, @CuentaActual() cuenta: Cuenta) {
    return this.confirmarEntrega.ejecutar(id, cuenta.id);
  }

  @Post('reclamaciones/:id/rechazar')
  @HttpCode(200)
  rechazar(@Param('id') id: string, @Body() cuerpo: { motivo: string }, @CuentaActual() cuenta: Cuenta) {
    return this.resolver.rechazar(id, cuenta.id, cuerpo?.motivo);
  }
}
