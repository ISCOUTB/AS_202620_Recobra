const TIPOS_VALIDOS = ['perdido', 'encontrado'] as const;
export type TipoPublicacion = (typeof TIPOS_VALIDOS)[number];

const ESTADO_INICIAL = 'publicado';

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
}

export class Publicacion {
  readonly id: string;
  readonly tipo: TipoPublicacion;
  readonly descripcion: string;
  readonly categoria: string;
  readonly ubicacion: string;
  readonly estado: string;
  readonly creadoEn: string;

  constructor({ id, tipo, descripcion, categoria, ubicacion, creadoEn }: DatosPublicacion) {
    Publicacion.validar({ tipo, descripcion, categoria, ubicacion });

    this.id = id;
    this.tipo = tipo;
    this.descripcion = descripcion.trim();
    this.categoria = categoria.trim();
    this.ubicacion = ubicacion.trim();
    this.estado = ESTADO_INICIAL;
    this.creadoEn = creadoEn;
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
