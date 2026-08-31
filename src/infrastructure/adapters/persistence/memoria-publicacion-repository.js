// Implementación en memoria de PublicacionRepository. Adaptador real
// mientras no exista el de PostgreSQL (ver ADR-0001).
const { PublicacionRepository } = require('../../../domain/ports/publicacion-repository');

class MemoriaPublicacionRepository extends PublicacionRepository {
  constructor() {
    super();
    this.publicaciones = new Map();
  }

  async guardar(publicacion) {
    this.publicaciones.set(publicacion.id, publicacion);
    return publicacion;
  }

  async buscarPorId(id) {
    return this.publicaciones.get(id) || null;
  }
}

module.exports = { MemoriaPublicacionRepository };
