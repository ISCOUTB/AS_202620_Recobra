# ADR-0009: Versionado semántico del contrato y esquema de error único

## Estado

Aceptada — 2026-10-04. **Sucesor de [ADR-0004](0004-integracion-sincrona-vs-asincrona.md)
en lo que ese ADR dejó de describir:** la decisión de integración
(síncrona para el corte vertical, asíncrona entre contextos) no cambia y
sigue vigente; lo que cambió desde su aceptación (2026-09-19) se registra
aquí, como pide el curso, en vez de seguir editando el ADR original.

## Contexto

ADR-0004 se aceptó con el contrato en la versión 1.0.0. Después se
introdujeron tres cambios que ADR-0004 no podía anticipar:

1. Emparejamiento pasó de diseño a código (evento en proceso
   `publicacion.creada`), y con él la ruta `GET /coincidencias` (1.1.0).
2. Los errores se unificaron en un solo esquema `Error`
   (`{ statusCode, message }`): el 400 respondía antes `{ error }` y el
   404/500 respondían `{ statusCode, message }` — dos formas para el mismo
   concepto (2.0.0).
3. El contrato declara ahora el servidor de producción (Render) además del
   local.

El archivo de ADR-0004 se actualizó el 2026-09-28 (commit `34ab8f2`) para
reflejarlo, sin declarar un sucesor: es una edición posterior a la
aceptación que el contrato del curso no admite (ver
[`docs/no-conformidades.md`](../no-conformidades.md), punto 8). Este ADR es
la corrección: **desde su fecha, el texto de ADR-0004 no se vuelve a
tocar**, y cualquier cambio posterior sobre esa decisión se registra en un
ADR sucesor.

## Alternativas consideradas

### A. Un único esquema de error y versionado semántico del contrato (elegida)

Versión mayor cuando un consumidor existente se rompe (2.0.0: cambió la
forma del 400), menor cuando solo se agrega (1.1.0: `/coincidencias`;
2.1.0: `GET /publicaciones` con filtros).

### B. Mantener dos formas de error (descartada)

- **A favor:** no obliga a tocar a los consumidores.
- **En contra:** cada consumidor debe leer dos formas para el mismo
  concepto; la prueba de contrato necesitaría dos esquemas y deja de
  detectar una desviación como defecto.

### C. Versionar en la ruta (`/v2/publicaciones`) (descartada)

- **A favor:** convive con consumidores externos antiguos.
- **En contra:** hoy los únicos consumidores (la app Flutter y la vitrina
  `public/index.html`) son del mismo repositorio y se actualizaron en el
  mismo commit; mantener dos versiones de la API no se justifica sin un
  consumidor externo.

## Decisión

Alternativa A. El contrato `docs/contracts/openapi.yaml` es la fuente de
verdad, su versión sigue las reglas de arriba y el historial de versiones
vive en su propia descripción y en `git log` de ese archivo.

## Consecuencias

**Positivas**

- Un solo esquema de error: la prueba de contrato lo verifica en todas las
  rutas y un desvío se detecta como defecto.
- El número de versión comunica si actualizar un consumidor es obligatorio.

**Negativas / riesgos asumidos**

- Un cambio incompatible exige actualizar ambos consumidores en el mismo
  cambio; sin ellos fuera del repositorio, el costo es bajo.

## Qué revisaría esta decisión

- **Dato que la haría revisar:** que aparezca un consumidor que no se pueda
  actualizar junto con el backend (otro equipo, una app ya publicada); sería
  el momento de la alternativa C.
- **Costo de reversión aceptado:** bajo — versionar en la ruta no exige
  reescribir el dominio, solo duplicar el adaptador HTTP.

## Referencias

- [ADR-0004](0004-integracion-sincrona-vs-asincrona.md),
  [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml),
  [`docs/no-conformidades.md`](../no-conformidades.md)
