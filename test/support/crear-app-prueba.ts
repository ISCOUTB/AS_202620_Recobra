import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

/**
 * Bootstrap compartido de la app NestJS de prueba (antes duplicado en cada
 * *.e2e-spec.ts — hallazgo de SonarCloud, duplicated_lines_density). Recibe
 * un `personalizar` opcional para los específicos que necesitan sobrescribir
 * un provider (ver publicaciones-degradacion.e2e-spec.ts).
 */
export async function crearAppDePrueba(
  personalizar?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (personalizar) builder = personalizar(builder);

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}
