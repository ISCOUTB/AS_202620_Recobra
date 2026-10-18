import { EstadoPublicacion, MotivoCierre, Publicacion, TipoPublicacion } from '../entities/publicacion';

export interface FiltrosBusqueda {
  tipo?: TipoPublicacion;
  /** Comparación exacta, sin distinguir mayúsculas ni espacios de borde. */
  categoria?: string;
  /** Comparación exacta, sin distinguir mayúsculas ni espacios de borde. */
  ubicacion?: string;
  /** Máximo de resultados, ya validado por el caso de uso (1..50). */
  limite: number;
}

/**
 * Puerto de persistencia para publicaciones.
 * Se declara como clase abstracta (y no como `interface`) a propósito:
 * las interfaces de TypeScript desaparecen en tiempo de compilación y no
 * sirven como token de inyección de dependencias de NestJS, mientras que
 * una clase abstracta sí. Esto es lo que permite que `application/` (los
 * casos de uso) dependa únicamente de este puerto, y que Nest resuelva en
 * tiempo de ejecución qué adaptador concreto lo implementa (ver
 * PublicacionesModule).
 */
export abstract class PublicacionRepository {
  /** Nombre del almacenamiento que respalda este adaptador (para /health/ready). */
  readonly almacenamiento: string = 'memoria';

  /**
   * Comprueba que el almacenamiento responde; lanza si no. Los adaptadores en
   * memoria siempre están disponibles, por eso el valor por omisión no hace
   * nada.
   */
  async verificarDisponibilidad(): Promise<void> {
    // sin dependencia externa: nada que comprobar
  }

  abstract guardar(publicacion: Publicacion): Promise<Publicacion>;

  /**
   * Inserta solo si no existe otra publicación con el mismo id y dice si la
   * insertó. Es la base de la creación idempotente (docs/modos-de-fallo.md):
   * los adaptadores reales lo hacen de forma atómica; esta versión por omisión
   * (consultar y luego guardar) basta para dobles de prueba.
   */
  async guardarSiNoExiste(publicacion: Publicacion): Promise<boolean> {
    if (await this.buscarPorId(publicacion.id)) return false;
    await this.guardar(publicacion);
    return true;
  }
  abstract buscarPorId(id: string): Promise<Publicacion | null>;
  /**
   * Usado por Emparejamiento (contexto de soporte) para buscar candidatos de
   * coincidencia — lectura, nunca escritura, ver docs/context-map.md.
   */
  abstract listarPorTipo(tipo: TipoPublicacion): Promise<Publicacion[]>;
  /**
   * Búsqueda con filtros del escenario S1 (ADR-0008). Solo lectura; devuelve
   * las más recientes primero, hasta `filtros.limite`, y solo las que están
   * en un estado activo (`ESTADOS_ACTIVOS`, ADR-0017).
   */
  abstract buscar(filtros: FiltrosBusqueda): Promise<Publicacion[]>;

  /**
   * Cambia el estado solo si sigue siendo `de` (comparar y fijar) y dice si
   * lo cambió. Así dos resoluciones simultáneas de reclamaciones no pueden
   * dejar la publicación en un estado incoherente. Solo lo usa el propio
   * contexto Publicaciones (`CambiarEstadoPublicacion`): es el dueño del dato.
   */
  abstract cambiarEstado(id: string, de: EstadoPublicacion, a: EstadoPublicacion): Promise<boolean>;

  /** Publicaciones de una cuenta, las más recientes primero. */
  abstract listarPorAutor(autorId: string): Promise<Publicacion[]>;

  /**
   * Cierra la publicación solo si sigue en "publicado" (comparar y fijar) y
   * dice si la cerró (ADR-0017). Los dobles de prueba que no lo usan heredan
   * esta versión, que falla.
   */
  async cerrar(_id: string, _motivo: MotivoCierre, _fecha: string): Promise<boolean> {
    throw new Error('cerrar no está implementado en este adaptador');
  }

  /** Cierra como "vencido" lo que sigue en "publicado" y se creó antes de `creadasAntesDe`; dice cuántas. */
  async cerrarVencidas(_creadasAntesDe: string, _fecha: string): Promise<number> {
    throw new Error('cerrarVencidas no está implementado en este adaptador');
  }
}
