# ADR-0016: Recobra semiindependiente de la app UTB, con la integración como objetivo potencial

## Estado

Aceptada — 2026-10-17. Fija el posicionamiento del producto frente a la app
institucional de la UTB. No modifica ningún ADR anterior; se apoya en ADR-0013
(cuentas propias), ADR-0015 (avisos dentro de la app) y `docs/diseno-ui.md`.

## Contexto

El lugar natural de Recobra es **dentro de la app de la UTB**: los estudiantes
ya la usan todos los días, ya tienen la sesión iniciada con su cuenta
institucional y ya reciben ahí sus avisos. Pero integrarse exige cosas que el
equipo no controla: acceso al directorio institucional (inicio de sesión
único), un canal de notificaciones de la universidad, un acuerdo de manejo de
datos personales y que el equipo de la app UTB acepte un módulo de terceros.

## Alternativas consideradas

### A. Integrarse ya como módulo de la app UTB (descartada por ahora)

- **A favor:** cero fricción para el usuario: sin otra app ni otra cuenta.
- **En contra:** depende de terceros (TI de la UTB) en todos los pasos; no se
  puede entregar ni probar dentro del curso.

### B. Producto totalmente independiente, con identidad propia (descartada)

- **A favor:** libertad total.
- **En contra:** otra app, otra cuenta y otro estilo que aprender; aleja el
  objetivo de integrarse.

### C. Semiindependiente, preparado para integrarse (elegida)

Recobra es un producto propio (API, app y vitrina) que **se parece y se
comporta** como una sección de la app UTB, y deja cada punto de integración
detrás de un puerto o un contrato que se pueda cambiar sin reescribir el
dominio.

## Decisión

Se adopta **C**. Hoy:

| Punto de integración | Cómo funciona hoy (semiindependiente) | Cómo sería integrado (objetivo potencial) |
|---|---|---|
| Identidad | Cuentas propias con correo `@utb.edu.co` y sesiones opacas (ADR-0013), detrás de los puertos `CuentaRepository`, `SesionRepository` y `ResolverSesion` | Inicio de sesión único con el directorio de la UTB (OpenID Connect): un adaptador nuevo detrás de los mismos puertos; Recobra deja de guardar contraseñas |
| Avisos | Bandeja dentro de Recobra, consultada cada 20 s (ADR-0015) | Además, push por el canal de notificaciones de la app UTB: un segundo canal detrás de un puerto de salida, alimentado por los mismos eventos |
| Interfaz | App Flutter y vitrina con el lenguaje visual de la app UTB (sin su logo ni marcas) | Un módulo o una vista web dentro de la app UTB, que consume la misma API |
| Entrada | Enlace propio (`recobra.iscoutb.dev`) | Acceso desde el menú de la app UTB y enlaces profundos desde un aviso |
| Datos | Recobra es dueño de publicaciones, reclamaciones y avisos | Sigue siéndolo; la UTB solo aportaría identidad y canal. Hace falta un acuerdo de tratamiento de datos (Ley 1581 de 2012) |
| Lugares | Catálogo propio de lugares y pisos (`GET /lugares`) | El catálogo oficial de edificios y salones de la UTB, si existe uno |

Reglas para no cerrar la puerta:

1. Ningún caso de uso conoce cómo se autentica la persona: solo recibe el id
   de la cuenta (ya es así).
2. Los avisos nacen de eventos del dominio, no de un canal concreto (ya es así).
3. La API se versiona con contrato OpenAPI (ADR-0009), para que otro cliente,
   como un módulo de la app UTB, la pueda consumir sin cambios.
4. El estilo visual sigue a la app UTB pero sin usar su logo ni marcas.

## Consecuencias

- Recobra se puede usar, probar y evaluar sin depender de la UTB.
- El usuario todavía necesita otra cuenta y otra app: es la fricción que la
  integración eliminaría.
- El camino queda escrito en pasos que se pueden dar por separado:
  1. **Semiindependiente** (hoy).
  2. **Inicio de sesión con la cuenta UTB** (adaptador OIDC).
  3. **Entrada desde la app UTB** (enlace o vista web dentro de la app).
  4. **Módulo integrado** con avisos por el canal de la UTB.

## Qué haría revisar esta decisión

- Que TI de la UTB ofrezca inicio de sesión único o un canal de avisos: se
  pasa al paso 2 o 4 sin cambiar el dominio.
- Que la UTB ya tenga una solución de objetos perdidos: Recobra tendría que
  integrarse con ella en vez de competir.
