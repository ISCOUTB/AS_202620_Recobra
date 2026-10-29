import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Cuenta } from '../domain/entities/cuenta';
import { CerrarSesion, IniciarSesion, RegistrarCuenta } from '../application/use-cases/identidad';
import { esAdministrador } from '../application/use-cases/moderacion';
import { AutenticacionGuard, CuentaActual, TokenActual } from './autenticacion.guard';
import { Limitar, LimiteGuard } from '../seguridad/limite-de-uso';

interface CuerpoRegistro {
  correo: string;
  nombre: string;
  contrasena: string;
  aceptoPrivacidad: boolean;
}

interface CuerpoSesion {
  correo: string;
  contrasena: string;
}

/** Contexto Identidad (ADR-0013): registro, inicio y cierre de sesión. */
@Controller()
export class IdentidadController {
  constructor(
    private readonly registrar: RegistrarCuenta,
    private readonly iniciar: IniciarSesion,
    private readonly cerrar: CerrarSesion,
  ) {}

  @Post('cuentas')
  @HttpCode(201)
  @UseGuards(LimiteGuard)
  @Limitar('cuentaNueva')
  async registrarCuenta(@Body() cuerpo: CuerpoRegistro) {
    const cuenta = await this.registrar.ejecutar({
      correo: cuerpo?.correo,
      nombre: cuerpo?.nombre,
      contrasena: cuerpo?.contrasena,
      aceptoPrivacidad: cuerpo?.aceptoPrivacidad,
    });
    return cuenta.vistaPublica();
  }

  @Post('sesiones')
  @HttpCode(201)
  @UseGuards(LimiteGuard)
  @Limitar('sesion')
  async iniciarSesion(@Body() cuerpo: CuerpoSesion) {
    const { token, expiraEn, cuenta } = await this.iniciar.ejecutar(cuerpo?.correo, cuerpo?.contrasena);
    return { token, expiraEn, cuenta: { ...cuenta.vistaPublica(), esAdministrador: esAdministrador(cuenta) } };
  }

  @Delete('sesiones')
  @HttpCode(204)
  @UseGuards(AutenticacionGuard)
  async cerrarSesion(@TokenActual() token: string): Promise<void> {
    await this.cerrar.ejecutar(token);
  }

  @Get('cuentas/yo')
  @UseGuards(AutenticacionGuard)
  yo(@CuentaActual() cuenta: Cuenta) {
    return { ...cuenta.vistaPublica(), esAdministrador: esAdministrador(cuenta) };
  }
}
