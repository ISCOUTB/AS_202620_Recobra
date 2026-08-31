# AS_202620_Recobra

Plataforma para publicar y encontrar objetos perdidos dentro de un espacio delimitado (campus universitario, empresa, edificio de apartamentos, etc.), conectando a quien pierde algo con quien lo encuentra.

### Problema:
No existe un canal centralizado, buscable y con notificaciones que conecte de forma eficiente a quien pierde un objeto con quien lo encuentra, lo que genera:
Objetos que nunca son reclamados por falta de visibilidad.
Tiempo perdido preguntando en múltiples canales no oficiales.
Falta de trazabilidad sobre quién encontró qué y cuándo.
Riesgo de fraude o falsas reclamaciones sin ningún mecanismo de verificación.

### Objetivos del proyecto
1. Centralizar publicaciones de objetos perdidos y encontrados en un solo lugar buscable.
2. Facilitar el emparejamiento (matching) entre publicaciones de "perdido" y "encontrado" mediante descripción, categoría, ubicación y fecha.
3. Notificar a los usuarios cuando exista una coincidencia probable con su publicación.
4. Dar trazabilidad al ciclo de vida de un objeto (publicado → en contacto → reclamado/cerrado).

## Cómo levantar el esqueleto

Requisitos: Node.js 18 o superior.

```bash
npm install && npm start
```

El servidor queda escuchando en `http://localhost:3000` y expone `GET /health`
para confirmar que el esqueleto arrancó correctamente.

## Cómo correr las pruebas

```bash
npm test
```

Debe quedar en verde: `# pass 7`, `# fail 0`.

## Corte vertical: crear y consultar una publicación

Este es el primer corte vertical de negocio del proyecto: atraviesa las tres
capas de la arquitectura hexagonal (HTTP → caso de uso → dominio) y persiste
a través del puerto `PublicacionRepository`, tal como lo exige ADR-0001.

- `domain/entities/publicacion.js` — entidad `Publicacion` y sus reglas de
  validación (tipo, descripción, categoría, ubicación obligatorios).
- `domain/ports/publicacion-repository.js` — puerto de persistencia.
- `application/use-cases/crear-publicacion.js` — caso de uso que orquesta la
  entidad y el puerto, sin conocer HTTP ni el motor de persistencia.
- `infrastructure/adapters/persistence/memoria-publicacion-repository.js` —
  adaptador que implementa el puerto en memoria. Es el adaptador real de este
  corte (no un mock): se reemplazará por un adaptador de PostgreSQL sin tocar
  `domain/` ni `application/`, como está previsto en
  `docs/arc42/04-estrategia-solucion.md`.
- `infrastructure/adapters/http/server.js` — adaptador de entrada que expone
  los endpoints y traduce errores de dominio a códigos HTTP.

### Endpoints

**Crear una publicación**

```bash
curl -X POST http://localhost:3000/publicaciones \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "perdido",
    "descripcion": "Cargador de laptop",
    "categoria": "electronica",
    "ubicacion": "Bloque 3"
  }'
```

Respuesta `201 Created`:

```json
{
  "id": "a47fdd1b-9977-4494-88ed-17aba2419647",
  "tipo": "perdido",
  "descripcion": "Cargador de laptop",
  "categoria": "electronica",
  "ubicacion": "Bloque 3",
  "estado": "publicado",
  "creadoEn": "2026-08-30T20:51:17.628Z"
}
```

Si `tipo` no es `perdido` ni `encontrado`, o falta algún campo obligatorio,
responde `400 Bad Request` con `{ "error": "<motivo>" }`.

**Consultar una publicación por id**

```bash
curl http://localhost:3000/publicaciones/<id>
```

Responde `200 OK` con la publicación, o `404 Not Found` si el id no existe.

## Estructura del proyecto (estilo hexagonal, ver ADR-0001)

```
src/
  domain/                      # entidades y puertos (contratos), sin dependencias externas
    entities/
      publicacion.js            # entidad Publicacion + validación
    ports/
      publicacion-repository.js # puerto de persistencia
  application/                 # casos de uso: orquestan el dominio
    use-cases/
      crear-publicacion.js
  infrastructure/               # adaptadores concretos (entran o salen del sistema)
    adapters/
      http/                     # adaptador de entrada (API REST)
        server.js
      persistence/              # adaptador de salida (acceso a datos)
        memoria-publicacion-repository.js
  server.js                     # punto de entrada único (composition root)
tests/
  health.test.js                 # prueba automatizada base
  crear-publicacion.test.js      # prueba del caso de uso contra el puerto en memoria
  publicaciones-http.test.js     # prueba de extremo a extremo del corte vertical
```
