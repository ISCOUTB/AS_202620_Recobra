import { Injectable } from '@nestjs/common';
import { Publicacion, PublicacionInvalidaError, TIPOS_VALIDOS, TipoPublicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 50;

export interface DatosBuscarPublicaciones {
  tipo?: string;
  categoria?: string;
  ubicacion?: string;
  limite?: string | number;
}

/**
 * Búsqueda con filtros (escenario S1, ADR-0008). Valida la entrada aquí, en
 * la capa de aplicación, igual que `Publicacion.validar` lo hace para crear:
 * el controlador solo orquesta y el adaptador de persistencia recibe filtros
 * ya normalizados. Un límite acotado evita respuestas ilimitadas.
 */
@Injectable()
export class BuscarPublicaciones {
  constructor(private readonly publicacionRepository: PublicacionRepository) {}

  async ejecutar(datos: DatosBuscarPublicaciones): Promise<Publicacion[]> {
    return this.publicacionRepository.buscar({
      tipo: this.normalizarTipo(datos.tipo),
      categoria: this.normalizarTexto(datos.categoria),
      ubicacion: this.normalizarTexto(datos.ubicacion),
      limite: this.normalizarLimite(datos.limite),
    });
  }

  private normalizarTipo(tipo?: string): TipoPublicacion | undefined {
    if (tipo === undefined || tipo === '') return undefined;
    if (!TIPOS_VALIDOS.includes(tipo as TipoPublicacion)) {
      throw new PublicacionInvalidaError(`tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
    }
    return tipo as TipoPublicacion;
  }

  private normalizarTexto(valor?: string): string | undefined {
    const limpio = valor?.trim().toLowerCase();
    return limpio ? limpio : undefined;
  }

  private normalizarLimite(limite?: string | number): number {
    if (limite === undefined || limite === '') return LIMITE_POR_DEFECTO;
    const numero = Number(limite);
    if (!Number.isInteger(numero) || numero < 1 || numero > LIMITE_MAXIMO) {
      throw new PublicacionInvalidaError(`limite debe ser un entero entre 1 y ${LIMITE_MAXIMO}`);
    }
    return numero;
  }
}
