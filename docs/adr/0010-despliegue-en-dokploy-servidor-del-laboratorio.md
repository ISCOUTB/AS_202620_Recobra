# ADR-0010: Despliegue en Dokploy (servidor del laboratorio) en lugar de Render y Neon

## Estado

Aceptada — 2026-10-08. Evidencia S10 (segundo corte). **Reemplaza a
[ADR-0005](0005-plataforma-despliegue-backend.md)** (dónde corre la API) y
**reemplaza parcialmente a [ADR-0006](0006-plataforma-persistencia-postgresql.md)**
(dónde vive la base de datos): la decisión de usar PostgreSQL detrás del
puerto `PublicacionRepository` se mantiene; solo cambia el alojamiento de
la base. Los dos ADR anteriores no se reescriben: llevan una línea de estado
que apunta a este.

Escenario de calidad sobre el que se decide: **S1, rendimiento de la
búsqueda** (p95 ≤ 400 ms con hasta 200 usuarios concurrentes). El docente
indicó que el escenario del segundo corte es uno de los que el equipo ya
tenía planeados; el equipo eligió S1 por tener ya implementación (ADR-0008),
línea base y una brecha medida. Procedimiento, datos y límites en
[`docs/medicion-s10.md`](../medicion-s10.md).

## Contexto

La medición de S9 ([`docs/medicion-busqueda.md`](../medicion-busqueda.md))
dejó una brecha declarada: en Render Free, con 20 conexiones simultáneas, el
p97,5 llegó a **1.113 ms** (umbral 400 ms), y el plan además se duerme tras
15 minutos sin tráfico, con arranques en frío de 20 a 50 segundos. La
restricción de costo del proyecto es **$0/mes y sin tarjeta**
([`docs/arc42/arc42.md`](../arc42/arc42.md), sección 2).

El curso pone a disposición un servidor del laboratorio con Dokploy, que no
exige tarjeta. Se evalúa si mover el despliegue allí cierra la brecha sin
romper el presupuesto.

## Alternativas consideradas

### A. Quedarse en Render Free + Neon (descartada)

- **A favor:** ya está configurado y probado; sin trabajo de migración.
- **En contra:** la brecha medida (p97,5 = 1.113 ms a 20 conexiones) no se
  cierra sin cambiar de plan; el arranque en frío contradice una
  disponibilidad estable.

### B. Render de pago (Starter, USD 7/mes por servicio) (descartada)

- **A favor:** elimina el arranque en frío y da más CPU sin cambiar de
  plataforma.
- **En contra:** rompe la restricción de $0/mes y de "sin tarjeta"
  ([`docs/despliegue/costo-mensual.md`](../despliegue/costo-mensual.md)), y no
  hay medición que garantice que cierre la brecha de S1: habría que pagar
  para comprobarlo.

### C. Dokploy en el servidor del laboratorio, con PostgreSQL en el mismo proyecto (elegida)

La API se despliega con [`deploy/compose.lab.yaml`](../../deploy/compose.lab.yaml)
(mismo `Dockerfile` que en Render), publicada en
`https://recobra.iscoutb.dev`, y la base es un servicio PostgreSQL del mismo
proyecto de Dokploy, alcanzado por la red interna.

- **A favor:** $0/mes y sin tarjeta; el proceso no se duerme; la base queda
  junto a la API (menos latencia y una sola plataforma que operar); la
  medición real cumple S1 (abajo).
- **En contra:** el servidor es del laboratorio, no del equipo (dependencia
  externa y compartida); un redespliegue deja el dominio sin servicio unos
  30 a 50 segundos (no hay actualización sin corte); la base interna no
  ofrece TLS, así que solo es segura por estar en una red interna.

## Decisión

Se adopta la alternativa C. Cambios concretos:

- `deploy/compose.lab.yaml` es la definición del despliegue; el dominio y las
  variables (`DATABASE_URL`) se configuran en el panel de Dokploy, nunca en el
  repositorio.
- `DATABASE_SSL=false` desactiva el TLS hacia la base interna
  (`PostgresPublicacionRepository`); por omisión el TLS sigue activo para una
  base externa.
- El proceso **arranca aunque la base no responda** y expone dos
  comprobaciones distintas: `GET /health` (el proceso está vivo) y
  `GET /health/ready` (la base responde; 503 si no). Las operaciones
  responden 503 con el esquema de error único mientras la base no conteste.
- Render y Neon dejan de ser el despliegue oficial. `render.yaml` se conserva
  como referencia histórica. Neon solo tenía datos de prueba, por lo que no
  hay migración de datos.

## Consecuencias

- **Resultado medido:** con 1.000 publicaciones en PostgreSQL y 200
  conexiones concurrentes, p97,5 = **157 ms**, 0 errores, 1.337 peticiones/s
  (cliente fuera de la red del servidor). Cumple S1 con margen. En Render la
  misma operación superaba los 1.100 ms con solo 20 conexiones. Ver
  [`docs/medicion-s10.md`](../medicion-s10.md), incluidos los factores de
  confusión: el volumen de datos y el cliente no fueron idénticos entre las
  dos mediciones.
- **Costo:** $0/mes para el equipo. La alternativa B costaría USD 7/mes por
  servicio solo para la API.
- **Riesgo operativo:** disponibilidad ligada al servidor del laboratorio y
  al panel de Dokploy; sin copias de seguridad de la base configuradas
  todavía.
- **Seguridad:** el secreto de conexión vive solo en las variables de
  Dokploy; el webhook de despliegue del panel es un secreto y no se publica.

## Qué haría reconsiderar esta decisión

- Que el servidor del laboratorio deje de estar disponible o cambie su
  política de uso.
- Que la carga real supere la medida (más de 200 conexiones sostenidas) y el
  p95 del servidor se acerque a 400 ms: el siguiente paso sería medir la carga
  de ruptura, que **no** se midió.
- Que el escenario de disponibilidad exija actualizaciones sin corte o copias
  de seguridad verificadas.

**Costo de revertir:** bajo. Es el mismo `Dockerfile`; basta con apuntar de
nuevo a Render con `render.yaml` y una `DATABASE_URL` externa.
