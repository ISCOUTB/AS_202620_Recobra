import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Publicacion, PublicacionInvalidaError, TipoPublicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { PUBLICACION_CREADA } from '../events/publicacion-creada.event';
import { ConflictoIdempotenciaError } from '../errors/conflicto-idempotencia.error';

export interface DatosCrearPublicacion {
  tipo: TipoPublicacion;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  detalleUbicacion?: string | null;
}

export interface ResultadoCreacion {
  publicacion: Publicacion;
  /** true si la petición repetía una clave ya procesada y no se creó nada nuevo. */
  repetida: boolean;
}

const FORMATO_CLAVE = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * Deriva un id estable de la clave de idempotencia: el mismo reintento cae
 * siempre en la misma fila, y la regla `ON CONFLICT (id) DO NOTHING` del
 * adaptador impide un duplicado sin tablas nuevas (ver docs/modos-de-fallo.md).
 */
export function idDesdeClave(clave: string): string {
  const h = createHash('sha256').update(`recobra:publicacion:${clave}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * @Injectable() es un decorador de metadatos de NestJS, no una dependencia
 * de HTTP ni de persistencia: el caso de uso sigue dependiendo únicamente
 * del puerto `PublicacionRepository` (ver ADR-0002). Es lo que permite que
 * Nest resuelva e inyecte el adaptador concreto sin que este archivo sepa
 * cuál es.
 */
@Injectable()
export class CrearPublicacion {
  constructor(
    private readonly publicacionRepository: PublicacionRepository,
    private readonly eventos: EventEmitter2,
  ) {}

  /** `autorId`: cuenta que publica (obligatoria desde ADR-0013 en la API; opcional aquí para pruebas). */
  async ejecutar(datos: DatosCrearPublicacion, autorId: string | null = null): Promise<Publicacion> {
    const publicacion = this.construir(datos, randomUUID(), autorId);
    await this.publicacionRepository.guardar(publicacion);
    this.notificar(publicacion);
    return publicacion;
  }

  /**
   * Creación segura ante reintentos: si el cliente repite la petición con la
   * misma `claveIdempotencia` (porque no recibió la respuesta, o por un doble
   * clic), se devuelve la publicación ya creada, no se crea otra y el evento
   * de Emparejamiento no se emite dos veces. Con la misma clave y datos
   * distintos se rechaza (ConflictoIdempotenciaError).
   */
  async ejecutarIdempotente(
    datos: DatosCrearPublicacion,
    claveIdempotencia: string,
    autorId: string | null = null,
  ): Promise<ResultadoCreacion> {
    if (!FORMATO_CLAVE.test(claveIdempotencia)) {
      throw new PublicacionInvalidaError(
        'Idempotency-Key debe tener entre 8 y 100 caracteres: letras, números, guion o guion bajo',
      );
    }
    const id = idDesdeClave(claveIdempotencia);

    const previa = await this.publicacionRepository.buscarPorId(id);
    if (previa) return { publicacion: this.mismaPeticion(previa, datos, autorId), repetida: true };

    const publicacion = this.construir(datos, id, autorId);
    const insertada = await this.publicacionRepository.guardarSiNoExiste(publicacion);
    if (!insertada) {
      // Dos peticiones simultáneas con la misma clave: ganó la otra.
      const ganadora = await this.publicacionRepository.buscarPorId(id);
      if (!ganadora) throw new Error('La publicación concurrente no se pudo leer');
      return { publicacion: this.mismaPeticion(ganadora, datos, autorId), repetida: true };
    }

    this.notificar(publicacion);
    return { publicacion, repetida: false };
  }

  private construir(
    { tipo, descripcion, categoria, ubicacion, detalleUbicacion }: DatosCrearPublicacion,
    id: string,
    autorId: string | null,
  ): Publicacion {
    return new Publicacion({
      id,
      tipo,
      descripcion,
      categoria,
      ubicacion,
      detalleUbicacion,
      autorId,
      creadoEn: new Date().toISOString(),
    });
  }

  private notificar(publicacion: Publicacion): void {
    // Disparo asíncrono, sin esperar (ADR-0004): a Emparejamiento le llega
    // el evento, pero quien crea la publicación no espera su resultado.
    this.eventos.emit(PUBLICACION_CREADA, publicacion);
  }

  private mismaPeticion(existente: Publicacion, datos: DatosCrearPublicacion, autorId: string | null): Publicacion {
    const igual =
      existente.autorId === autorId &&
      existente.tipo === datos.tipo &&
      existente.descripcion === datos.descripcion?.trim() &&
      existente.categoria === datos.categoria?.trim() &&
      existente.ubicacion === datos.ubicacion?.trim() &&
      existente.detalleUbicacion === (datos.detalleUbicacion?.trim() || null);
    if (!igual) throw new ConflictoIdempotenciaError();
    return existente;
  }
}
