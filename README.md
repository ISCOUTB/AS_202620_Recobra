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

**Posicionamiento ([ADR-0016](docs/adr/0016-recobra-semiindependiente-de-la-app-utb.md)):** hoy Recobra es
**semiindependiente** de la app de la UTB: tiene su propia API, app y
vitrina, con cuentas `@utb.edu.co` y el mismo lenguaje visual de la app
institucional. El **objetivo potencial** es integrarse como un módulo de la app
UTB (inicio de sesión con la cuenta de la universidad, entrada desde su menú y
avisos por su canal); cada punto de integración ya está detrás de un puerto o
del contrato de la API para poder darlo sin reescribir el dominio.

**Probar:** vitrina web en https://recobra.iscoutb.dev y la app Flutter
(versión web) en https://recobra.iscoutb.dev/app/. En ambas: crear cuenta con un
correo `@utb.edu.co`, publicar, buscar, reclamar, aprobar, confirmar la entrega,
cerrar publicaciones y ver avisos. La imagen de Docker compila la app web
(etapa `app-web` del `Dockerfile`) y la API la sirve en `/app/`, en el mismo
origen.

**URL oficial (subdominio de iscoutb.dev) y qué hay en cada dirección:**

| Qué | Dirección | Es |
|---|---|---|
| Sitio de Recobra (vitrina web) | https://recobra.iscoutb.dev/ | Interfaz |
| App de Recobra (Flutter, versión web) | https://recobra.iscoutb.dev/app/ | Interfaz |
| API REST (mismo host, sin prefijo) | https://recobra.iscoutb.dev/publicaciones, `/lugares`, `/health`, `/health/ready`, `/metrics`… | API: contrato en [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml) |

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

El backend debe estar corriendo. La app sigue el estilo de la app UTB (tema oscuro; ver
[`docs/diseno-ui.md`](docs/diseno-ui.md)) y tiene cuatro secciones: **Inicio** (buscar y ver
coincidencias, sin cuenta), **Publicar**, **Mis cosas** (lo que publicaste, con sus
reclamaciones para aprobar o rechazar, y lo que reclamaste) y **Perfil**. Publicar y reclamar
piden iniciar sesión con correo `@utb.edu.co`; la sesión se guarda en el dispositivo (7 días) y se restaura al abrir la app; se borra al cerrar sesión.

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
| `CONTACTO_PRIVACIDAD` | Texto con el canal de contacto que muestra el aviso de privacidad (por ejemplo, un correo del equipo) | Indica abrir una solicitud en el repositorio |
| `ADMIN_CORREOS` | Correos `@utb.edu.co` (separados por comas) de quienes pueden resolver reportes de abuso | Nadie es administrador: se puede reportar, pero nadie resuelve |
| `DIAS_VIGENCIA_PUBLICACION` | Días sin movimiento antes de cerrar una publicación sola | 60 |

El `compose` de producción ([`deploy/compose.lab.yaml`](deploy/compose.lab.yaml)) solo reenvía al contenedor las variables que lista; una variable nueva que se defina en Dokploy debe agregarse también allí. Tras cambiar una variable en el panel hay que volver a desplegar el servicio.

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
- Respaldo y restauración de la base: procedimiento verificado en CI y lo que falta para producción en [`docs/despliegue/respaldos.md`](docs/despliegue/respaldos.md).
- `GET /metrics` incluye además el bloque `eventos` (emitidos, procesados, reintentos, en cola de fallidos, reprocesados) de los eventos entre contextos ([ADR-0026](docs/adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md)).
- `GET /health` dice que el proceso está vivo; `GET /health/ready` dice si la base responde y su esquema está preparado (200, o 503 si no).

## Medición del corte 1

Con el servidor levantado:

```bash
npm run measure:post
```

Procedimiento, línea base y contraste con S5:
[`docs/medicion-corte1.md`](docs/medicion-corte1.md).

## Corte vertical: publicaciones, cuentas y reclamaciones

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
    "ubicacion": "Bloque A1",
    "detalleUbicacion": "Piso 2 · Salón 204"
  }'
```

`201 Created` con la publicación. `ubicacion` es el lugar del campus (filtra y empareja) y `detalleUbicacion`, opcional, el piso, salón o referencia. El catálogo de lugares con sus pisos sale de `GET /lugares`, el mismo para la app y la vitrina. Datos inválidos → `400` con `{ "statusCode": 400, "message": "..." }` (esquema de error único, ADR-0009).

Con la cabecera opcional `Idempotency-Key: <clave aleatoria>`, repetir la misma creación no la duplica: el reintento responde `200` con la publicación original, y la misma clave con datos distintos responde `422`. La vitrina y la app la envían. Ver [`docs/modos-de-fallo.md`](docs/modos-de-fallo.md).

**Cuentas y sesión** (publicar y reclamar exigen sesión; ver [ADR-0013](docs/adr/0013-cuentas-con-correo-institucional-y-sesiones-opacas.md))

```bash
curl -X POST http://localhost:3000/cuentas -H "Content-Type: application/json" \
  -d '{"correo":"ana@utb.edu.co","nombre":"Ana","contrasena":"una-contrasena"}'
