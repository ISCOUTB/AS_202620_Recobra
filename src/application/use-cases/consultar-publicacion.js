class ConsultarPublicacion {
  constructor(publicacionRepository) {
    this.publicacionRepository = publicacionRepository;
  }

  async ejecutar({ id }) {
    return this.publicacionRepository.buscarPorId(id);
  }
}

module.exports = { ConsultarPublicacion };
