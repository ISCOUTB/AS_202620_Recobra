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

## Cómo correr las pruebas

```bash
npm test           # unitarias (dominio y casos de uso)
npm run test:e2e   # extremo a extremo NestJS
cd mobile && flutter test
```

CI: `.github/workflows/ci.yml` ejecuta backend + Flutter en cada push/PR.

## Despliegue (evidencia S8)

Infraestructura como código versionada en la raíz: [`Dockerfile`](Dockerfile)
(imagen del backend) + [`render.yaml`](render.yaml) (Render Blueprint).
Decisión de plataforma en [ADR-0005](docs/adr/0005-plataforma-despliegue-backend.md),
costo estimado en [`docs/despliegue/costo-mensual.md`](docs/despliegue/costo-mensual.md).

**Recrear el entorno:**

```bash
docker build -t recobra-backend .
docker run -p 3000:3000 -e PORT=3000 recobra-backend
```

**Desplegar en Render:** con sesión iniciada en render.com (cuenta sin
tarjeta, plan Free) → New → Blueprint → seleccionar este repositorio → Render
detecta `render.yaml` automáticamente → Apply. No hay secretos que
configurar manualmente: `PORT` lo asigna Render, y el resto de la app no usa
variables de entorno todavía.

**URL desplegada:** https://recobra-backend.onrender.com — health check en
[`/health`](https://recobra-backend.onrender.com/health), métrica ligada al
escenario S5 en [`/metrics`](https://recobra-backend.onrender.com/metrics).
Verificación externa completa (hora, código de respuesta, prueba de extremo
a extremo) en [`docs/arc42/arc42.md`](docs/arc42/arc42.md#7-vista-de-despliegue).

**Observabilidad:**
- Logs estructurados en JSON (`src/observabilidad/json-logger.service.ts`), un objeto por línea con `timestamp`, `level`, `context`, `message`.
- Métrica consultable: `GET /metrics` — latencia de `POST /publicaciones` (p50/p95), ligada al escenario S5 (ver [`docs/medicion-corte1.md`](docs/medicion-corte1.md)).

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
