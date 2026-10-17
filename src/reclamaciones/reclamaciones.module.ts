import { Module } from '@nestjs/common';
import { ReclamacionRepository } from '../domain/ports/reclamacion-repository';
import { MemoriaReclamacionRepository } from '../infrastructure/persistence/memoria-reclamacion.repository';
import { PostgresReclamacionRepository } from '../infrastructure/persistence/postgres-reclamacion.repository';
import { ConsultarReclamaciones, CrearReclamacion, ResolverReclamacion } from '../application/use-cases/reclamaciones';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { IdentidadModule } from '../identidad/identidad.module';
import { ReclamacionesController } from './reclamaciones.controller';

/**
 * Contexto Reclamaciones (ADR-0014). Depende de Publicaciones (lee el objeto
 * y cambia su estado a través de CambiarEstadoPublicacion) y de Identidad
 * (sesión y datos de contacto); ninguno de los dos depende de este.
 */
@Module({
  imports: [PublicacionesModule, IdentidadModule],
  controllers: [ReclamacionesController],
  providers: [
    {
      provide: ReclamacionRepository,
      useClass: process.env.DATABASE_URL ? PostgresReclamacionRepository : MemoriaReclamacionRepository,
    },
    CrearReclamacion,
    ResolverReclamacion,
    ConsultarReclamaciones,
  ],
})
export class ReclamacionesModule {}
