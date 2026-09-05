# ADR-0003: Reto de corte 1 — respuesta a la restricción de stack obligatorio

## Estado

Aceptada — 2026-09-05.
ADR del reto de corte 1. Complementa [ADR-0002](0002-arquitectura-y-stack.md)
(decisión de arquitectura y stack) y deja [ADR-0001](0001-estilo-arquitectonico.md)
como histórico reemplazado.

## Contexto

En la sustentación del corte vertical se confirmó que el curso fija un espacio
cerrado de tecnologías:

- Backend: **NestJS** o **FastAPI**
- Frontend: **Flutter** o **NextJS**

No se asignó una restricción de calidad adicional distinta al stack. El impacto
de esta restricción es directo sobre el backend que ya existía en
Node.js/Express (fuera del espacio permitido) y sobre el cliente, que aún no
estaba materializado en el repositorio aunque el C4 ya nombraba Flutter.

El escenario de calidad que ancla el reto es **S5 (mantenibilidad)**: el cambio
de framework debe preservarse sin reescribir el dominio ni romper las pruebas
del corte vertical. Como medida de servicio del mismo corte se registra también
la latencia de `POST /publicaciones` (operación crítica del vertical slice),
documentada en [`docs/medicion-corte1.md`](../medicion-corte1.md).

## Diagnóstico del impacto

| Capa | Impacto de la restricción |
|------|---------------------------|
| Requisitos / escenarios | S5 pasa a ser el escenario verificable del cambio; S4a sigue justificando aislar infraestructura del dominio |
| C4 | El contenedor "API backend" deja de ser Express y pasa a NestJS; el contenedor cliente se materializa como Flutter |
| Código | Hay que migrar el adaptador HTTP y el composition root a NestJS sin tocar las reglas de `Publicacion`; hay que crear el cliente Flutter que consume la API |

## Alternativas consideradas

### A. Migrar el backend a NestJS y el cliente a Flutter

- **A favor:** experiencia previa del equipo en Node.js y Flutter; Nest materializa
  puertos/adaptadores con DI; Flutter encaja con el uso en campus (cámara, push).
- **En contra:** dos lenguajes (TypeScript + Dart); hay que reaprender
  convenciones de Nest (módulos, decoradores).

### B. Migrar el backend a FastAPI y el cliente a NextJS

- **A favor:** OpenAPI automático (FastAPI); un solo lenguaje si se eligiera
  solo TypeScript en web (Next), pero FastAPI obliga a Python.
- **En contra:** el equipo no tiene experiencia fuerte en Python ni en NextJS;
  el caso de uso principal es móvil, no escritorio web.

### C. Dejar Express y documentar una excepción

- **A favor:** cero costo de migración inmediata.
- **En contra:** incumple el requisito explícito del curso; no es defendible
  en sustentación.

## Decisión

Se responde al reto adoptando **NestJS + Flutter**, manteniendo la arquitectura
hexagonal ya decidida (ADR-0001 → ADR-0002). El cambio concreto del corte es:

1. Composition root y adaptador HTTP en NestJS (`src/main.ts`,
   `src/publicaciones/`, `src/salud/`).
2. Dominio y casos de uso en TypeScript, dependientes solo del puerto
   `PublicacionRepository`.
3. Cliente Flutter en `mobile/` que crea y consulta publicaciones vía REST.
4. Pipeline CI que ejecuta `npm test` y `npm run test:e2e`.

Detalle de fuerzas y consecuencias de stack: ver ADR-0002.
Procedimiento y cifras de línea base / resultado: ver
[`docs/medicion-corte1.md`](../medicion-corte1.md).

## Consecuencias

**Positivas**

- El repositorio vuelve a estar dentro del espacio tecnológico permitido.
- El dominio del corte vertical permanece testeable sin HTTP ni base de datos.
- Queda trazabilidad navegable: aspecto A2 → S5 → C4 → ADR-0002/0003 → código →
  pruebas → medición.

**Negativas / riesgos**

- Hay que mantener dos toolchains (Node y Flutter).
- La persistencia sigue en memoria: el C4 declara PostgreSQL como contenedor
  objetivo, aún no implementado (alcance declarado, no deuda oculta).

## Referencias

- [ADR-0002](0002-arquitectura-y-stack.md)
- [docs/medicion-corte1.md](../medicion-corte1.md)
- [docs/aspectos.md](../aspectos.md) (filas A1, A2, A4)
- Escenario S5 en [escenarios_calidad.md](../escenarios_calidad.md)
