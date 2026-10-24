import { Controller, Get, Header } from '@nestjs/common';
import { CATALOGO_LUGARES, LugarCampus } from '../domain/lugares/catalogo-lugares';

/**
 * Catálogo de lugares del campus con sus pisos, para los submenús de los clientes.
 * Es la única respuesta de datos que se deja guardar una hora (ADR-0025). Solo
 * cambia con un despliegue, pero desplegar no invalida la copia de un navegador:
 * un cliente puede tardar hasta una hora en ver un lugar nuevo, y se acepta
 * porque el lugar de una publicación es texto libre que el servidor no valida
 * contra este catálogo.
 */
@Controller('lugares')
export class LugaresController {
  @Get()
  @Header('Cache-Control', 'public, max-age=3600')
  listar(): readonly LugarCampus[] {
    return CATALOGO_LUGARES;
  }
}
