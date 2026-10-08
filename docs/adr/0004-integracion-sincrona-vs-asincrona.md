# ADR-0004: Estrategia de integración — síncrona para el corte vertical, asíncrona entre contextos

## Estado

**Parcialmente reemplazada por [ADR-0009](0009-versionado-del-contrato-y-error-unico.md)** (Emparejamiento, contrato 2.x y esquema de error único); la decisión de integración sigue vigente. Ediciones posteriores registradas en [ADR-0011](0011-registro-de-enmiendas-a-adrs-aceptados.md).

Aceptada — 2026-09-19.
Evidencia S7 (contrato de API y prueba de contrato). Complementa
[ADR-0002](0002-arquitectura-y-stack.md) (stack) y se apoya en
[`docs/context-map.md`](../context-map.md) (contextos delimitados, S6).
Commit que implementa el contrato y la prueba de contrato:
[`docs/contracts/openapi.yaml`](../contracts/openapi.yaml) y
[`test/contract.e2e-spec.ts`](../../test/contract.e2e-spec.ts) (ver historial
de `git log` sobre esas rutas para el hash exacto de esta entrega).

**Actualización 2026-09-28:** Emparejamiento ya está implementado (ver
`src/emparejamiento/`) y el contrato REST va en la versión `2.0.0` (ver
"Historial del contrato" abajo). La decisión híbrida no cambia; solo se
actualiza lo que antes era plan y hoy es código.

## Contexto

El corte vertical implementado (`POST /publicaciones`, `GET /publicaciones/:id`)
es hoy una sola interacción: el cliente Flutter llama al backend NestJS y
espera la respuesta para continuar. Pero el mapa de contextos
([`docs/context-map.md`](../context-map.md), S6) ya declara una segunda
interacción, todavía no implementada: **Publicaciones → Emparejamiento →
Notificaciones**, disparada cuando se crea una publicación de "perdido" o
"encontrado".

Estas dos interacciones no tienen las mismas fuerzas:

- El usuario que crea una publicación necesita una confirmación inmediata
  (`201` con la publicación creada) para seguir usando la app — es el
  escenario S5 (mantenibilidad del corte vertical) y la usabilidad del flujo
  principal.
- El escenario S3 (notificar coincidencias probables) no exige que la
  notificación se envíe en el mismo instante en que se crea la publicación;
  exige que **eventualmente** se notifique si hay coincidencia. El usuario no
  está esperando esa respuesta en pantalla.
- El escenario S4/S4a (disponibilidad) ya se demostró en código
  ([`test/publicaciones-degradacion.e2e-spec.ts`](../../test/publicaciones-degradacion.e2e-spec.ts),
  corte 1): un fallo de un componente no crítico no debe tumbar la operación
  crítica. Emparejamiento/Notificaciones son, por definición del propio mapa
  de contextos, dominio de soporte y genérico — no núcleo.

## Alternativas consideradas

### A. Todo síncrono (REST de punta a punta)

`POST /publicaciones` llamaría, en la misma petición HTTP, a Emparejamiento y
este a Notificaciones, antes de responder al cliente.

- **A favor:** un solo estilo de comunicación, más simple de razonar al
  principio.
- **En contra:** acopla temporalmente tres servicios — si el proveedor de
  notificaciones está lento o caído, crear una publicación se vuelve lento o
  falla, exactamente el riesgo que la prueba de degradación de corte 1 ya
  demostró que Recobra no debe aceptar. Viola S4/S4a.

### B. Todo asíncrono (eventos de punta a punta)

Incluso `POST /publicaciones` respondería solo con un acuse de recibo, y la
confirmación real llegaría después por otro canal.

- **A favor:** desacopla completamente todos los componentes.
- **En contra:** el usuario que publica un objeto perdido necesita saber de
  inmediato que quedó publicado (usabilidad del flujo principal, S5); un ida
  y vuelta asíncrono para esa confirmación es una complejidad que el
  escenario no pide y que el equipo no tiene tiempo de construir bien en un
  semestre.

### C. Híbrido — síncrono en el corte vertical, asíncrono entre contextos (elegida)

`POST /publicaciones` y `GET /publicaciones/:id` siguen siendo síncronos
sobre REST/JSON (contrato en
[`docs/contracts/openapi.yaml`](../contracts/openapi.yaml)). La relación
Publicaciones → Emparejamiento → Notificaciones, cuando se implemente, será
asíncrona vía eventos (`PublicacionCreada`, `CoincidenciaDetectada`, ya
nombrados en `docs/context-map.md` y `docs/modulo-datos.md`).

- **A favor:** cada interacción usa el estilo que sus propias fuerzas piden,
  no un estilo único impuesto a todo el sistema. El acoplamiento temporal solo
  existe donde el usuario realmente lo necesita (confirmación de publicación);
  en todo lo demás, un componente caído no bloquea al resto.
