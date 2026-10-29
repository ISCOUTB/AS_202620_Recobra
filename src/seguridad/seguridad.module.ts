import { Global, Module } from '@nestjs/common';
import { LimiteDeUso, LimiteGuard } from './limite-de-uso';

/**
 * Seguridad transversal (ADR-0028): los límites de uso. Es global para que cualquier
 * controlador use `@Limitar` con `LimiteGuard` sin importar un módulo más, y para que
 * todos compartan los mismos contadores.
 */
@Global()
@Module({
  providers: [LimiteDeUso, LimiteGuard],
  exports: [LimiteDeUso, LimiteGuard],
})
export class SeguridadModule {}
