import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConciliarAvisos } from '../application/use-cases/conciliar-avisos';

const PRIMERA_PASADA_MS = 60 * 1000;
const CADA_MS = 5 * 60 * 1000;

/**
 * Corre la conciliación de avisos dentro del propio proceso: al minuto de
 * arrancar y luego cada 5 minutos (ADR-0024). No corre en las pruebas. Si falla
 * (por ejemplo, la base no responde), deja una advertencia y lo reintenta en la
 * siguiente pasada.
 */
@Injectable()
export class ConciliadorAvisos implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConciliadorAvisos.name);
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(private readonly conciliar: ConciliarAvisos) {}

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
      const r = await this.conciliar.ejecutar();
      if (r.coincidencias + r.reclamaciones + r.moderaciones > 0) {
        this.logger.warn(`Avisos que faltaban, recreados: ${JSON.stringify(r)}`);
      }
    } catch (error) {
      this.logger.warn(`No se pudo conciliar los avisos: ${(error as Error).message}`);
    }
  }
}
