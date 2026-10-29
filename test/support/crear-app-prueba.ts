import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module';
import { configurarSeguridad } from '../../src/seguridad/configurar-seguridad';
import { LimiteDeUso, NombreDeRegla, ReglaDeLimite } from '../../src/seguridad/limite-de-uso';

/**
 * Bootstrap compartido de la app NestJS de prueba (antes duplicado en cada
 * *.e2e-spec.ts — hallazgo de SonarCloud, duplicated_lines_density). Recibe
 * un `personalizar` opcional para los específicos que necesitan sobrescribir
 * un provider (ver publicaciones-degradacion.e2e-spec.ts).
 */
export async function crearAppDePrueba(
  personalizar?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
  opciones: { limitesReales?: boolean } = {},
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (personalizar) builder = personalizar(builder);

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configurarSeguridad(app); // lo que se prueba es lo que corre en main.ts
  await app.init();
  if (!opciones.limitesReales) {
    // Las pruebas de otras funciones publican, reportan y suben fotos muchas veces con la misma cuenta:
    // se les da holgura. Solo la prueba de los límites (limites.e2e-spec.ts) usa los valores reales.
    const limite = app.get(LimiteDeUso);
    limite.reglas = Object.fromEntries(
      Object.entries(limite.reglas).map(([nombre, regla]) => [nombre, { ...regla, maximo: 1_000_000 }]),
    ) as Record<NombreDeRegla, ReglaDeLimite>;
  }
  return app;
}
