import { Controller, Get, Header } from '@nestjs/common';
import { CATALOGO_LUGARES, LugarCampus } from '../domain/lugares/catalogo-lugares';

/**
 * Catálogo de lugares del campus con sus pisos, para los submenús de los clientes.
 * Es la única respuesta de datos que se deja guardar una hora: solo cambia con un
 * despliegue (ADR-0025), así que una hora de desfase es lo máximo que tarda un
 * cliente en ver un lugar nuevo.
 */
@Controller('lugares')
export class LugaresController {
  @Get()
  @Header('Cache-Control', 'public, max-age=3600')
  listar(): readonly LugarCampus[] {
    return CATALOGO_LUGARES;
  }
}
