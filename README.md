# AS_202620_Recobra

Plataforma para publicar y encontrar objetos perdidos dentro de un espacio delimitado (campus universitario, empresa, edificio de apartamentos, etc.), conectando a quien pierde algo con quien lo encuentra.

## Descripción

No existe hoy un canal centralizado, buscable y con notificaciones que
conecte de forma eficiente a quien pierde un objeto con quien lo encuentra.
Recobra centraliza esas publicaciones, las hace buscables y (en su alcance
objetivo) las empareja y notifica automáticamente, dando trazabilidad al
ciclo de vida del objeto hasta su reclamación o cierre.

Problema, usuarios objetivo, propuesta de solución y tensiones de calidad
completas en [`docs/ficha_problema.md`](docs/ficha_problema.md).

## Stack

Backend **NestJS** (TypeScript) + frontend **Flutter**, según
[ADR-0002](docs/adr/0002-arquitectura-y-stack.md) y el reto de corte 1
[ADR-0003](docs/adr/0003-reto-corte1-stack-obligatorio.md). La arquitectura
interna del backend es hexagonal (puertos y adaptadores).

## Cómo levantar el backend

Requisitos: Node.js 18 o superior.

```bash
npm install && npm run start
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

Para apuntar la app al backend **desplegado** en vez de local (útil para
demos sin correr nada local):

```bash
flutter run -d chrome --dart-define=API_BASE_URL=https://recobra.iscoutb.dev
```

## Cómo correr las pruebas

```bash
npm test           # unitarias (dominio y casos de uso)
npm run test:e2e   # extremo a extremo NestJS
cd mobile && flutter test
```

CI: `.github/workflows/ci.yml` ejecuta backend + Flutter en cada push/PR.

## Despliegue (Dokploy, evidencia S8 y S10)

El despliegue oficial corre en **Dokploy** (servidor del laboratorio), según
[ADR-0010](docs/adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md),
que reemplaza a Render y Neon ([ADR-0005](docs/adr/0005-plataforma-despliegue-backend.md),
[ADR-0006](docs/adr/0006-plataforma-persistencia-postgresql.md)). Infraestructura
como código en el repositorio: [`Dockerfile`](Dockerfile) (imagen del backend)
y [`deploy/compose.lab.yaml`](deploy/compose.lab.yaml) (servicio que lee
Dokploy). [`render.yaml`](render.yaml) se conserva solo como referencia
histórica. Costo: [`docs/despliegue/costo-mensual.md`](docs/despliegue/costo-mensual.md).

**URL desplegada:** https://recobra.iscoutb.dev — salud del proceso en
[`/health`](https://recobra.iscoutb.dev/health), disponibilidad de la base en
[`/health/ready`](https://recobra.iscoutb.dev/health/ready), métricas por
escenario en [`/metrics`](https://recobra.iscoutb.dev/metrics). Detalle del
entorno en [`docs/arc42/arc42.md`](docs/arc42/arc42.md#7-vista-de-despliegue).

**Variables de entorno** (se definen en el panel de Dokploy, nunca en el
repositorio; ver [`.env.example`](.env.example)):

| Variable | Para qué sirve | Si falta |
|---|---|---|
| `PORT` | Puerto de la API (3000 en el compose) | Usa 3000 |
| `DATABASE_URL` | Conexión a PostgreSQL | La API usa el adaptador en memoria: los datos se pierden en cada despliegue |
| `DATABASE_SSL` | `false` para una base interna sin TLS (el compose lo trae en `false`) | Exige TLS, como una base externa |

**Recrear el entorno:**

```bash
docker build -t recobra-backend .
docker run -p 3000:3000 -e PORT=3000 recobra-backend      # sin DATABASE_URL: en memoria
```

**Desplegar en Dokploy:** en un proyecto de Dokploy, crear un servicio
*Compose* apuntando a este repositorio y a la ruta `./deploy/compose.lab.yaml`;
crear un servicio *PostgreSQL* en el mismo proyecto; definir `DATABASE_URL`
(`DATABASE_URL=postgresql://...`) en la pestaña *Environment*; agregar el
dominio al servicio `backend` con el puerto 3000 y desplegar. Cada commit a
`master` redespliega solo (el dominio tarda entre 30 y 50 s en volver).

