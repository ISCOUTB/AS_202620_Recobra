import { Module } from '@nestjs/common';
import { ConciliarAvisos } from '../application/use-cases/conciliar-avisos';
import { EmparejamientoModule } from '../emparejamiento/emparejamiento.module';
import { ModeracionModule } from '../moderacion/moderacion.module';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { ReclamacionesModule } from '../reclamaciones/reclamaciones.module';
import { ConciliadorAvisos } from './conciliador-avisos';
import { NotificacionesModule } from './notificaciones.module';

/**
 * Conciliación de avisos (ADR-0024). Vive aparte de Notificaciones porque lee
 * los datos de otros contextos (coincidencias, reclamaciones, reportes) solo por
 * sus puertos, y así Notificaciones no depende de ellos.
 */
@Module({
  imports: [NotificacionesModule, EmparejamientoModule, ReclamacionesModule, ModeracionModule, PublicacionesModule],
  providers: [ConciliarAvisos, ConciliadorAvisos],
})
export class ConciliacionAvisosModule {}
