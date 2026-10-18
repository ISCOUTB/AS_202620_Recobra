import { Module } from '@nestjs/common';
import { NotificacionRepository } from '../domain/ports/notificacion-repository';
import { MemoriaNotificacionRepository } from '../infrastructure/persistence/memoria-notificacion.repository';
import { PostgresNotificacionRepository } from '../infrastructure/persistence/postgres-notificacion.repository';
import { ConsultarNotificaciones, Notificar } from '../application/use-cases/notificaciones';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { IdentidadModule } from '../identidad/identidad.module';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesListener } from './notificaciones.listener';

/**
 * Contexto Notificaciones (ADR-0015): avisos dentro de la app, generados por
 * eventos en proceso. Lee publicaciones por su puerto; nadie más escribe su
 * tabla.
 */
@Module({
  imports: [PublicacionesModule, IdentidadModule],
  controllers: [NotificacionesController],
  providers: [
    {
      provide: NotificacionRepository,
      useClass: process.env.DATABASE_URL ? PostgresNotificacionRepository : MemoriaNotificacionRepository,
    },
    Notificar,
    ConsultarNotificaciones,
    NotificacionesListener,
  ],
  exports: [NotificacionRepository, Notificar],
})
export class NotificacionesModule {}
