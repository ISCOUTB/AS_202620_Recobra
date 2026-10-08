import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PublicacionRepository } from '../domain/ports/publicacion-repository';

@Controller('health')
export class SaludController {
  constructor(private readonly repositorio: PublicacionRepository) {}

  /**
   * Vivacidad: el proceso corre y atiende peticiones. No toca la base de
   * datos a propósito, para que una caída de la base no tumbe el chequeo del
   * contenedor (y con él, el enrutamiento).
   */
  @Get()
  verificar() {
    return { status: 'ok', service: 'recobra-backend' };
  }

  /**
   * Disponibilidad de datos: responde 200 solo si el almacenamiento contesta;
   * si no, 503. Distingue "el proceso está vivo" de "puede atender
   * publicaciones".
   */
  @Get('ready')
  async disponibilidad(@Res({ passthrough: true }) respuesta: Response) {
    const almacenamiento = this.repositorio.almacenamiento;
    try {
      await this.repositorio.verificarDisponibilidad();
      return { status: 'ok', service: 'recobra-backend', almacenamiento };
    } catch {
      respuesta.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'degradado', service: 'recobra-backend', almacenamiento };
    }
  }
}
