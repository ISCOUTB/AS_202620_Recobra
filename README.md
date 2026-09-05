# AS_202620_Recobra

Plataforma para publicar y encontrar objetos perdidos dentro de un espacio delimitado (campus universitario, empresa, edificio de apartamentos, etc.), conectando a quien pierde algo con quien lo encuentra.

### Problema
No existe un canal centralizado, buscable y con notificaciones que conecte de forma eficiente a quien pierde un objeto con quien lo encuentra, lo que genera:
- Objetos que nunca son reclamados por falta de visibilidad.
- Tiempo perdido preguntando en múltiples canales no oficiales.
- Falta de trazabilidad sobre quién encontró qué y cuándo.
- Riesgo de fraude o falsas reclamaciones sin ningún mecanismo de verificación.

### Objetivos del proyecto
1. Centralizar publicaciones de objetos perdidos y encontrados en un solo lugar buscable.
2. Facilitar el emparejamiento (matching) entre publicaciones de "perdido" y "encontrado" mediante descripción, categoría, ubicación y fecha.
3. Notificar a los usuarios cuando exista una coincidencia probable con su publicación.
4. Dar trazabilidad al ciclo de vida de un objeto (publicado → en contacto → reclamado/cerrado).

## Stack

Backend **NestJS** (TypeScript) + frontend **Flutter**, según
[ADR-0002](docs/adr/0002-arquitectura-y-stack.md) y el reto de corte 1
[ADR-0003](docs/adr/0003-reto-corte1-stack-obligatorio.md). La arquitectura
interna del backend es hexagonal (puertos y adaptadores).

## Cómo levantar el backend

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run start
```

El servidor queda en `http://localhost:3000` y expone `GET /health`.

Vitrina de clase (no es el corte vertical): `http://localhost:3000/` → `public/index.html`.

Desarrollo con recarga: `npm run start:dev`.

## Cómo levantar el cliente Flutter

Requisitos: Flutter estable.

```bash
cd mobile
flutter pub get
flutter run -d chrome          # web contra localhost:3000
# o emulador Android (usa http://10.0.2.2:3000 por defecto)
flutter run
```

El backend debe estar corriendo. La app permite crear y consultar publicaciones.

## Cómo correr las pruebas

```bash
npm test           # unitarias (dominio y casos de uso)
npm run test:e2e   # extremo a extremo NestJS
cd mobile && flutter test
```

CI: `.github/workflows/ci.yml` ejecuta backend + Flutter en cada push/PR.

## Medición del corte 1

Con el servidor levantado:

```bash
npm run measure:post
```

Procedimiento, línea base y contraste con S5:
[`docs/medicion-corte1.md`](docs/medicion-corte1.md).

## Corte vertical: crear y consultar una publicación

Atraviesa HTTP → caso de uso → dominio → puerto `PublicacionRepository`.

- `domain/entities/publicacion.ts` — entidad y validación
- `domain/ports/publicacion-repository.ts` — puerto (clase abstracta = token DI)
- `application/use-cases/crear-publicacion.ts` y `consultar-publicacion.ts`
- `infrastructure/persistence/memoria-publicacion.repository.ts` — adaptador actual
- `publicaciones/` — adaptador HTTP Nest + filtro de errores de dominio
- `mobile/` — cliente Flutter del mismo corte

### Endpoints

**Crear**

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

`201 Created` con la publicación. Datos inválidos → `400` con `{ "error": "..." }`.

**Consultar**

```bash
curl http://localhost:3000/publicaciones/<id>
```

`200` o `404`.

## Documentación clave

| Documento | Contenido |
|-----------|-----------|
| [`docs/aspectos.md`](docs/aspectos.md) | Tabla de 8 columnas (trazabilidad) |
| [`docs/adr/`](docs/adr/) | ADR-0001 (reemplazada), 0002 (stack), 0003 (reto corte 1) |
| [`docs/c4/README.md`](docs/c4/README.md) | Contexto y contenedores |
| [`docs/arc42.md`](docs/arc42.md) | arc42 (bloques, ejecución, decisiones) |
| [`docs/ia.md`](docs/ia.md) | Registro de uso de IA |
| [`docs/medicion-corte1.md`](docs/medicion-corte1.md) | Línea base y resultado del reto |

## Estructura

```
src/                 # backend NestJS hexagonal
mobile/              # cliente Flutter
test/                # e2e backend
docs/                # arquitectura y evidencias
.github/workflows/   # CI
public/              # vitrina HTML de clase
scripts/             # medición de latencia
```
