import { Injectable } from '@nestjs/common';
import { ESTADOS_EMPAREJABLES, Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';
import { UMBRAL_COINCIDENCIA, calcularParecido } from '../../domain/emparejamiento/parecido';

const TIPO_OPUESTO: Record<TipoPublicacion, TipoPublicacion> = {
  perdido: 'encontrado',
  encontrado: 'perdido',
};

/**
 * Escenario S3 (notificar coincidencias probables). Heurística determinista,
 * a propósito (ADR-0007): misma categoría (obligatorio, sin eso no hay
 * candidato) y un parecido de 0 a 1 que pondera lugar, palabras en común y
 * cercanía de fechas (ADR-0018). Solo se guarda lo que supera el umbral.
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
      // Lo cerrado o ya entregado no recibe coincidencias (ADR-0017).
      if (!ESTADOS_EMPAREJABLES.includes(candidata.estado)) continue;
      if (candidata.categoria.trim().toLowerCase() !== publicacion.categoria.trim().toLowerCase()) {
        continue;
      }

      const score = calcularParecido(publicacion, candidata);
      if (score < UMBRAL_COINCIDENCIA) continue;
      const coincidencia = new Coincidencia({
        // Id determinista por par: si el evento llega dos veces, la segunda
        // escritura sobrescribe la misma coincidencia en vez de duplicarla.
        id: `${publicacion.id}__${candidata.id}`,
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

}
