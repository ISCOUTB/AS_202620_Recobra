import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { CrearPublicacion } from '../application/use-cases/crear-publicacion';
import { ConsultarPublicacion } from '../application/use-cases/consultar-publicacion';
import { BuscarPublicaciones } from '../application/use-cases/buscar-publicaciones';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { LatenciaPublicacionesInterceptor } from '../observabilidad/latencia-publicaciones.interceptor';
import { LatenciaBusquedaInterceptor } from '../observabilidad/latencia-busqueda.interceptor';
import { ListarPublicacionesDeAutor } from '../application/use-cases/cambiar-estado-publicacion';
import { CambiarCustodia, CerrarPublicacion } from '../application/use-cases/ciclo-de-vida';
import { Cuenta } from '../domain/entities/cuenta';
import { AutenticacionGuard, CuentaActual } from '../identidad/autenticacion.guard';
import { Limitar, LimiteGuard } from '../seguridad/limite-de-uso';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(
    private readonly crearPublicacion: CrearPublicacion,
    private readonly consultarPublicacion: ConsultarPublicacion,
    private readonly buscarPublicaciones: BuscarPublicaciones,
    private readonly listarDeAutor: ListarPublicacionesDeAutor,
    private readonly cerrarPublicacion: CerrarPublicacion,
    private readonly cambiarCustodia: CambiarCustodia,
  ) {}

  /** Publicar exige sesión (ADR-0013): toda publicación queda ligada a su autor. */
  @Post()
  @HttpCode(201)
  @UseGuards(AutenticacionGuard, LimiteGuard)
  @Limitar('publicar')
  @UseInterceptors(LatenciaPublicacionesInterceptor)
  async crear(
    @Body() body: CrearPublicacionDto,
    @Headers('idempotency-key') claveIdempotencia: string | undefined,
    @Res({ passthrough: true }) respuesta: Response,
    @CuentaActual() cuenta: Cuenta,
  ) {
    // Si `body` trae un tipo inválido o campos vacíos, el caso de uso lanza
    // PublicacionInvalidaError; el filtro global (ver
    // publicacion-invalida.filter.ts) la traduce a 400. El controlador no
    // conoce la regla de negocio, solo la orquesta.
    if (claveIdempotencia === undefined) {
      return this.crearPublicacion.ejecutar(body, cuenta.id);
    }
    // Reintento con la misma clave: 200 con la publicación original, sin crear
    // otra (docs/modos-de-fallo.md, "responde dos veces").
    const { publicacion, repetida } = await this.crearPublicacion.ejecutarIdempotente(
      body,
      claveIdempotencia,
      cuenta.id,
    );
    if (repetida) respuesta.status(HttpStatus.OK);
    return publicacion;
  }

  @Get()
  @UseInterceptors(LatenciaBusquedaInterceptor)
  async buscar(
    @Query('tipo') tipo?: string,
    @Query('categoria') categoria?: string,
    @Query('ubicacion') ubicacion?: string,
    @Query('limite') limite?: string,
  ) {
    return this.buscarPublicaciones.ejecutar({ tipo, categoria, ubicacion, limite });
  }

  /** Publicaciones de la cuenta que consulta (para gestionar sus reclamaciones). */
  @Get('mias')
  @UseGuards(AutenticacionGuard)
  mias(@CuentaActual() cuenta: Cuenta) {
    return this.listarDeAutor.ejecutar(cuenta.id);
  }

  /** Su autor la cierra: "recuperado" (solo perdidos) o "retirado" (ADR-0017). */
  @Post(':id/cerrar')
  @HttpCode(200)
  @UseGuards(AutenticacionGuard)
  cerrar(@Param('id') id: string, @Body() cuerpo: { motivo: string }, @CuentaActual() cuenta: Cuenta) {
    return this.cerrarPublicacion.ejecutar(id, cuenta.id, cuerpo?.motivo);
  }

  /** Quien encontró el objeto dice dónde está ahora (ADR-0019). */
  @Post(':id/custodia')
  @HttpCode(200)
  @UseGuards(AutenticacionGuard)
  custodia(
    @Param('id') id: string,
    @Body() cuerpo: { custodia: string; puntoCustodia?: string | null },
    @CuentaActual() cuenta: Cuenta,
  ) {
    return this.cambiarCustodia.ejecutar(id, cuenta.id, cuerpo?.custodia, cuerpo?.puntoCustodia);
  }

  @Get(':id')
  async consultar(@Param('id') id: string) {
    const publicacion = await this.consultarPublicacion.ejecutar({ id });
    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada');
    }
    return publicacion;
  }
}
