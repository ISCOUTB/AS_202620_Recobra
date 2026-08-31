const { createApp } = require('./infrastructure/adapters/http/server');
const { MemoriaPublicacionRepository } = require('./infrastructure/adapters/persistence/memoria-publicacion-repository');

const PORT = process.env.PORT || 3000;

const publicacionRepository = new MemoriaPublicacionRepository();
const app = createApp({ publicacionRepository });

app.listen(PORT, () => {
  console.log(`Recobra backend (esqueleto) escuchando en http://localhost:${PORT}`);
});
