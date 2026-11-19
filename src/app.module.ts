import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'node:path';
import { PublicacionesModule } from './publicaciones/publicaciones.module';
import { SaludModule } from './salud/salud.module';
import { ObservabilidadModule } from './observabilidad/observabilidad.module';
import { EmparejamientoModule } from './emparejamiento/emparejamiento.module';
import { IdentidadModule } from './identidad/identidad.module';
import { ReclamacionesModule } from './reclamaciones/reclamaciones.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { PrivacidadModule } from './privacidad/privacidad.module';
import { ModeracionModule } from './moderacion/moderacion.module';
import { FotosModule } from './fotos/fotos.module';
import { ConciliacionAvisosModule } from './notificaciones/conciliacion-avisos.module';
import { politicaDeCache } from './observabilidad/politica-de-cache.middleware';
import { SeguridadModule } from './seguridad/seguridad.module';
import { RaizController } from './raiz/raiz.controller';

@Module({
  imports: [
    // Bus de eventos en proceso (sin infraestructura externa, ver ADR-0004):
    // Publicaciones emite `publicacion.creada`; Emparejamiento lo consume de
    // forma asíncrona, sin acoplar la respuesta de crear al resultado del
    // matching.
    EventEmitterModule.forRoot(),
    // La app Flutter compilada para web (etapa `app-web` del Dockerfile) es la
    // única interfaz (ADR-0031): se sirve solo en /app/. Sin comodín: una ruta
    // que no existe responde 404 con el esquema `Error` en vez de la página.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'app'),
      serveRoot: '/app',
      renderPath: '/',
    }),
    PublicacionesModule,
    SaludModule,
    ObservabilidadModule,
    EmparejamientoModule,
    IdentidadModule,
    ReclamacionesModule,
    NotificacionesModule,
    PrivacidadModule,
    ModeracionModule,
    FotosModule,
    ConciliacionAvisosModule,
    SeguridadModule,
  ],
  controllers: [RaizController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(politicaDeCache).forRoutes('*');
  }
}
