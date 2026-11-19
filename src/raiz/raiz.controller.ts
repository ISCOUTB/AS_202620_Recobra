import { Controller, Get, Redirect } from '@nestjs/common';

/**
 * La raíz del sitio lleva a la app (ADR-0031): una sola interfaz, la app
 * Flutter en `/app/`, que se adapta a computador (menú lateral) y a celular
 * (barra inferior). Redirección temporal (302) para poder cambiar el destino
 * sin que los navegadores la recuerden para siempre.
 */
@Controller()
export class RaizController {
  @Get()
  @Redirect('/app/', 302)
  raiz(): void {
    // La respuesta la arma @Redirect.
  }
}
