import { Module } from '@nestjs/common';
import { ListarReportesAbiertos, ReportarPublicacion, ResolverReporte } from '../application/use-cases/moderacion';
import { ReporteRepository } from '../domain/ports/reporte-repository';
import { MemoriaReporteRepository } from '../infrastructure/persistence/memoria-reporte.repository';
import { PostgresReporteRepository } from '../infrastructure/persistence/postgres-reporte.repository';
import { AdministradorGuard } from '../identidad/administrador.guard';
import { IdentidadModule } from '../identidad/identidad.module';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { ModeracionController } from './moderacion.controller';

/**
 * Contexto Moderación (ADR-0022): reportes de abuso y su resolución por
 * administradores. Lee publicaciones por su puerto y las cierra solo a través de
 * `cerrar`, como el resto; es dueño único de la tabla `reportes`.
 */
@Module({
  imports: [IdentidadModule, PublicacionesModule],
  controllers: [ModeracionController],
  providers: [
    {
      provide: ReporteRepository,
      useClass: process.env.DATABASE_URL ? PostgresReporteRepository : MemoriaReporteRepository,
    },
    ReportarPublicacion,
    ListarReportesAbiertos,
    ResolverReporte,
    AdministradorGuard,
  ],
  exports: [ReporteRepository],
})
export class ModeracionModule {}
