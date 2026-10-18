import { Injectable } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import { Publicacion } from '../../domain/entities/publicacion';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { Notificacion } from '../../domain/entities/notificacion';
import { Reporte } from '../../domain/entities/reporte';
import { ReporteRepository } from '../../domain/ports/reporte-repository';
import { ConflictoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { HashContrasenas } from '../../domain/ports/hash-contrasenas';
import { NotificacionRepository } from '../../domain/ports/notificacion-repository';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';
import { SesionRepository } from '../../domain/ports/sesion-repository';
import { EliminarFotoDe, LimpiarFotosDeCerradas } from './fotos';
import { DIAS_RETENCION_AVISOS } from '../../domain/privacidad/aviso-privacidad';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Todo lo que Recobra guarda de una persona (derecho de acceso, ADR-0021). */
export interface DatosPersonales {
  generadoEn: string;
  cuenta: {
    id: string;
    correo: string;
    nombre: string;
    creadoEn: string;
    avisoDePrivacidadAceptadoEn: string | null;
    versionDelAviso: string | null;
  };
  publicaciones: Publicacion[];
  reclamaciones: Reclamacion[];
  avisos: Notificacion[];
  reportes: Reporte[];
}

/**
 * Descargar mis datos: la cuenta, lo que publiqué, mis reclamaciones (con la
 * prueba que escribí) y mis avisos. Nunca incluye la contraseña ni datos de
 * otras personas.
 */
@Injectable()
export class ExportarDatosPersonales {
  constructor(
    private readonly publicaciones: PublicacionRepository,
    private readonly reclamaciones: ReclamacionRepository,
    private readonly notificaciones: NotificacionRepository,
    private readonly reportes: ReporteRepository,
  ) {}

  async ejecutar(cuenta: Cuenta): Promise<DatosPersonales> {
    const [publicaciones, reclamaciones, avisos, reportes] = await Promise.all([
      this.publicaciones.listarPorAutor(cuenta.id),
      this.reclamaciones.listarPorReclamante(cuenta.id),
      this.notificaciones.listarPorCuenta(cuenta.id, 500),
      this.reportes.listarPorReportante(cuenta.id),
    ]);
    return {
      generadoEn: new Date().toISOString(),
      cuenta: {
        id: cuenta.id,
        correo: cuenta.correo,
        nombre: cuenta.nombre,
        creadoEn: cuenta.creadoEn,
        avisoDePrivacidadAceptadoEn: cuenta.privacidadAceptadaEn,
        versionDelAviso: cuenta.privacidadVersion,
      },
      publicaciones,
      reclamaciones,
      avisos,
      reportes,
    };
  }
}

/**
 * Eliminar mi cuenta (derecho de supresión, ADR-0021). Pide la contraseña y no
 * deja eliminar mientras haya algo en curso con otra persona (una reclamación
 * pendiente o aprobada sin entrega, o un objeto propio en verificación o por
 * entregar), para no dejarla esperando. Al eliminar: retira las publicaciones
 * propias que siguen publicadas, borra los avisos y las sesiones, reemplaza el
 * texto de las pruebas y de los reportes escritos, borra las fotos que subió y
 * quita el nombre, el correo y la contraseña.
 * Lo ya registrado (publicaciones cerradas, reclamaciones) queda apuntando a
 * una cuenta anónima, para conservar el historial sin datos personales.
 */
@Injectable()
export class EliminarCuenta {
  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly sesiones: SesionRepository,
    private readonly publicaciones: PublicacionRepository,
    private readonly reclamaciones: ReclamacionRepository,
    private readonly notificaciones: NotificacionRepository,
    private readonly reportes: ReporteRepository,
    private readonly hash: HashContrasenas,
    private readonly fotos: EliminarFotoDe,
  ) {}

  async ejecutar(cuenta: Cuenta, contrasena: string): Promise<void> {
    const coincide = typeof contrasena === 'string' && (await this.hash.verificar(contrasena, cuenta.hashContrasena));
    // 403 y no 401: un 401 haría que el cliente creyera que la sesión venció.
    if (!coincide) throw new PermisoDenegadoError('la contraseña no coincide');

    const propias = await this.publicaciones.listarPorAutor(cuenta.id);
    const reclamadas = await this.reclamaciones.listarPorReclamante(cuenta.id);
    const pendientes = this.enCurso(propias, reclamadas);
    if (pendientes.length > 0) {
      throw new ConflictoError(`Antes de eliminar tu cuenta resuelve: ${pendientes.join('; ')}.`);
    }

    const ahora = new Date().toISOString();
    for (const p of propias.filter((x) => x.estado === 'publicado')) {
      if (!(await this.publicaciones.cerrar(p.id, 'retirado', ahora))) {
        throw new ConflictoError('una de tus publicaciones cambió mientras tanto; vuelve a intentarlo');
      }
    }
    for (const p of propias.filter((x) => x.tieneFoto)) await this.fotos.ejecutar(p.id);
    await this.reclamaciones.anonimizarPruebasDe(cuenta.id);
    await this.reportes.anonimizarDetallesDe(cuenta.id);
    await this.notificaciones.eliminarDeCuenta(cuenta.id);
    await this.sesiones.eliminarDeCuenta(cuenta.id);
    await this.cuentas.anonimizar(cuenta.id, ahora);
  }

  private enCurso(propias: Publicacion[], reclamadas: Reclamacion[]): string[] {
    const mensajes: string[] = [];
    const objetos = propias.filter((p) => p.estado === 'en_verificacion' || p.estado === 'por_entregar').length;
    if (objetos > 0) {
      mensajes.push(`${objetos} objeto(s) tuyo(s) con una reclamación o una entrega en curso`);
    }
    const abiertas = reclamadas.filter((r) => r.estado === 'pendiente' || (r.estado === 'aprobada' && !r.entregadaEn)).length;
    if (abiertas > 0) mensajes.push(`${abiertas} reclamación(es) tuya(s) pendiente(s) o sin entrega confirmada`);
    return mensajes;
  }
}

/**
 * Retención (ADR-0021 y ADR-0023): borra las sesiones vencidas, los avisos de
 * más de `DIAS_RETENCION_AVISOS` días y las fotos de lo que ya se cerró o se
 * entregó, para no guardar datos que ya no hacen falta.
 */
@Injectable()
export class LimpiezaPeriodica {
  constructor(
    private readonly sesiones: SesionRepository,
    private readonly notificaciones: NotificacionRepository,
    private readonly fotos: LimpiarFotosDeCerradas,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<{ sesiones: number; avisos: number; fotos: number }> {
    const sesiones = await this.sesiones.eliminarExpiradas(ahora.toISOString());
    const limite = new Date(ahora.getTime() - DIAS_RETENCION_AVISOS * MS_POR_DIA).toISOString();
    const avisos = await this.notificaciones.eliminarAnterioresA(limite);
    const fotos = await this.fotos.ejecutar();
    return { sesiones, avisos, fotos };
  }
}
