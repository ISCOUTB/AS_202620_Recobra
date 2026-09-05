import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PublicacionesController } from './publicaciones.controller';
import { CrearPublicacion } from '../application/use-cases/crear-publicacion';
import { ConsultarPublicacion } from '../application/use-cases/consultar-publicacion';
import { PublicacionRepository } from '../domain/ports/publicacion-repository';
import { MemoriaPublicacionRepository } from '../infrastructure/persistence/memoria-publicacion.repository';
import { PublicacionInvalidaFilter } from './publicacion-invalida.filter';

@Module({
  controllers: [PublicacionesController],
  providers: [
    CrearPublicacion,
    ConsultarPublicacion,
    // Aquí es donde se conecta el puerto con su adaptador concreto (ADR-0002
    // / ADR-0001): cambiar de memoria a un adaptador de PostgreSQL más
    // adelante es reemplazar esta única línea, sin tocar los casos de uso.
    { provide: PublicacionRepository, useClass: MemoriaPublicacionRepository },
    { provide: APP_FILTER, useClass: PublicacionInvalidaFilter },
  ],
})
export class PublicacionesModule {}
