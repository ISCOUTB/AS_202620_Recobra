import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ReconciliarReclamaciones } from '../application/use-cases/reconciliar-reclamaciones';

const PRIMERA_PASADA_MS = 45 * 1000;
const CADA_MS = 5 * 60 * 1000;

/**
 * Corre la reconciliación entre Publicaciones y Reclamaciones dentro del propio
 * proceso: a los 45 s de arrancar y luego cada 5 minutos (ADR-0020). No corre en
 * las pruebas. Si falla (por ejemplo, la base no responde), deja una
 * advertencia y lo reintenta en la siguiente pasada.
 */
@Injectable()
export class ReconciliadorReclamaciones implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliadorReclamaciones.name);
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(private readonly reconciliar: ReconciliarReclamaciones) {}

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
      const r = await this.reconciliar.ejecutar();
      const total = r.enVerificacion + r.publicadas + r.aprobaciones + r.entregas;
      if (total > 0) this.logger.warn(`Reclamaciones desalineadas reparadas: ${JSON.stringify(r)}`);
    } catch (error) {
      this.logger.warn(`No se pudo reconciliar las reclamaciones: ${(error as Error).message}`);
    }
  }
}