- **En contra:** el equipo mantiene dos estilos de contrato (OpenAPI para
  REST, y a futuro AsyncAPI para eventos), lo que exige documentar ambos y no
  mezclar el vocabulario entre ellos.

## Decisión

Se adopta el estilo **híbrido (alternativa C)**:

1. El corte vertical de publicaciones (`POST /publicaciones`,
   `GET /publicaciones/:id`, `GET /health`) es **síncrono, sobre HTTP/JSON**,
   documentado en [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml)
   (OpenAPI 3.0.3, hoy en versión `2.0.0`) y verificado por
   [`test/contract.e2e-spec.ts`](../../test/contract.e2e-spec.ts) en cada
   push (`.github/workflows/ci.yml`, paso *Contract tests*).
2. La relación Publicaciones → Emparejamiento → Notificaciones es
   **asíncrona, basada en eventos**. El tramo Publicaciones → Emparejamiento
   ya está implementado: `CrearPublicacion` emite `publicacion.creada` con
   `@nestjs/event-emitter` y `PublicacionCreadaListener` lo consume con
   `async: true`, así que `POST /publicaciones` responde 201 sin esperar el
   emparejamiento. El resultado se lee por REST (`GET /coincidencias`, solo
   lectura, también en el contrato OpenAPI). Hoy el evento es **en proceso**
   (mismo contenedor), no cruza la red, por eso todavía no tiene contrato
   AsyncAPI propio: se documentará con AsyncAPI cuando pase a un broker de
   mensajería (semana 12) o cuando se implemente Notificaciones como
   sistema externo.

### Historial del contrato (versionado semántico)

| Versión | Cambio | Tipo |
|---|---|---|
| `1.0.0` | Corte vertical: `/health`, `POST /publicaciones`, `GET /publicaciones/{id}` | Inicial |
| `1.1.0` | Se agrega `GET /coincidencias` | Compatible (ruta nueva) |
| `2.0.0` | Un solo esquema `Error` (`{ statusCode, message }`) para 400/404/500; el 400 antes respondía `{ error }`. Se agrega el servidor de producción (Render) | Incompatible para quien leía `error`; los dos consumidores (Flutter y `public/index.html`) se actualizaron en el mismo commit |

## Consecuencias

**Positivas**

- El acoplamiento temporal queda limitado exactamente a la interacción que lo
  necesita (confirmación de publicación al usuario), no se extiende por
  transitividad a Notificaciones.
- La prueba de contrato (`test/contract.e2e-spec.ts`) puede fallar de forma
  determinista ante un cambio incompatible del contrato REST, sin depender de
  infraestructura de mensajería que todavía no existe. Verificado en vivo:
  el commit `8f227e3` rompió el contrato a propósito y el run de Actions
  salió en rojo ([run 35411238008](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/35411238008));
  el siguiente commit lo revirtió y el run volvió a verde.
- Es consistente con la prueba de degradación controlada ya implementada en
  corte 1: un fallo en un componente de soporte (notificación) no debe poder
  tumbar ni bloquear la operación núcleo (publicar).

**Negativas / riesgos asumidos**

- Cuando el evento salga del proceso (broker o Notificaciones externo), el
  equipo tendrá que mantener y versionar dos contratos (OpenAPI + AsyncAPI)
  en vez de uno solo.
- La eventual consistencia entre "publicación creada" y "coincidencia
  notificada" debe comunicarse claramente en la UI de Flutter, para que el
  usuario no espere una notificación instantánea.

## Qué revisaría esta decisión

- **Dato que la haría revisar:** si un escenario futuro exige que el usuario
  vea la coincidencia en la misma respuesta de `POST /publicaciones` (es
  decir, si S3 cambiara de "eventual" a "inmediato"), la alternativa C dejaría
  de ser válida para esa interacción específica.
- **Costo de reversión aceptado:** bajo para el contrato REST ya construido
  (no cambia); medio para la parte asíncrona: el evento ya existe en código, pero es
  en proceso y sin broker, así que cambiar su esquema solo toca al emisor y
  al listener dentro del mismo repositorio, sin migración de datos.

## Referencias

- [ADR-0002](0002-arquitectura-y-stack.md), [ADR-0003](0003-reto-corte1-stack-obligatorio.md)
- [`docs/context-map.md`](../context-map.md), [`docs/modulo-datos.md`](../modulo-datos.md)
- [`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md) — S3, S4/S4a, S5
- [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml)
- [`test/contract.e2e-spec.ts`](../../test/contract.e2e-spec.ts),
  [`test/publicaciones-degradacion.e2e-spec.ts`](../../test/publicaciones-degradacion.e2e-spec.ts)
