# ADR-0005: Plataforma de despliegue del backend (API NestJS)

## Estado

**Reemplazada por [ADR-0010](0010-despliegue-en-dokploy-servidor-del-laboratorio.md)** (2026-10-08): el despliegue oficial pasó a Dokploy. Ediciones posteriores registradas en [ADR-0011](0011-registro-de-enmiendas-a-adrs-aceptados.md).

Aceptada — 2026-09-26. Evidencia S8. Una sola pieza decidida aquí: dónde
corre el contenedor de la API. El cliente Flutter no se despliega como
servicio (corre en el dispositivo/emulador del usuario) y la persistencia
sigue co-ubicada en memoria dentro del mismo proceso (ver
[docs/modulo-datos.md](../modulo-datos.md)), así que no son piezas aparte
todavía — cuando lo sean, cada una tendrá su propio ADR, no se amplía este.

## Contexto

El backend NestJS (`src/`) necesita correr en un entorno accesible desde
fuera de la red de la universidad, con URL pública, health check y logs
observables. Restricción real del equipo: **sin tarjeta de crédito/débito
disponible** para verificación de cuenta (ver sección 2 de
[`docs/arc42/arc42.md`](../arc42/arc42.md)). Restricción de calidad: el
escenario S5 fija un objetivo de p95 de 100 ms para `POST /publicaciones`
([docs/medicion-corte1.md](../medicion-corte1.md)); cualquier plataforma que
introduzca arranques en frío grandes en cada petición pone en riesgo ese
objetivo.

El curso ofrece "el servidor del laboratorio" como opción que siempre
cumple sin tarjeta; el equipo no tiene acceso confirmado a él en el momento
de esta decisión (ver `docs/no-conformidades.md`), así que se evalúa junto a
las alternativas externas.

## Alternativas consideradas

### A. Render.com — servicio web gestionado sobre contenedor Docker (elegida)

- **A favor:** no pide tarjeta para el plan Free verificado en esta entrega;
  corre el `Dockerfile` del repo tal cual (sin reescribir el empaquetado);
  mantiene el proceso vivo mientras hay tráfico, así que el estado en
  memoria de `MemoriaPublicacionRepository` sobrevive entre peticiones
  seguidas (no entre redeploys); expone health check configurable
  (`/health`, ya implementado) y logs de stdout sin configuración adicional.
- **En contra:** el plan Free "duerme" el servicio tras ~15 min sin
  tráfico; la primera petición después de dormir tarda más (arranque en
  frío del contenedor, no de una función) — mitigado documentando la hora
  de la comprobación en la evidencia, como pide la propia ficha de S8.
- **Capa gratuita verificada:** 750 horas/mes de cómputo Free, suficiente
  para un solo servicio corriendo de forma intermitente; el punto de ruptura
  está en `docs/despliegue/costo-mensual.md`.

### B. Fly.io — contenedor gestionado con arranque en caliente

- **A favor:** no "duerme" igual de agresivo, mejor p95 sostenido.
- **En contra:** exige tarjeta de crédito para crear la cuenta, incluso para
  el nivel gratuito — incumple la restricción "sin tarjeta" del equipo.
  Descartada por esta única razón, no por capacidad técnica.

### C. Función serverless (p. ej. Vercel Functions / AWS Lambda con adaptador Nest)

- **A favor:** no paga por tiempo inactivo; escala a cero de verdad.
- **En contra:** dos problemas de fondo para esta pieza concreta: (1) el
  adaptador de persistencia actual guarda el estado **en memoria del
  proceso** — una función serverless no garantiza el mismo proceso entre
  invocaciones, así que los datos se perderían de forma impredecible, algo
  peor que "dormir" (Render conserva el estado mientras el proceso sigue
  vivo); (2) el arranque en frío típico de un runtime Node en una función
  (cientos de ms a più de 1 s en la primera invocación) es comparable o peor
  al arranque en frío de un contenedor dormido, sin la ventaja de mantener
  estado entre peticiones cercanas. Se descarta para esta pieza; sí sería
  candidata razonable para una pieza sin estado (p. ej. un job programado
  futuro de emparejamiento).

## Decisión

Se despliega la API NestJS en **Render.com**, como contenedor Docker
(`Dockerfile` + `render.yaml` en la raíz del repo), plan Free, con
`healthCheckPath: /health`.

## Consecuencias

**Positivas**

- Cumple la restricción "sin tarjeta" sin excepciones.
- Reutiliza el mismo `Dockerfile` que valida el paso "Docker build" del CI
  (`.github/workflows/ci.yml`), así que lo que se prueba en el pipeline es
  exactamente lo que se despliega — no hay un segundo empaquetado distinto
  "solo para producción".
- El health check y los logs estructurados (`src/observabilidad/`) quedan
  disponibles sin configuración adicional del proveedor.

**Negativas / riesgos asumidos**

- El "sueño" tras inactividad significa que una comprobación externa puede
  encontrar el servicio respondiendo lento (arranque en frío) en vez de
  caído; se documenta la hora de cada comprobación para que esa diferencia
  sea interpretable, tal como exige la ficha de S8.
- Si el proyecto necesita disponibilidad constante más adelante (fuera del
  alcance de este corte), el plan Free deja de alcanzar y hay que migrar a
  un plan pago o replantear esta decisión (ver "qué la haría revisar" abajo).

## Qué revisaría esta decisión

- **Dato que la haría revisar:** si el escenario de disponibilidad exige que
  el servicio nunca "duerma" (SLA de disponibilidad continua), o si el
  tráfico supera las 750 horas/mes de cómputo Free.
- **Costo de reversión aceptado:** bajo — migrar de Render a otro proveedor
  de contenedores implica solo cambiar `render.yaml` por el manifiesto
  equivalente del nuevo proveedor; el `Dockerfile` y el código no cambian.

## Referencias

- [`Dockerfile`](../../Dockerfile), [`render.yaml`](../../render.yaml)
- [`docs/despliegue/costo-mensual.md`](../despliegue/costo-mensual.md)
- [`docs/arc42/arc42.md`](../arc42/arc42.md) — secciones 2 y 7
- Escenario S5 en [`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md)
