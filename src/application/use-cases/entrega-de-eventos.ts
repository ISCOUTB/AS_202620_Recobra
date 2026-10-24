import { Injectable, Logger } from '@nestjs/common';
import { EventoFallido } from '../../domain/entities/evento-fallido';
import { EventoFallidoRepository } from '../../domain/ports/evento-fallido-repository';
import { EventoDominio } from '../events/eventos-dominio';
import { UMBRAL_ALERTA_COLA, metricasDeEventos } from '../events/metricas-eventos';
import { Notificar } from './notificaciones';

/** Intentos por evento antes de mandarlo a la cola de fallidos (el primero cuenta). */
export const INTENTOS_MAXIMOS = 3;
export const ESPERA_BASE_MS = 200;
export const FACTOR_DE_ESPERA = 4;
/** Cuánto se conserva un evento fallido, reprocesado o no. */
export const DIAS_RETENCION_FALLIDOS = 7;
export { UMBRAL_ALERTA_COLA };
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Espera antes del siguiente intento: 200 ms, 800 ms, 3,2 s… (crece por cuatro),
 * con ±20 % de variación para que reintentos simultáneos no vuelvan a coincidir.
 * Es una cota baja a propósito: el evento ya corre en segundo plano, y una base
 * que tarda más que eso se atiende con la cola de fallidos, no con esperas largas.
 */
export function esperaCreciente(intento: number, azar: () => number = Math.random): number {
  const base = ESPERA_BASE_MS * FACTOR_DE_ESPERA ** (intento - 1);
  return Math.round(base * (0.8 + azar() * 0.4));
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type ResultadoDeEntrega = 'procesado' | 'en_cola_de_fallidos' | 'sin_registro';

/**
 * Entrega de un evento a su consumidor con reintentos (ADR-0026): retry con
 * backoff exponencial (espera creciente), cola de mensajes fallidos
 * (dead-letter queue, DLQ) y reproceso (requeue). Garantía:
 * **al menos una vez** mientras el proceso viva (si el consumidor falla se
 * reintenta con espera creciente y, agotados los intentos, el evento queda en la
 * cola de fallidos para reprocesarlo) y **como máximo una vez** si el proceso
 * muere antes (el evento en memoria se pierde; lo recupera la conciliación de
 * avisos, ADR-0024). Como la entrega puede repetirse, el consumidor tiene que ser
 * idempotente: los avisos tienen un id derivado del dato que los origina.
 */
@Injectable()
export class ProcesadorDeEventos {
  private readonly logger = new Logger('Eventos');

  /** Se puede reemplazar en las pruebas para no esperar de verdad. */
  dormir: (ms: number) => Promise<void> = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

  constructor(private readonly fallidos: EventoFallidoRepository) {}

  async procesar<T>(
    evento: EventoDominio<T>,
    consumidor: (evento: EventoDominio<T>) => Promise<unknown>,
  ): Promise<ResultadoDeEntrega> {
    let ultimoError = '';
    for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
      try {
        await consumidor(evento);
        metricasDeEventos.registrar('procesados');
        this.logger.log({ evento: 'evento.procesado', eventoId: evento.id, tipo: evento.tipo, intento });
        return 'procesado';
      } catch (error) {
        ultimoError = mensajeDe(error);
        if (intento < INTENTOS_MAXIMOS) {
          const esperaMs = esperaCreciente(intento);
          metricasDeEventos.registrar('reintentos');
          this.logger.warn({
            evento: 'evento.reintento',
            eventoId: evento.id,
            tipo: evento.tipo,
            intento,
            esperaMs,
            error: ultimoError,
          });
          await this.dormir(esperaMs);
        }
      }
    }
    return this.mandarALaCola(evento, ultimoError);
  }

  private async mandarALaCola(evento: EventoDominio, ultimoError: string): Promise<ResultadoDeEntrega> {
    try {
      await this.fallidos.guardar(
        new EventoFallido({
          id: evento.id,
          tipo: evento.tipo,
          version: evento.version,
          carga: evento.carga,
          ocurridoEn: evento.ocurridoEn,
          intentos: INTENTOS_MAXIMOS,
          ultimoError,
          creadoEn: new Date().toISOString(),
        }),
      );
      metricasDeEventos.registrar('enColaDeFallidos');
      this.logger.error({
        evento: 'evento.en_cola_de_fallidos',
        eventoId: evento.id,
        tipo: evento.tipo,
        intentos: INTENTOS_MAXIMOS,
        error: ultimoError,
      });
      return 'en_cola_de_fallidos';
    } catch {
      // Si tampoco se puede guardar (la misma caída), queda el registro y la conciliación por estado.
      this.logger.error({ evento: 'evento.sin_registro', eventoId: evento.id, tipo: evento.tipo, error: ultimoError });
      return 'sin_registro';
    }
  }
}

export interface ResumenDeReproceso {
  reprocesados: number;
  siguenFallando: number;
  borrados: number;
  /** Eventos que siguen esperando en la cola tras esta pasada. */
  pendientes: number;
  /** Si `pendientes` llegó al umbral y se emitió la alerta. */
  alerta: boolean;
}

/**
 * Reproceso de la cola de fallidos / dead-letter queue (ADR-0026, requeue):
 * vuelve a entregar, una vez por
 * pasada, cada evento pendiente y lo marca como reprocesado si ahora sí se
 * pudo. Los que siguen fallando suman un intento y se reintentan en la pasada
 * siguiente; los de más de 7 días se borran (retención).
 */
@Injectable()
export class ReprocesarEventosFallidos {
  private readonly logger = new Logger('Eventos');

  constructor(
    private readonly fallidos: EventoFallidoRepository,
    private readonly notificar: Notificar,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<ResumenDeReproceso> {
    let reprocesados = 0;
    let siguenFallando = 0;
    for (const guardado of await this.fallidos.listarPendientes(100)) {
      const evento: EventoDominio = {
        id: guardado.id,
        tipo: guardado.tipo,
        version: guardado.version,
        ocurridoEn: guardado.ocurridoEn,
        carga: guardado.carga,
      };
      try {
        await this.notificar.procesar(evento);
        await this.fallidos.guardar(guardado.reprocesado(ahora.toISOString()));
        metricasDeEventos.registrar('reprocesados');
        this.logger.log({
          evento: 'evento.reprocesado',
          eventoId: guardado.id,
          tipo: guardado.tipo,
          intentos: guardado.intentos + 1,
        });
        reprocesados++;
      } catch (error) {
        await this.fallidos.guardar(guardado.conOtroIntento(mensajeDe(error)));
        this.logger.warn({
          evento: 'evento.sigue_fallando',
          eventoId: guardado.id,
          tipo: guardado.tipo,
          intentos: guardado.intentos + 1,
        });
        siguenFallando++;
      }
    }
    const limite = new Date(ahora.getTime() - DIAS_RETENCION_FALLIDOS * MS_POR_DIA).toISOString();
    const borrados = await this.fallidos.eliminarAnterioresA(limite);
    const pendientes = (await this.fallidos.listarPendientes(1000)).length;
    metricasDeEventos.fijarPendientesEnCola(pendientes);
    const alerta = pendientes >= UMBRAL_ALERTA_COLA;
    if (alerta) {
      // Alerta operativa: queda en el registro con nivel error, donde la ven los paneles de logs y los avisos de la plataforma.
      this.logger.error({ evento: 'alerta.cola_de_fallidos', pendientes, umbral: UMBRAL_ALERTA_COLA });
    }
    return { reprocesados, siguenFallando, borrados, pendientes, alerta };
  }
}
