const path = require('node:path');
const express = require('express');
const { CrearPublicacion } = require('../../../application/use-cases/crear-publicacion');
const { ConsultarPublicacion } = require('../../../application/use-cases/consultar-publicacion');
const { PublicacionInvalidaError } = require('../../../domain/entities/publicacion');

function createApp({ publicacionRepository }) {
  const app = express();
  app.use(express.json());
  // Página de demostración del corte vertical (public/index.html), pensada
  // para mostrar la funcionalidad en clase sin depender de Postman/Thunder
  // Client. No forma parte del corte vertical en sí: es solo la vitrina.
  app.use(express.static(path.join(__dirname, '../../../../public')));

  const crearPublicacion = new CrearPublicacion(publicacionRepository);
  const consultarPublicacion = new ConsultarPublicacion(publicacionRepository);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'recobra-backend' });
  });

  app.post('/publicaciones', async (req, res) => {
    try {
      const publicacion = await crearPublicacion.ejecutar(req.body || {});
      res.status(201).json(publicacion);
    } catch (error) {
      if (error instanceof PublicacionInvalidaError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.get('/publicaciones/:id', async (req, res) => {
    const publicacion = await consultarPublicacion.ejecutar({ id: req.params.id });
    if (!publicacion) {
      res.status(404).json({ error: 'Publicación no encontrada' });
      return;
    }
    res.status(200).json(publicacion);
  });

  return app;
}

module.exports = { createApp };
