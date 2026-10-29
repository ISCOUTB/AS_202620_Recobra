import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { JsonLoggerService } from './observabilidad/json-logger.service';
import { configurarSeguridad } from './seguridad/configurar-seguridad';

async function bootstrap() {
  const logger = new JsonLoggerService();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });
  // Cabeceras de seguridad, CORS con lista blanca, proxy de confianza y rechazo de
  // cuerpos comprimidos (ADR-0029); es lo mismo que ejecutan las pruebas e2e.
  configurarSeguridad(app);
  const PORT = process.env.PORT || 3000;

  await app.listen(PORT);
  logger.log(`Recobra backend (NestJS) escuchando en http://localhost:${PORT}`, 'Bootstrap');
}

void bootstrap();
