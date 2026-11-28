import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { JsonLoggerService } from './observabilidad/json-logger.service';
import { configurarSeguridad } from './seguridad/configurar-seguridad';
import { persistenciaConfigurada } from './infrastructure/persistence/seleccion-de-persistencia';

async function bootstrap() {
  const logger = new JsonLoggerService();
  // Antes de crear los módulos: en producción sin DATABASE_URL el proceso se
  // detiene aquí en vez de arrancar en memoria y perder los datos.
  const persistencia = persistenciaConfigurada();
  logger.log(`Persistencia: ${persistencia}`, 'Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });
  // Cabeceras de seguridad, CORS con lista blanca, proxy de confianza y rechazo de
  // cuerpos comprimidos (ADR-0029); es lo mismo que ejecutan las pruebas e2e.
  configurarSeguridad(app);
  const PORT = process.env.PORT || 3000;

  await app.listen(PORT);
  logger.log(`Recobra backend (NestJS) escuchando en http://localhost:${PORT}`, 'Bootstrap');
}

void bootstrap();
