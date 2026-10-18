import { Module } from '@nestjs/common';
import { EliminarCuenta, ExportarDatosPersonales, LimpiezaPeriodica } from '../application/use-cases/privacidad';
import { IdentidadModule } from '../identidad/identidad.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { ReclamacionesModule } from '../reclamaciones/reclamaciones.module';
import { LimpiezaProgramada } from './limpieza-programada';
import { PrivacidadController } from './privacidad.controller';

/**
 * Privacidad y datos personales (ADR-0021). Reúne lo que atraviesa varios
 * contextos (descargar y eliminar los datos de una persona) usando solo los
 * puertos que cada contexto exporta; ninguno de ellos depende de este módulo.
 */
@Module({
  imports: [IdentidadModule, PublicacionesModule, ReclamacionesModule, NotificacionesModule],
  controllers: [PrivacidadController],
  providers: [ExportarDatosPersonales, EliminarCuenta, LimpiezaPeriodica, LimpiezaProgramada],
})
export class PrivacidadModule {}
