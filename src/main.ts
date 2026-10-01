import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JsonLoggerService } from './observabilidad/json-logger.service';

async function bootstrap() {
  const logger = new JsonLoggerService();
  const app = await NestFactory.create(AppModule, { logger });
  // CORS abierto en desarrollo para el cliente Flutter (web/emulador).
  app.enableCors();
  const PORT = process.env.PORT || 3000;

  await app.listen(PORT);
  logger.log(`Recobra backend (NestJS) escuchando en http://localhost:${PORT}`, 'Bootstrap');
}

void bootstrap();
