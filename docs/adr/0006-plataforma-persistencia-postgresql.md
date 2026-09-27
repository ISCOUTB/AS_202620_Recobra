# ADR-0006: Plataforma de persistencia (PostgreSQL gestionado)

## Estado

Aceptada — 2026-09-27. Pieza decidida aquí: dónde vive la base de datos
PostgreSQL que reemplaza al adaptador en memoria (objetivo ya declarado
desde ADR-0002 y `docs/modulo-datos.md`). No cubre el hosting del backend
(ver [ADR-0005](0005-plataforma-despliegue-backend.md), pieza distinta).

## Contexto

`MemoriaPublicacionRepository` pierde todos los datos en cada redeploy —
aceptable para desarrollo, no para un sistema que alguien va a usar de
verdad. El puerto `PublicacionRepository` (ADR-0002) ya está diseñado para
que cambiar el adaptador no toque `domain/` ni `application/`; esta es la
primera vez que se ejercita esa promesa con un adaptador real
(`PostgresPublicacionRepository`, `src/infrastructure/persistence/`).

Misma restricción que ADR-0005: **sin tarjeta de crédito/débito
disponible**.

## Alternativas consideradas

### A. Neon (PostgreSQL serverless gestionado) — elegida

- **A favor:** no pide tarjeta para el plan Free; PostgreSQL real (no un
  motor compatible), así que `pg` (node-postgres) se conecta sin driver
  especial; capa gratuita generosa para el volumen de este proyecto (ver
  costo abajo).
- **En contra:** el cómputo de Neon también puede "suspender" la base tras
  inactividad (similar al backend en Render) — la primera consulta tras
  suspensión tarda más; aceptable por la misma razón que en ADR-0005 (el
  sistema ya tolera arranques en frío del backend).
- **Capa gratuita verificada:** 0.5 GB de almacenamiento, cómputo
  compartido — muy por encima del volumen de Recobra hoy (unas pocas
  publicaciones de prueba).

### B. Render PostgreSQL (mismo proveedor que el backend)

- **A favor:** un solo panel para backend y base de datos.
- **En contra:** el plan gratuito de Render para PostgreSQL se elimina a
  los 30 días si no se actualiza a un plan pago — no es una capa gratuita
  permanente, es una prueba con fecha de expiración. Descartada porque
  perder la base de datos automáticamente a los 30 días no es aceptable
  para una evidencia que se sustenta durante todo el semestre.

### C. PostgreSQL en un contenedor propio (Docker, autoalojado)

- **A favor:** control total, sin límites de proveedor externo.
- **En contra:** exige un host donde correr ese contenedor con disco
  persistente — vuelve a la pregunta que este ADR responde (dónde vive
  la base de datos), sin resolverla; el plan Free de Render no ofrece
  disco persistente para un segundo servicio. Descartada por no resolver
  el problema, solo trasladarlo.

## Decisión

Se usa **Neon** (plan Free) como base de datos PostgreSQL. La cadena de
conexión se guarda como variable de entorno `DATABASE_URL` en el panel de
Render (`sync: false` en `render.yaml` — la clave está versionada, el valor
no, ver `docs/despliegue/costo-mensual.md`), nunca en el código ni en el
repositorio.

`PostgresPublicacionRepository` se activa automáticamente cuando
`DATABASE_URL` está definida; si no lo está (pruebas, desarrollo local sin
base de datos), el composition root (`publicaciones.module.ts`) sigue
usando `MemoriaPublicacionRepository` sin que nadie tenga que cambiar
código para correr las pruebas.

## Consecuencias

**Positivas**

- Los datos sobreviven a un redeploy del backend (antes se perdían
  siempre).
- Cero cambios en `domain/` o `application/` — se ejerce la promesa de
  ADR-0002 con un caso real, no solo teórico.
- Las pruebas (`npm test`, `npm run test:e2e`) no requieren una base de
  datos real: siguen corriendo contra memoria, rápidas y deterministas.

**Negativas / riesgos asumidos**

- Dos proveedores gratuitos distintos (Render + Neon) que administrar en
  vez de uno solo.
- Si Neon cambia su política de capa gratuita, hay que revisar esta
  decisión (ver abajo).

## Qué revisaría esta decisión

- **Dato que la haría revisar:** si Neon reduce su capa gratuita por debajo
  del volumen real de uso, o si el proyecto necesita un dato transaccional
  que el modelo actual (una tabla simple) no cubre.
- **Costo de reversión aceptado:** bajo — el puerto `PublicacionRepository`
  ya aísla el adaptador; migrar de Neon a otro Postgres gestionado es
  cambiar `DATABASE_URL`, no código.

## Verificación

Confirmado en producción el 2026-09-27: se creó la publicación
`25b663ef-d129-459c-a49c-8ceedcd810b5` contra
`https://recobra-backend.onrender.com`, se reinició el servicio en Render
(Manual Deploy → Deploy latest commit, mismo mecanismo que un redeploy
normal) y la publicación siguió existiendo después del reinicio — prueba
de que los datos ya no dependen del proceso en memoria.

## Referencias

- [ADR-0002](0002-arquitectura-y-stack.md), [ADR-0005](0005-plataforma-despliegue-backend.md)
- [`src/infrastructure/persistence/postgres-publicacion.repository.ts`](../../src/infrastructure/persistence/postgres-publicacion.repository.ts)
- [`docs/modulo-datos.md`](../modulo-datos.md)
- [`docs/despliegue/costo-mensual.md`](../despliegue/costo-mensual.md)
