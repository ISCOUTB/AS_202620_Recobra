import { Controller, Get } from '@nestjs/common';
import { CATALOGO_LUGARES, LugarCampus } from '../domain/lugares/catalogo-lugares';

/** Catálogo de lugares del campus con sus pisos, para los submenús de los clientes. */
@Controller('lugares')
export class LugaresController {
  @Get()
  listar(): readonly LugarCampus[] {
    return CATALOGO_LUGARES;
  }
}
