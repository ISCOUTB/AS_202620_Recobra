import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import {
  EliminarFotoDe,
  LimpiarFotosDeCerradas,
  ObtenerFoto,
  QuitarFoto,
  SubirFoto,
} from '../application/use-cases/fotos';
import { FotoRepository } from '../domain/ports/foto-repository';
import { IdentidadModule } from '../identidad/identidad.module';
import { MemoriaFotoRepository } from '../infrastructure/persistence/memoria-foto.repository';
import { PostgresFotoRepository } from '../infrastructure/persistence/postgres-foto.repository';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';
import { ReclamacionesModule } from '../reclamaciones/reclamaciones.module';
import { cuerpoJpeg } from './cuerpo-jpeg.middleware';
import { FotosController } from './fotos.controller';

/**
 * Contexto Fotos (ADR-0023): la foto de una publicación y su miniatura. Es
 * dueño único de la tabla `fotos`; con Publicaciones solo comparte el puerto
 * (anota `tieneFoto`) y con Reclamaciones lee quién tiene una reclamación
 * aprobada para decidir quién ve la foto completa.
 */
@Module({
  imports: [IdentidadModule, PublicacionesModule, ReclamacionesModule],
  controllers: [FotosController],
  providers: [
    {
      provide: FotoRepository,
      useClass: process.env.DATABASE_URL ? PostgresFotoRepository : MemoriaFotoRepository,
    },
    SubirFoto,
    QuitarFoto,
    ObtenerFoto,
    EliminarFotoDe,
    LimpiarFotosDeCerradas,
  ],
  exports: [EliminarFotoDe, LimpiarFotosDeCerradas],
})
export class FotosModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(cuerpoJpeg).forRoutes({ path: 'publicaciones/:id/foto', method: RequestMethod.PUT });
  }
}
