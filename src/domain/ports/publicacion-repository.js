// Puerto de persistencia para publicaciones.
// Implementación actual: MemoriaPublicacionRepository.
// Pendiente: adaptador de PostgreSQL.

class PublicacionRepository {
  async guardar(publicacion) {
    throw new Error('PublicacionRepository.guardar no implementado');
  }

  async buscarPorId(id) {
    throw new Error('PublicacionRepository.buscarPorId no implementado');
  }
}

module.exports = { PublicacionRepository };
