import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { CrearPublicacion } from '../application/use-cases/crear-publicacion';
import { ConsultarPublicacion } from '../application/use-cases/consultar-publicacion';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(
    private readonly crearPublicacion: CrearPublicacion,
    private readonly consultarPublicacion: ConsultarPublicacion,
  ) {}

  @Post()
  @HttpCode(201)
  async crear(@Body() body: CrearPublicacionDto) {
    // Si `body` trae un tipo inválido o campos vacíos, el caso de uso lanza
    // PublicacionInvalidaError; el filtro global (ver
    // publicacion-invalida.filter.ts) la traduce a 400. El controlador no
    // conoce la regla de negocio, solo la orquesta.
    return this.crearPublicacion.ejecutar(body);
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
