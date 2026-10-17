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
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { CrearPublicacion } from '../application/use-cases/crear-publicacion';
import { ConsultarPublicacion } from '../application/use-cases/consultar-publicacion';
import { BuscarPublicaciones } from '../application/use-cases/buscar-publicaciones';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { LatenciaPublicacionesInterceptor } from '../observabilidad/latencia-publicaciones.interceptor';
import { LatenciaBusquedaInterceptor } from '../observabilidad/latencia-busqueda.interceptor';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(
    private readonly crearPublicacion: CrearPublicacion,
    private readonly consultarPublicacion: ConsultarPublicacion,
    private readonly buscarPublicaciones: BuscarPublicaciones,
  ) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(LatenciaPublicacionesInterceptor)
  async crear(
    @Body() body: CrearPublicacionDto,
    @Headers('idempotency-key') claveIdempotencia: string | undefined,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    // Si `body` trae un tipo inválido o campos vacíos, el caso de uso lanza
    // PublicacionInvalidaError; el filtro global (ver
    // publicacion-invalida.filter.ts) la traduce a 400. El controlador no
    // conoce la regla de negocio, solo la orquesta.
    if (claveIdempotencia === undefined) {
      return this.crearPublicacion.ejecutar(body);
    }
    // Reintento con la misma clave: 200 con la publicación original, sin crear
    // otra (docs/modos-de-fallo.md, "responde dos veces").
    const { publicacion, repetida } = await this.crearPublicacion.ejecutarIdempotente(body, claveIdempotencia);
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

  @Get(':id')
  async consultar(@Param('id') id: string) {
    const publicacion = await this.consultarPublicacion.ejecutar({ id });
    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada');
    }
    return publicacion;
  }
}
