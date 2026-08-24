// Punto de entrada único del backend.
// Se ejecuta con: npm install && npm start
const { createApp } = require('./infrastructure/adapters/http/server');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Recobra backend (esqueleto) escuchando en http://localhost:${PORT}`);
});
