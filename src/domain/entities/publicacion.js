const TIPOS_VALIDOS = ['perdido', 'encontrado'];
const ESTADO_INICIAL = 'publicado';

class PublicacionInvalidaError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'PublicacionInvalidaError';
  }
}

class Publicacion {
  constructor({ id, tipo, descripcion, categoria, ubicacion, creadoEn }) {
    Publicacion.validar({ tipo, descripcion, categoria, ubicacion });

    this.id = id;
    this.tipo = tipo;
    this.descripcion = descripcion.trim();
    this.categoria = categoria.trim();
    this.ubicacion = ubicacion.trim();
    this.estado = ESTADO_INICIAL;
    this.creadoEn = creadoEn;
  }

  static validar({ tipo, descripcion, categoria, ubicacion }) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new PublicacionInvalidaError(
        `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`
      );
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

module.exports = { Publicacion, PublicacionInvalidaError, TIPOS_VALIDOS };
