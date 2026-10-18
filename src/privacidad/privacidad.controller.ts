import { Body, Controller, Delete, Get, HttpCode, UseGuards } from '@nestjs/common';
import { Cuenta } from '../domain/entities/cuenta';
import { ExportarDatosPersonales, EliminarCuenta } from '../application/use-cases/privacidad';
import { AvisoPrivacidad, avisoDePrivacidad } from '../domain/privacidad/aviso-privacidad';
import { AutenticacionGuard, CuentaActual } from '../identidad/autenticacion.guard';

/** Canal por el que se pide corregir un dato o resolver una duda; se puede cambiar con `CONTACTO_PRIVACIDAD`. */
const CONTACTO_POR_DEFECTO =
  'abre una solicitud en https://github.com/ISCOUTB/AS_202620_Recobra/issues indicando que es sobre privacidad';

/** Privacidad y datos personales (ADR-0021): aviso, descarga de datos y eliminación de la cuenta. */
@Controller()
export class PrivacidadController {
  constructor(
    private readonly exportar: ExportarDatosPersonales,
    private readonly eliminar: EliminarCuenta,
  ) {}

  /** Público: el aviso se puede leer antes de crear la cuenta. */
  @Get('privacidad')
  aviso(): AvisoPrivacidad {
    return avisoDePrivacidad(process.env.CONTACTO_PRIVACIDAD || CONTACTO_POR_DEFECTO);
  }

  @Get('cuentas/yo/datos')
  @UseGuards(AutenticacionGuard)
  misDatos(@CuentaActual() cuenta: Cuenta) {
    return this.exportar.ejecutar(cuenta);
  }

  @Delete('cuentas/yo')
  @HttpCode(204)
  @UseGuards(AutenticacionGuard)
  async eliminarCuenta(@Body() cuerpo: { contrasena: string }, @CuentaActual() cuenta: Cuenta): Promise<void> {
    await this.eliminar.ejecutar(cuenta, cuerpo?.contrasena);
  }
}
