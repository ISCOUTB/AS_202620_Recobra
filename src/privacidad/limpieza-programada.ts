import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LimpiezaPeriodica } from '../application/use-cases/privacidad';

const PRIMERA_PASADA_MS = 2 * 60 * 1000;
const CADA_MS = 24 * 60 * 60 * 1000;

/**
 * Corre la retención de datos dentro del propio proceso: a los 2 minutos de
 * arrancar y luego cada 24 horas (ADR-0021). No corre en las pruebas. Si falla,
 * deja una advertencia y lo reintenta en la siguiente pasada.
 */
@Injectable()
export class LimpiezaProgramada implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LimpiezaProgramada.name);
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(private readonly limpieza: LimpiezaPeriodica) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    const primera = setTimeout(() => this.pasada(), PRIMERA_PASADA_MS);
    const periodica = setInterval(() => this.pasada(), CADA_MS);
    primera.unref();
    periodica.unref();
    this.temporizadores = [primera, periodica];
  }

  onModuleDestroy(): void {
    for (const t of this.temporizadores) clearTimeout(t);
  }

  async pasada(): Promise<void> {
    try {
      const r = await this.limpieza.ejecutar();
      if (r.sesiones + r.avisos > 0) {
        this.logger.log(`Retención: ${r.sesiones} sesión(es) vencida(s) y ${r.avisos} aviso(s) antiguo(s) borrados`);
      }
    } catch (error) {
      this.logger.warn(`No se pudo aplicar la retención de datos: ${(error as Error).message}`);
    }
  }
}
