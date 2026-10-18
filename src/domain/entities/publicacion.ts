import { ConflictoError, DatoInvalidoError } from '../errors/errores-de-dominio';

const TIPOS_VALIDOS = ['perdido', 'encontrado'] as const;
export type TipoPublicacion = (typeof TIPOS_VALIDOS)[number];

/**
 * Ciclo de vida (escenario S6, ADR-0014 y ADR-0017): una publicación nace
 * "publicado"; pasa a "en_verificacion" cuando alguien la reclama; vuelve a
 * "publicado" si se rechazan todas las reclamaciones; pasa a "por_entregar"
 * cuando quien la publicó aprueba una, y termina en "reclamado" (entregado)
 * cuando una de las dos personas confirma la entrega. Mientras nadie la
 * reclama, su autor la puede cerrar ("cerrado": recuperado o retirado) y, si
 * nadie la toca durante la vigencia, se cierra sola ("vencido").
 */
export const ESTADOS_PUBLICACION = ['publicado', 'en_verificacion', 'por_entregar', 'reclamado', 'cerrado'] as const;
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number];

/** Estados que aparecen en la búsqueda: lo cerrado y lo ya entregado se ocultan. */
export const ESTADOS_ACTIVOS: readonly EstadoPublicacion[] = ['publicado', 'en_verificacion', 'por_entregar'];

/** Estados que pueden recibir coincidencias: lo que todavía no tiene dueño confirmado. */
export const ESTADOS_EMPAREJABLES: readonly EstadoPublicacion[] = ['publicado', 'en_verificacion'];

/**
 * Dónde está un objeto encontrado (ADR-0019): lo tiene quien lo encontró o lo
 * dejó en un punto de entrega (portería, oficina…). Los perdidos no tienen.
 */
export const CUSTODIAS = ['quien_lo_encontro', 'punto_de_entrega'] as const;
export type Custodia = (typeof CUSTODIAS)[number];
const PUNTO_MAXIMO = 120;

export const MOTIVOS_CIERRE = ['recuperado', 'retirado', 'vencido'] as const;
export type MotivoCierre = (typeof MOTIVOS_CIERRE)[number];

const ESTADO_INICIAL: EstadoPublicacion = 'publicado';

const MENSAJE_NO_SE_PUEDE_CERRAR: Record<EstadoPublicacion, string> = {
  publicado: '',
  en_verificacion: 'tiene una reclamación en curso: resuélvela antes de cerrarla',
  por_entregar: 'ya aprobaste una reclamación: confirma la entrega',
  reclamado: 'este objeto ya fue entregado',
  cerrado: 'esta publicación ya está cerrada',
};

/** Largo máximo del piso, salón o referencia ("Piso 2 · Salón 204"). */
export const DETALLE_MAXIMO = 120;

const TRANSICIONES: Record<EstadoPublicacion, EstadoPublicacion[]> = {
  publicado: ['en_verificacion', 'cerrado'],
  en_verificacion: ['por_entregar', 'publicado'],
  por_entregar: ['reclamado'],
  reclamado: [],
  cerrado: [],
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
  /** Piso, salón o punto de referencia dentro del lugar (opcional, solo se muestra). */
  detalleUbicacion?: string | null;
  creadoEn: string;
  /** Cuenta que la publicó; null en publicaciones anteriores a las cuentas. */
  autorId?: string | null;
  estado?: EstadoPublicacion;
  /** Solo en encontrados: quién o dónde tiene el objeto ahora (ADR-0019). */
  custodia?: Custodia | null;
  /** Solo con custodia "punto_de_entrega": el lugar donde quedó. */
  puntoCustodia?: string | null;
  /** Solo en publicaciones cerradas: por qué y cuándo. */
  motivoCierre?: MotivoCierre | null;
  cerradoEn?: string | null;
  /**
   * Reclamación aprobada (ADR-0020). Se guarda en el mismo paso atómico que el
   * cambio a "por_entregar", así un reintento o el reconciliador saben qué
   * aprobación quedó a medias. Es interno: no sale en las respuestas de la API.
   */
  reclamacionAprobadaId?: string | null;
}

export class Publicacion {
  readonly id: string;
  readonly tipo: TipoPublicacion;
  readonly descripcion: string;
  readonly categoria: string;
  readonly ubicacion: string;
  readonly detalleUbicacion: string | null;
  readonly estado: EstadoPublicacion;
  readonly creadoEn: string;
  readonly autorId: string | null;
  readonly motivoCierre: MotivoCierre | null;
  readonly cerradoEn: string | null;
  readonly custodia: Custodia | null;
  readonly puntoCustodia: string | null;
  readonly reclamacionAprobadaId: string | null;

