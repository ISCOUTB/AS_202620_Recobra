import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { VerificarAdministradores } from '../application/use-cases/verificar-administradores';

const PRIMERA_PASADA_MS = 20 * 1000;
const CADA_MS = 6 * 60 * 60 * 1000;

/** Comprueba los correos de administrador al arrancar y cada 6 horas (amenaza T01). No corre en las pruebas. */
@Injectable()
export class VerificadorDeAdministradores implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VerificadorDeAdministradores.name);
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(private readonly verificar: VerificarAdministradores) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    const primera = setTimeout(() => void this.pasada(), PRIMERA_PASADA_MS);
    const periodica = setInterval(() => void this.pasada(), CADA_MS);
    primera.unref();
    periodica.unref();
    this.temporizadores = [primera, periodica];
  }

  onModuleDestroy(): void {
    for (const t of this.temporizadores) clearTimeout(t);
  }

  async pasada(): Promise<void> {
    try {
      await this.verificar.ejecutar();
    } catch (error) {
      this.logger.warn(`No se pudo comprobar los administradores: ${(error as Error).message}`);
    }
  }
}
