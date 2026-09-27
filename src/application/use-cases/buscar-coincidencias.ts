import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';

const TIPO_OPUESTO: Record<TipoPublicacion, TipoPublicacion> = {
  perdido: 'encontrado',
  encontrado: 'perdido',
};

/**
 * Escenario S3 (notificar coincidencias probables). Heurística simple y
 * determinista, a propósito: misma categoría (obligatorio, sin eso no hay
 * candidato) + similitud de ubicación (gradúa el score). No sustituye un
 * motor de matching más sofisticado; es el mínimo defendible para esta
 * evidencia.
 *
 * Se dispara de forma asíncrona (ver ADR-0004): quien llama a este caso de
 * uso no debe esperar su resultado para responder al usuario que creó la
 * publicación.
 */
@Injectable()
export class BuscarCoincidencias {
  constructor(
    private readonly publicacionRepository: PublicacionRepository,
    private readonly coincidenciaRepository: CoincidenciaRepository,
  ) {}

  async ejecutar(publicacion: Publicacion): Promise<Coincidencia[]> {
    const candidatas = await this.publicacionRepository.listarPorTipo(TIPO_OPUESTO[publicacion.tipo]);

    const encontradas: Coincidencia[] = [];
    for (const candidata of candidatas) {
      if (candidata.categoria.trim().toLowerCase() !== publicacion.categoria.trim().toLowerCase()) {
        continue;
      }

      const score = this.calcularScore(publicacion, candidata);
      const coincidencia = new Coincidencia({
        id: randomUUID(),
        publicacionOrigenId: publicacion.id,
        publicacionCoincidenteId: candidata.id,
        score,
        creadoEn: new Date().toISOString(),
      });

      await this.coincidenciaRepository.guardar(coincidencia);
      encontradas.push(coincidencia);
    }

    return encontradas;
  }

  private calcularScore(a: Publicacion, b: Publicacion): number {
    const ubicacionA = a.ubicacion.trim().toLowerCase();
    const ubicacionB = b.ubicacion.trim().toLowerCase();

    if (ubicacionA === ubicacionB) return 1;
    if (ubicacionA.includes(ubicacionB) || ubicacionB.includes(ubicacionA)) return 0.6;
    return 0.3;
  }
}