  constructor({
    id,
    tipo,
    descripcion,
    categoria,
    ubicacion,
    detalleUbicacion,
    creadoEn,
    autorId,
    estado,
    motivoCierre,
    cerradoEn,
    custodia,
    puntoCustodia,
    reclamacionAprobadaId,
  }: DatosPublicacion) {
    Publicacion.validar({ tipo, descripcion, categoria, ubicacion, detalleUbicacion });
    const lugarCustodia = Publicacion.validarCustodia(tipo, custodia, puntoCustodia);

    this.id = id;
    this.tipo = tipo;
    this.descripcion = descripcion.trim();
    this.categoria = categoria.trim();
    this.ubicacion = ubicacion.trim();
    this.detalleUbicacion = detalleUbicacion?.trim() || null;
    this.estado = estado && ESTADOS_PUBLICACION.includes(estado) ? estado : ESTADO_INICIAL;
    this.creadoEn = creadoEn;
    this.autorId = autorId ?? null;
    this.motivoCierre = motivoCierre ?? null;
    this.cerradoEn = cerradoEn ?? null;
    this.custodia = lugarCustodia.custodia;
    this.puntoCustodia = lugarCustodia.puntoCustodia;
    this.reclamacionAprobadaId = reclamacionAprobadaId ?? null;
  }

  /** Lo que sale por la API: todo menos el dato interno de la aprobación en curso (ADR-0020). */
  toJSON(): Record<string, unknown> {
    const { reclamacionAprobadaId, ...publica } = this;
    void reclamacionAprobadaId;
    return publica;
  }

  /**
   * Un encontrado sin custodia la tiene "quien_lo_encontro"; con
   * "punto_de_entrega" hay que decir cuál. Un perdido no tiene custodia.
   */
  static validarCustodia(
    tipo: TipoPublicacion,
    custodia?: string | null,
    puntoCustodia?: string | null,
  ): { custodia: Custodia | null; puntoCustodia: string | null } {
    if (tipo === 'perdido') {
      if (custodia) throw new PublicacionInvalidaError('solo un objeto encontrado indica dónde está');
      return { custodia: null, puntoCustodia: null };
    }
    const valor = custodia ?? 'quien_lo_encontro';
    if (!CUSTODIAS.includes(valor as Custodia)) {
      throw new PublicacionInvalidaError(`custodia debe ser uno de: ${CUSTODIAS.join(', ')}`);
    }
    if (valor === 'quien_lo_encontro') return { custodia: 'quien_lo_encontro', puntoCustodia: null };
    const punto = typeof puntoCustodia === 'string' ? puntoCustodia.trim() : '';
    if (punto.length < 3 || punto.length > PUNTO_MAXIMO) {
      throw new PublicacionInvalidaError(`puntoCustodia debe tener entre 3 y ${PUNTO_MAXIMO} caracteres`);
    }
    return { custodia: 'punto_de_entrega', puntoCustodia: punto };
  }

  /**
   * Comprueba que su autor puede cerrarla con ese motivo: solo mientras nadie
   * la reclama, y "recuperado" solo tiene sentido para un objeto perdido.
   */
  static exigirCierre(publicacion: Publicacion, motivo: string): MotivoCierre {
    if (motivo !== 'recuperado' && motivo !== 'retirado') {
      throw new DatoInvalidoError('motivo debe ser "recuperado" o "retirado"');
    }
    if (motivo === 'recuperado' && publicacion.tipo !== 'perdido') {
      throw new DatoInvalidoError('solo un objeto perdido se puede marcar como recuperado');
    }
    if (publicacion.estado !== 'publicado') {
      throw new ConflictoError(MENSAJE_NO_SE_PUEDE_CERRAR[publicacion.estado]);
    }
    return motivo;
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
    detalleUbicacion,
  }: Pick<DatosPublicacion, 'tipo' | 'descripcion' | 'categoria' | 'ubicacion' | 'detalleUbicacion'>): void {
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
    if (detalleUbicacion != null && (typeof detalleUbicacion !== 'string' || detalleUbicacion.trim().length > DETALLE_MAXIMO)) {
      throw new PublicacionInvalidaError(`detalleUbicacion debe tener como máximo ${DETALLE_MAXIMO} caracteres`);
    }
  }
}

export { TIPOS_VALIDOS };
