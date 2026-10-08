import { Module } from '@nestjs/common';
import { SaludController } from './salud.controller';
import { PublicacionesModule } from '../publicaciones/publicaciones.module';

@Module({
  imports: [PublicacionesModule],
  controllers: [SaludController],
})
export class SaludModule {}
