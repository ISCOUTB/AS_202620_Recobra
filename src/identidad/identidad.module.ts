import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CuentaRepository } from '../domain/ports/cuenta-repository';
import { SesionRepository } from '../domain/ports/sesion-repository';
import { HashContrasenas } from '../domain/ports/hash-contrasenas';
import { MemoriaCuentaRepository } from '../infrastructure/persistence/memoria-cuenta.repository';
import { MemoriaSesionRepository } from '../infrastructure/persistence/memoria-sesion.repository';
import { PostgresCuentaRepository } from '../infrastructure/persistence/postgres-cuenta.repository';
import { PostgresSesionRepository } from '../infrastructure/persistence/postgres-sesion.repository';
import { ScryptHashContrasenas } from '../infrastructure/seguridad/scrypt-hash-contrasenas';
import { CerrarSesion, IniciarSesion, RegistrarCuenta, ResolverSesion } from '../application/use-cases/identidad';
import { IdentidadController } from './identidad.controller';
import { AutenticacionGuard } from './autenticacion.guard';
import { ErroresDeDominioFilter } from './errores-de-dominio.filter';

const conBase = Boolean(process.env.DATABASE_URL);

/**
 * Contexto Identidad (ADR-0013). Igual que Publicaciones, usa PostgreSQL si hay
 * DATABASE_URL y memoria si no (pruebas). Exporta el guard y el puerto de
 * cuentas para que otros contextos los usen sin conocer el adaptador.
 */
@Module({
  controllers: [IdentidadController],
  providers: [
    { provide: CuentaRepository, useClass: conBase ? PostgresCuentaRepository : MemoriaCuentaRepository },
    { provide: SesionRepository, useClass: conBase ? PostgresSesionRepository : MemoriaSesionRepository },
    { provide: HashContrasenas, useClass: ScryptHashContrasenas },
    { provide: APP_FILTER, useClass: ErroresDeDominioFilter },
    RegistrarCuenta,
    IniciarSesion,
    CerrarSesion,
    ResolverSesion,
    AutenticacionGuard,
  ],
  exports: [CuentaRepository, ResolverSesion, AutenticacionGuard],
})
export class IdentidadModule {}
