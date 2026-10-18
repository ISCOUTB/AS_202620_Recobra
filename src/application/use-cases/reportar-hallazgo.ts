import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ESTADOS_EMPAREJABLES, Publicacion } from '../../domain/entities/publicacion';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { ConflictoError, NoEncontradoError } from '../../domain/errors/errores-de-dominio';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';
import { calcularParecido } from '../../domain/emparejamiento/parecido';
import { COINCIDENCIA_DETECTADA } from '../events/eventos-dominio';
import { CrearPublicacion } from './crear-publicacion';

export interface DatosHallazgo {
  /** Lo que ve quien lo tiene; sin los detalles que el dueño usará como prueba. */
  descripcion: string;
  ubicacion: string;
  detalleUbicacion?: string | null;
  custodia?: string | null;
  puntoCustodia?: string | null;
}

/**
 * "Lo tengo yo" (ADR-0019): alguien ve un objeto perdido y dice que lo tiene.
 * Se crea su publicación de encontrado (misma categoría) enlazada al perdido
 * con una coincidencia explícita, y el dueño recibe el aviso de siempre. El
 * dueño igual tiene que reclamarlo con su prueba (ADR-0014): así nadie se puede
 * hacer pasar por quien lo tiene para conseguir sus datos.
 */
@Injectable()
export class ReportarHallazgo {
  constructor(
    private readonly publicaciones: PublicacionRepository,
    private readonly crearPublicacion: CrearPublicacion,
    private readonly coincidencias: CoincidenciaRepository,
    private readonly eventos: EventEmitter2,
  ) {}

  async ejecutar(perdidoId: string, quienLoTieneId: string, datos: DatosHallazgo): Promise<Publicacion> {
    const perdido = await this.publicaciones.buscarPorId(perdidoId);
    if (!perdido) throw new NoEncontradoError('Publicación no encontrada');
    if (perdido.tipo !== 'perdido') throw new ConflictoError('"Lo tengo yo" solo se usa con objetos perdidos');
    if (!ESTADOS_EMPAREJABLES.includes(perdido.estado) || !perdido.autorId) {
      throw new ConflictoError('esta publicación ya está cerrada o el objeto ya apareció');
    }
    if (perdido.autorId === quienLoTieneId) throw new ConflictoError('no puedes responder a tu propia publicación');
    await this.exigirPrimerReporte(perdido.id, quienLoTieneId);

    const encontrado = await this.crearPublicacion.ejecutar(
      { ...datos, tipo: 'encontrado', categoria: perdido.categoria },
      quienLoTieneId,
    );
    // Coincidencia explícita: se guarda aunque el parecido calculado quede bajo
    // el umbral, porque alguien la señaló. El id por par evita duplicarla si el
    // emparejamiento automático también la encuentra.
    const coincidencia = new Coincidencia({
      id: `${encontrado.id}__${perdido.id}`,
      publicacionOrigenId: encontrado.id,
      publicacionCoincidenteId: perdido.id,
      score: calcularParecido(encontrado, perdido),
      creadoEn: new Date().toISOString(),
    });
    await this.coincidencias.guardar(coincidencia);
    this.eventos.emit(COINCIDENCIA_DETECTADA, coincidencia);
    return encontrado;
  }

  /** Una persona responde "lo tengo" una sola vez por objeto perdido. */
  private async exigirPrimerReporte(perdidoId: string, quienLoTieneId: string): Promise<void> {
    const previas = await this.coincidencias.listarPorPublicacion(perdidoId);
    const otras = await Promise.all(
      previas.map((c) =>
        this.publicaciones.buscarPorId(c.publicacionOrigenId === perdidoId ? c.publicacionCoincidenteId : c.publicacionOrigenId),
      ),
    );
    if (otras.some((p) => p?.tipo === 'encontrado' && p.autorId === quienLoTieneId)) {
      throw new ConflictoError('ya tienes un objeto encontrado enlazado a esta publicación: su dueño ya recibió el aviso');
    }
  }
}
