// Adaptador de entrada HTTP (infraestructura).
// No contiene lógica de negocio: solo expone la app para que un runner
// (src/server.js) la levante, y para que las pruebas puedan importarla
// sin abrir un socket real.
const express = require('express');

function createApp() {
  const app = express();
  app.use(express.json());

  // Endpoint de salud: confirma que el esqueleto arranca y responde.
  // Sirve como base para la prueba automatizada del Corte 1.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'recobra-backend' });
  });

  return app;
}

module.exports = { createApp };