curl -X POST http://localhost:3000/sesiones -H "Content-Type: application/json" \
  -d '{"correo":"ana@utb.edu.co","contrasena":"una-contrasena"}'   # devuelve {"token": ...}
```

Con el token, `POST /publicaciones` se llama con `Authorization: Bearer <token>`; sin él responde `401`.

**Reclamar un objeto encontrado** (escenario S2, [ADR-0014](docs/adr/0014-reclamacion-con-prueba-y-aprobacion.md))

- `POST /publicaciones/<id>/reclamaciones` con `{"prueba": "algo que solo el dueño sabría"}` → la publicación pasa a `en_verificacion`.
- Quien publicó: `GET /publicaciones/<id>/reclamaciones`, y `POST /reclamaciones/<id>/aprobar` o `/rechazar` con `{"motivo": "..."}`. Aprobar deja el objeto `por_entregar`; cualquiera de los dos confirma la entrega con `POST /reclamaciones/<id>/entregada` y el objeto pasa a `reclamado` ([ADR-0017](docs/adr/0017-ciclo-de-vida-completo-cierre-vencimiento-y-entrega.md)).
- **Dónde está y "Lo tengo yo"** ([ADR-0019](docs/adr/0019-donde-esta-el-objeto-y-lo-tengo-yo.md)): un encontrado lleva `custodia` (`quien_lo_encontro` o `punto_de_entrega` con `puntoCustodia`), que su autor cambia con `POST /publicaciones/<id>/custodia`. Sobre un perdido ajeno, `POST /publicaciones/<id>/lo-tengo` con `{"descripcion", "ubicacion", "custodia"?}` crea el encontrado enlazado y avisa al dueño, que igual lo reclama con su prueba.
- Su autor cierra una publicación sin reclamaciones con `POST /publicaciones/<id>/cerrar` y `{"motivo": "recuperado"}` (solo perdidos) o `"retirado"`. Lo que lleva 60 días sin movimiento se cierra solo (`DIAS_VIGENCIA_PUBLICACION`). La búsqueda no muestra lo cerrado ni lo entregado.
- Cada cuenta: `GET /publicaciones/mias` y `GET /reclamaciones/mias` (el correo de la otra persona aparece solo cuando se aprueba).

**Privacidad y datos personales** ([ADR-0021](docs/adr/0021-privacidad-y-datos-personales.md))

- Crear la cuenta exige `"aceptoPrivacidad": true`; el aviso se lee en `GET /privacidad` (público, versionado).
- `GET /cuentas/yo/datos` descarga todo lo que se guarda de la cuenta; `DELETE /cuentas/yo` con `{"contrasena": "..."}` la elimina (anonimiza) si no hay reclamaciones ni entregas en curso.
- `POST /sesiones` responde `429` con `Retry-After` tras 5 intentos fallidos por correo en 15 minutos.

**Fotos con privacidad** ([ADR-0023](docs/adr/0023-fotos-con-privacidad.md))

- Quien publicó agrega o cambia la foto con `PUT /publicaciones/<id>/foto` (cuerpo `image/jpeg`, hasta 1 MB, y la miniatura de hasta 32 px en base64 en la cabecera `X-Miniatura`) y la quita con `DELETE`. El servidor quita el EXIF (ubicación GPS) y la publicación muestra `tieneFoto`.
- `GET /publicaciones/<id>/foto/miniatura` es público. `GET /publicaciones/<id>/foto` (completa) es público en un perdido; en un encontrado solo la ven su autor y quien tiene una reclamación aprobada (403 para los demás).
- La foto se borra cuando la publicación se cierra, se entrega o se oculta, y al eliminar la cuenta.

**Moderación mínima** ([ADR-0022](docs/adr/0022-moderacion-minima-reportes-y-ocultar.md))

- Cualquier cuenta reporta una publicación ajena con `POST /publicaciones/<id>/reportar` y `{"motivo": "falso|spam|inapropiado|datos_personales|otro", "detalle"?}` (una vez por cuenta).
- Los administradores (`ADMIN_CORREOS`) ven `GET /moderacion/reportes` y resuelven con `POST /moderacion/reportes/<id>/resolver` y `{"decision": "ocultar"|"descartar", "nota"?}`. Ocultar cierra la publicación con motivo `moderado` y avisa a su autor; no se oculta mientras haya una reclamación o entrega en curso.

**Avisos** (escenario S3, [ADR-0015](docs/adr/0015-notificaciones-en-la-aplicacion.md))

- `GET /notificaciones` con sesión → `{"noLeidas": n, "notificaciones": [...]}`: coincidencias con lo que perdiste, reclamaciones nuevas de lo que publicaste y la respuesta a tus reclamaciones.
- `POST /notificaciones/<id>/leida` y `POST /notificaciones/leidas` → `204`. La vitrina y la app muestran una campana con el contador.

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
- [`docs/modos-de-fallo.md`](docs/modos-de-fallo.md) — modos de fallo de cada integración, su mitigación, código y prueba (S11).
- [`docs/diseno-ui.md`](docs/diseno-ui.md) — paleta y patrones de interfaz tomados de la app UTB.
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
