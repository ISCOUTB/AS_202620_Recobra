import { Module } from '@nestjs/common';
import { EmparejamientoController } from './emparejamiento.controller';
import { PublicacionCreadaListener } from './publicacion-creada.listener';
import { BuscarCoincidencias } from '../application/use-cases/buscar-coincidencias';
import { CoincidenciaRepository } from '../domain/ports/coincidencia-repository';
import { MemoriaCoincidenciaRepository } from '../infrastructure/persistence/memoria-coincidencia.repository';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';

@Module({
  imports: [PublicacionesModule],
  controllers: [EmparejamientoController],
  providers: [
    BuscarCoincidencias,
    PublicacionCreadaListener,
    { provide: CoincidenciaRepository, useClass: MemoriaCoincidenciaRepository },
  ],
})
export class EmparejamientoModule {}
