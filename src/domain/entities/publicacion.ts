import { ConflictoError } from '../errors/errores-de-dominio';

const TIPOS_VALIDOS = ['perdido', 'encontrado'] as const;
export type TipoPublicacion = (typeof TIPOS_VALIDOS)[number];

/**
 * Ciclo de vida (escenario S6): una publicación nace "publicado"; pasa a
 * "en_verificacion" cuando alguien la reclama; vuelve a "publicado" si se
 * rechazan todas las reclamaciones, o termina en "reclamado" solo si quien la
 * publicó aprueba una (escenario S2, ADR-0014).
 */
export const ESTADOS_PUBLICACION = ['publicado', 'en_verificacion', 'reclamado'] as const;
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number];

const ESTADO_INICIAL: EstadoPublicacion = 'publicado';

const TRANSICIONES: Record<EstadoPublicacion, EstadoPublicacion[]> = {
  publicado: ['en_verificacion'],
  en_verificacion: ['reclamado', 'publicado'],
  reclamado: [],
};

export class PublicacionInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'PublicacionInvalidaError';
  }
}

export interface DatosPublicacion {
  id: string;
  tipo: TipoPublicacion;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  creadoEn: string;
  /** Cuenta que la publicó; null en publicaciones anteriores a las cuentas. */
  autorId?: string | null;
  estado?: EstadoPublicacion;
}

export class Publicacion {
  readonly id: string;
  readonly tipo: TipoPublicacion;
  readonly descripcion: string;
  readonly categoria: string;
  readonly ubicacion: string;
  readonly estado: EstadoPublicacion;
  readonly creadoEn: string;
  readonly autorId: string | null;

  constructor({ id, tipo, descripcion, categoria, ubicacion, creadoEn, autorId, estado }: DatosPublicacion) {
    Publicacion.validar({ tipo, descripcion, categoria, ubicacion });

    this.id = id;
    this.tipo = tipo;
    this.descripcion = descripcion.trim();
    this.categoria = categoria.trim();
    this.ubicacion = ubicacion.trim();
    this.estado = estado && ESTADOS_PUBLICACION.includes(estado) ? estado : ESTADO_INICIAL;
    this.creadoEn = creadoEn;
    this.autorId = autorId ?? null;
  }

  /** Comprueba que el paso de estado está permitido por el ciclo de vida; si no, ConflictoError. */
  static exigirTransicion(de: EstadoPublicacion, a: EstadoPublicacion): void {
    if (!TRANSICIONES[de].includes(a)) {
      throw new ConflictoError(`la publicación no puede pasar de "${de}" a "${a}"`);
    }
  }

  static validar({
    tipo,
    descripcion,
    categoria,
    ubicacion,
  }: Pick<DatosPublicacion, 'tipo' | 'descripcion' | 'categoria' | 'ubicacion'>): void {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new PublicacionInvalidaError(`tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
    }
    if (!descripcion || !descripcion.trim()) {
      throw new PublicacionInvalidaError('descripcion es obligatoria');
    }
    if (!categoria || !categoria.trim()) {
      throw new PublicacionInvalidaError('categoria es obligatoria');
    }
    if (!ubicacion || !ubicacion.trim()) {
      throw new PublicacionInvalidaError('ubicacion es obligatoria');
    }
  }
}

export { TIPOS_VALIDOS };
