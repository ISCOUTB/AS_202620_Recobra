export type EstadoEventoFallido = 'pendiente' | 'reprocesado';

const ERROR_MAXIMO = 200;

export interface DatosEventoFallido {
  /** El identificador de correlación del evento: el mismo que se ve en los registros del productor y del consumidor. */
  id: string;
  tipo: string;
  version: number;
  /** La carga del evento tal como se emitió (solo referencias y textos que el aviso ya muestra). */
  carga: unknown;
  ocurridoEn: string;
  intentos: number;
  ultimoError: string;
  estado?: EstadoEventoFallido;
  creadoEn: string;
  resueltoEn?: string | null;
}

/**
 * Un evento que no se pudo procesar tras sus reintentos (retry, ADR-0026): la
 * cola de mensajes fallidos (dead-letter queue, DLQ). Queda guardado para verlo y reprocesarlo cuando lo que
 * falló (por ejemplo, la base) se recupere, en vez de perderse.
 */
export class EventoFallido {
  readonly id: string;
  readonly tipo: string;
  readonly version: number;
  readonly carga: unknown;
  readonly ocurridoEn: string;
  readonly intentos: number;
  readonly ultimoError: string;
  readonly estado: EstadoEventoFallido;
  readonly creadoEn: string;
  readonly resueltoEn: string | null;

  constructor(datos: DatosEventoFallido) {
    this.id = datos.id;
    this.tipo = datos.tipo;
    this.version = datos.version;
    this.carga = datos.carga;
    this.ocurridoEn = datos.ocurridoEn;
    this.intentos = datos.intentos;
    // Un mensaje de error de la base puede traer datos de conexión: solo se guarda el comienzo.
    this.ultimoError = (datos.ultimoError ?? '').slice(0, ERROR_MAXIMO);
    this.estado = datos.estado ?? 'pendiente';
    this.creadoEn = datos.creadoEn;
    this.resueltoEn = datos.resueltoEn ?? null;
  }

  /** Otro intento de reproceso que también falló. */
  conOtroIntento(error: string): EventoFallido {
    return new EventoFallido({ ...this, intentos: this.intentos + 1, ultimoError: error });
  }

  reprocesado(ahora: string): EventoFallido {
    return new EventoFallido({ ...this, estado: 'reprocesado', resueltoEn: ahora });
  }
}
