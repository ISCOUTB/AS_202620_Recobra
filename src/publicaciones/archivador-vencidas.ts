import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ArchivarVencidas, DIAS_VIGENCIA_POR_DEFECTO } from '../application/use-cases/ciclo-de-vida';

const PRIMERA_PASADA_MS = 60 * 1000;
const CADA_MS = 6 * 60 * 60 * 1000;

/**
 * Corre el vencimiento en el propio proceso: un minuto después de arrancar y
 * luego cada seis horas. `DIAS_VIGENCIA_PUBLICACION` cambia los días (60 por
 * omisión). No corre en las pruebas. Si falla (por ejemplo, la base no
 * responde), solo deja una advertencia: lo reintenta en la siguiente pasada.
 */
@Injectable()
export class ArchivadorVencidas implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArchivadorVencidas.name);
  private temporizadores: NodeJS.Timeout[] = [];

  constructor(private readonly archivar: ArchivarVencidas) {}

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
    const dias = Number(process.env.DIAS_VIGENCIA_PUBLICACION) || DIAS_VIGENCIA_POR_DEFECTO;
    try {
      const cerradas = await this.archivar.ejecutar(new Date(), dias);
      if (cerradas > 0) this.logger.log(`Publicaciones vencidas cerradas: ${cerradas} (vigencia ${dias} días)`);
    } catch (error) {
      this.logger.warn(`No se pudieron cerrar las publicaciones vencidas: ${(error as Error).message}`);
    }
  }
}
