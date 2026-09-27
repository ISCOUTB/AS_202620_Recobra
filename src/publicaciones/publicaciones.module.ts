import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PublicacionesController } from './publicaciones.controller';
import { CrearPublicacion } from '../application/use-cases/crear-publicacion';
import { ConsultarPublicacion } from '../application/use-cases/consultar-publicacion';
import { PublicacionRepository } from '../domain/ports/publicacion-repository';
import { MemoriaPublicacionRepository } from '../infrastructure/persistence/memoria-publicacion.repository';
import { PostgresPublicacionRepository } from '../infrastructure/persistence/postgres-publicacion.repository';
import { PublicacionInvalidaFilter } from './publicacion-invalida.filter';
import { ObservabilidadModule } from '../observabilidad/observabilidad.module';
import { LatenciaPublicacionesInterceptor } from '../observabilidad/latencia-publicaciones.interceptor';

@Module({
  imports: [ObservabilidadModule],
  controllers: [PublicacionesController],
  providers: [
    CrearPublicacion,
    ConsultarPublicacion,
    // Aquí es donde se conecta el puerto con su adaptador concreto (ADR-0002
    // / ADR-0006): con DATABASE_URL definida usa PostgreSQL; sin ella (por
    // ejemplo en pruebas) cae al adaptador en memoria. Los casos de uso no
    // cambian ni una línea en ninguno de los dos casos.
    {
      provide: PublicacionRepository,
      useClass: process.env.DATABASE_URL ? PostgresPublicacionRepository : MemoriaPublicacionRepository,
    },
    { provide: APP_FILTER, useClass: PublicacionInvalidaFilter },
    LatenciaPublicacionesInterceptor,
  ],
  exports: [PublicacionRepository],
})
export class PublicacionesModule {}
