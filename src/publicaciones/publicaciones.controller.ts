import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
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
  async crear(@Body() body: CrearPublicacionDto) {
    // Si `body` trae un tipo inválido o campos vacíos, el caso de uso lanza
    // PublicacionInvalidaError; el filtro global (ver
    // publicacion-invalida.filter.ts) la traduce a 400. El controlador no
    // conoce la regla de negocio, solo la orquesta.
    return this.crearPublicacion.ejecutar(body);
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
