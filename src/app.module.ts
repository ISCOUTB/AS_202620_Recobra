import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PublicacionesModule } from './publicaciones/publicaciones.module';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    // Página de demostración del corte vertical (public/index.html), para
    // mostrar la funcionalidad en clase sin depender de Postman/Thunder
    // Client. No forma parte del corte vertical en sí, es solo la vitrina.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    PublicacionesModule,
    SaludModule,
  ],
})
export class AppModule {}
