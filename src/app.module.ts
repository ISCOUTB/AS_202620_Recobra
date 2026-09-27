import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { join } from 'node:path';
import { PublicacionesModule } from './publicaciones/publicaciones.module';
import { SaludModule } from './salud/salud.module';
import { ObservabilidadModule } from './observabilidad/observabilidad.module';
import { EmparejamientoModule } from './emparejamiento/emparejamiento.module';

@Module({
  imports: [
    // Bus de eventos en proceso (sin infraestructura externa, ver ADR-0004):
    // Publicaciones emite `publicacion.creada`; Emparejamiento lo consume de
    // forma asíncrona, sin acoplar la respuesta de crear al resultado del
    // matching.
    EventEmitterModule.forRoot(),
    // Página de demostración del corte vertical (public/index.html), para
    // mostrar la funcionalidad en clase sin depender de Postman/Thunder
    // Client. No forma parte del corte vertical en sí, es solo la vitrina.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PublicacionesModule,
    SaludModule,
    ObservabilidadModule,
    EmparejamientoModule,
  ],
})
export class AppModule {}
