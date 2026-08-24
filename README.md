# AS_202620_Recobra

Plataforma para publicar y encontrar objetos perdidos dentro de un espacio delimitado (campus universitario, empresa, edificio de apartamentos, etc.), conectando a quien pierde algo con quien lo encuentra.

### Problema
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

Debe quedar en verde: `# pass 1`, `# fail 0`.

## Estructura del proyecto (estilo hexagonal, ver ADR-0001)

```
src/
  domain/            # entidades y puertos (contratos), sin dependencias externas
    entities/
    ports/
  application/        # casos de uso: orquestan el dominio
    use-cases/
  infrastructure/      # adaptadores concretos (entran o salen del sistema)
    adapters/
      http/            # adaptador de entrada (API REST)
      persistence/      # adaptador de salida (acceso a datos)
    config/
  server.js            # punto de entrada único
tests/
  health.test.js        # prueba automatizada base
```