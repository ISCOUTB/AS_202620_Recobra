import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS abierto en desarrollo para el cliente Flutter (web/emulador).
  app.enableCors();
  const PORT = process.env.PORT || 3000;

  await app.listen(PORT);
  console.log(`Recobra backend (NestJS) escuchando en http://localhost:${PORT}`);
}

bootstrap();