**Observabilidad:**
- Logs estructurados en JSON (`src/observabilidad/json-logger.service.ts`), un objeto por línea con `timestamp`, `level`, `context`, `message`.
- `GET /metrics`: latencia p50/p95 de `POST /publicaciones` (escenario S5, objetivo 100 ms) y, en el bloque `busqueda`, de `GET /publicaciones` con sus errores aparte (escenario S1, objetivo 400 ms). Ver [`docs/medicion-s10.md`](docs/medicion-s10.md).
- `GET /health` dice que el proceso está vivo; `GET /health/ready` dice si la base responde y su esquema está preparado (200, o 503 si no).

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

`201 Created` con la publicación. Datos inválidos → `400` con `{ "statusCode": 400, "message": "..." }` (esquema de error único, ADR-0009).

**Consultar**

```bash
curl http://localhost:3000/publicaciones/<id>
```

`200` o `404`.

**Buscar con filtros** (escenario S1, ver [ADR-0008](docs/adr/0008-busqueda-con-filtros-en-el-repositorio.md))

```bash
curl "http://localhost:3000/publicaciones?categoria=electronica&ubicacion=Biblioteca&tipo=perdido&limite=10"
```

Filtros opcionales y exactos (sin distinguir mayúsculas); `limite` entre 1 y 50 (20 por defecto); más recientes primero. Filtro inválido → `400`; almacenamiento caído → `503`. Medición: `npm run measure:busqueda` ([`docs/medicion-busqueda.md`](docs/medicion-busqueda.md) y [`docs/medicion-s10.md`](docs/medicion-s10.md)).

**Consultar coincidencias** (contexto Emparejamiento, ver
[`docs/context-map.md`](docs/context-map.md); se calculan de forma
asíncrona tras crear una publicación, ver [ADR-0004](docs/adr/0004-integracion-sincrona-vs-asincrona.md))

```bash
curl "http://localhost:3000/coincidencias?publicacionId=<id>"
```

`200` con un arreglo (vacío si aún no hay coincidencias o no se envía `publicacionId`).

## Documentación

La documentación del proyecto se encuentra en la carpeta `docs/`.

- [`docs/ficha_problema.md`](docs/ficha_problema.md) — descripción del problema, propuesta de solución y tensiones de calidad.
- [`docs/aspectos.md`](docs/aspectos.md) — aspectos arquitectónicos y trazabilidad (tabla de 8 columnas).
- [`docs/ia.md`](docs/ia.md) — registro del uso de inteligencia artificial.
- [`docs/arc42/`](docs/arc42/) — documentación de arquitectura mediante arc42.
- [`docs/c4/`](docs/c4/) — diagramas de arquitectura C4 (contexto, contenedores, componentes).
- [`docs/calidad/`](docs/calidad/) — atributos y escenarios de calidad, árbol de utilidad y restricciones justificadas.
- [`docs/adr/`](docs/adr/) — decisiones arquitectónicas (ADR-0001 reemplazada, 0002 stack, 0003 reto corte 1).
- [`docs/context-map.md`](docs/context-map.md) — mapa de contextos delimitados.
- [`docs/modulo-datos.md`](docs/modulo-datos.md) — módulo → datos, con dueño único.
- [`docs/medicion-corte1.md`](docs/medicion-corte1.md) — línea base y resultado del reto de corte 1.
- [`docs/medicion-s10.md`](docs/medicion-s10.md) — experimento del segundo corte: escenario S1 sobre el despliegue en Dokploy.
- [`docs/no-conformidades.md`](docs/no-conformidades.md) — no conformidades detectadas y su plan de corrección.
- [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml) — contrato ejecutable de la API (ADR-0004).
- [`docs/despliegue/costo-mensual.md`](docs/despliegue/costo-mensual.md) — estimación de costo del despliegue (ADR-0005).
- [`correcciones.md`](correcciones.md) — trazabilidad de hallazgos S1-S5 con su corrección.

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
