import { Module } from '@nestjs/common';
import { EmparejamientoController } from './emparejamiento.controller';
import { PublicacionCreadaListener } from './publicacion-creada.listener';
import { BuscarCoincidencias } from '../application/use-cases/buscar-coincidencias';
import { CoincidenciaRepository } from '../domain/ports/coincidencia-repository';
import { MemoriaCoincidenciaRepository } from '../infrastructure/persistence/memoria-coincidencia.repository';
import { PostgresCoincidenciaRepository } from '../infrastructure/persistence/postgres-coincidencia.repository';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { IdentidadModule } from '../identidad/identidad.module';
import { ReportarHallazgo } from '../application/use-cases/reportar-hallazgo';
import { HallazgosController } from './hallazgos.controller';

@Module({
  imports: [PublicacionesModule, IdentidadModule],
  controllers: [EmparejamientoController, HallazgosController],
  providers: [
    BuscarCoincidencias,
    ReportarHallazgo,
    PublicacionCreadaListener,
    // Con DATABASE_URL las coincidencias se guardan en PostgreSQL (ADR-0018); sin ella, en memoria.
    {
      provide: CoincidenciaRepository,
      useClass: process.env.DATABASE_URL ? PostgresCoincidenciaRepository : MemoriaCoincidenciaRepository,
    },
  ],
  exports: [CoincidenciaRepository],
})
export class EmparejamientoModule {}
