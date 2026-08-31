const crypto = require('node:crypto');
const { Publicacion } = require('../../domain/entities/publicacion');

class CrearPublicacion {
  constructor(publicacionRepository) {
    this.publicacionRepository = publicacionRepository;
  }

  async ejecutar({ tipo, descripcion, categoria, ubicacion }) {
    const publicacion = new Publicacion({
      id: crypto.randomUUID(),
      tipo,
      descripcion,
      categoria,
      ubicacion,
      creadoEn: new Date().toISOString(),
    });

    await this.publicacionRepository.guardar(publicacion);

    return publicacion;
  }
}

module.exports = { CrearPublicacion };
