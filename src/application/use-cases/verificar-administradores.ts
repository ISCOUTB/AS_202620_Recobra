import { Injectable, Logger } from '@nestjs/common';
import { DOMINIO_INSTITUCIONAL } from '../../domain/entities/cuenta';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { estadoDeSeguridad } from '../../seguridad/estado-de-seguridad';
import { correosAdministradores } from './administradores';

export interface ResultadoVerificacion {
  /** Correos configurados como administrador que todavía no tienen cuenta. */
  sinCuenta: string[];
  /** Correos configurados que no son del dominio institucional (nunca podrían registrarse). */
  invalidos: string[];
}

/**
 * Amenaza T01 del modelo (docs/seguridad/modelo-de-amenazas.md): el correo no se
 * verifica por propiedad, así que mientras un correo de `ADMIN_CORREOS` no tenga
 * cuenta, **quien lo registre primero es administrador**. La mitigación es de
 * orden (se registra la cuenta y después se agrega a la lista) y esta
 * comprobación la vuelve visible: una línea de advertencia y una métrica por
 * cada correo de administrador sin cuenta, para que no pase desapercibido.
 */
@Injectable()
export class VerificarAdministradores {
  private readonly logger = new Logger('Seguridad');

  constructor(private readonly cuentas: CuentaRepository) {}

  async ejecutar(): Promise<ResultadoVerificacion> {
    const sinCuenta: string[] = [];
    const invalidos: string[] = [];
    for (const correo of correosAdministradores()) {
      if (!correo.endsWith(`@${DOMINIO_INSTITUCIONAL}`)) {
        invalidos.push(correo);
        this.logger.warn({ evento: 'seguridad.administrador_con_correo_invalido', correo });
        continue;
      }
      const cuenta = await this.cuentas.buscarPorCorreo(correo);
      if (!cuenta || cuenta.eliminadaEn) {
        sinCuenta.push(correo);
        this.logger.warn({
          evento: 'seguridad.administrador_sin_cuenta',
          correo,
          riesgo: 'quien registre primero este correo será administrador; que lo registre su dueño ahora',
        });
      }
    }
    estadoDeSeguridad.administradoresSinCuenta = sinCuenta.length;
    return { sinCuenta, invalidos };
  }
}
