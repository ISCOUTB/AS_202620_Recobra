import { Injectable, Logger } from '@nestjs/common';
import { Notificacion } from '../../domain/entities/notificacion';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { NotificacionRepository } from '../../domain/ports/notificacion-repository';
import { correosAdministradores } from './moderacion';

/**
 * Alertas operativas para quien administra el sistema (modelo de amenazas T18).
 * Una línea en el registro del servidor sirve si alguien lo está mirando; esto
 * hace que la alerta llegue a una persona por el único canal que Recobra ya
 * tiene: los avisos de la aplicación de cada administrador (`ADMIN_CORREOS`).
 *
 * El aviso es uno por administrador y por día (su id lleva la fecha), así una
 * cola atascada no llena la bandeja cada 5 minutos.
 */
@Injectable()
export class AlertarAdministradores {
  private readonly logger = new Logger('Seguridad');

  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly notificaciones: NotificacionRepository,
  ) {}

  /** La cola de eventos fallidos llegó al umbral. Devuelve a cuántos administradores se les creó el aviso. */
  async colaDeFallidos(pendientes: number, umbral: number, ahora: Date = new Date()): Promise<number> {
    const dia = ahora.toISOString().slice(0, 10);
    let avisados = 0;
    for (const correo of correosAdministradores()) {
      const cuenta = await this.cuentas.buscarPorCorreo(correo);
      if (!cuenta || cuenta.eliminadaEn) continue;
      const creado = await this.notificaciones.guardarSiNoExiste(
        new Notificacion({
          id: `alerta-cola:${dia}:${cuenta.id}`,
          cuentaId: cuenta.id,
          tipo: 'alerta_operativa',
          titulo: 'Alerta: hay avisos sin entregar',
          mensaje:
            `La cola de eventos fallidos tiene ${pendientes} pendientes (el umbral es ${umbral}). ` +
            'Algo está fallando al guardar avisos; revisa los registros del servidor. Se reintentan solos cada 5 minutos.',
          publicacionId: 'sistema',
          creadoEn: ahora.toISOString(),
        }),
      );
      if (creado) avisados++;
    }
    if (avisados === 0 && correosAdministradores().length === 0) {
      this.logger.warn({ evento: 'seguridad.alerta_sin_destinatarios', motivo: 'ADMIN_CORREOS vacío' });
    }
    return avisados;
  }
}
