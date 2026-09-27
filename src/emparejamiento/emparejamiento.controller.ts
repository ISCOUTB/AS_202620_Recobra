import { Controller, Get, Query } from '@nestjs/common';
import { CoincidenciaRepository } from '../domain/ports/coincidencia-repository';

@Controller('coincidencias')
export class EmparejamientoController {
  constructor(private readonly coincidenciaRepository: CoincidenciaRepository) {}

  @Get()
  async listar(@Query('publicacionId') publicacionId: string) {
    if (!publicacionId) {
      return [];
    }
    return this.coincidenciaRepository.listarPorPublicacion(publicacionId);
  }
}
