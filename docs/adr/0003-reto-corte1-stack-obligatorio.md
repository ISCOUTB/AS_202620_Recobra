# ADR-0003: Reto de corte 1 — respuesta a la restricción de stack obligatorio

## Estado

Aceptada — 2026-09-05.
ADR del reto de corte 1. Complementa [ADR-0002](0002-arquitectura-y-stack.md)
(decisión de arquitectura y stack) y deja [ADR-0001](0001-estilo-arquitectonico.md)
como histórico reemplazado.
Commit que implementa el cambio: [`3a82ca6`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/3a82ca6cfae51f6b56271e13e2844196a2527d9a).
Estado final calificado, con la medición reproducible ya incorporada:
tag [`corte-1`](https://github.com/ISCOUTB/AS_202620_Recobra/releases/tag/corte-1)
(commit [`25525ae`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/25525ae4669c2671173035e3f9e56a8e685f8436)).

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

### Síntomas, causas y supuestos

- **Síntoma:** el backend en Express y la ausencia de cliente móvil dejan al
  proyecto fuera del espacio tecnológico que el curso exige para este corte.
- **Causa raíz:** la decisión de stack de ADR-0001 (Express) se tomó en S3,
  antes de que el curso fijara la restricción de corte 1; no fue un error de
  ejecución, fue una decisión correcta en su momento que quedó obsoleta por
  una restricción externa nueva.
- **Supuesto que asumimos, explícito:** que la restricción individual
  asignada al equipo **es** el stack obligatorio del curso y no una
  restricción de calidad adicional distinta ligada al dominio de Recobra
  (p. ej. rendimiento bajo carga, disponibilidad ante fallos, seguridad de
  reclamaciones). No tenemos acceso a un documento de asignación
  individual por equipo distinto del enunciado general del curso; si ese
  documento existe y asigna algo distinto, este ADR y su diagnóstico no
  responden a la restricción correcta y debe rehacerse.
- **Priorización del riesgo:** de los dos frentes de impacto (backend fuera
  de stack vs. cliente ausente), priorizamos el backend primero porque el
  corte vertical ya depende de él en producción de evidencia (S4/S4a); el
  cliente Flutter era un riesgo de alcance (no existía código), no de
  regresión (no hay cliente previo que romper).

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

### Degradación controlada bajo una condición adversa del reto

El reto migró el composition root a NestJS conservando el dominio detrás del
puerto `PublicacionRepository` (ADR-0002). Para que esa conservación de
límites no sea solo una afirmación, `test/publicaciones-degradacion.e2e-spec.ts`
simula la condición adversa más directamente ligada a este cambio — el
adaptador de persistencia falla (hoy en memoria, mañana PostgreSQL) — y
verifica que:

1. `POST /publicaciones` responde `500` controlado (sin stack trace ni
   mensaje interno en el cuerpo de la respuesta).
2. `GET /health` sigue respondiendo `200` inmediatamente después: el proceso
   NestJS no se cae, el resto del servicio sigue disponible.

Esto es evidencia ejecutable de que el puerto/adaptador introducido en el
reto aísla el fallo de infraestructura del resto del sistema (S4a), no solo
lo declara.

### Qué revisaría esta decisión

- **Dato que la haría revisar:** si el equipo confirma con el docente que la
  restricción individual asignada era otra distinta al stack (ver supuesto
  explícito arriba), o si un corte posterior exige un tercer framework fuera
  de NestJS/FastAPI/Flutter/NextJS.
- **Costo de reversión aceptado:** medio. Revertir el adaptador HTTP a
  Express sería mecánico (el dominio y los casos de uso no cambian, ver
  consecuencias positivas), pero se perdería el cliente Flutter ya construido
  sobre la API NestJS y habría que rehacer el pipeline de CI. Se acepta ese
  costo porque el dominio — la parte cara de rehacer — queda protegido por el
  puerto en cualquiera de los dos escenarios.

## Referencias

- [ADR-0002](0002-arquitectura-y-stack.md)
- [docs/medicion-corte1.md](../medicion-corte1.md)
- [docs/aspectos.md](../aspectos.md) (filas A1, A2, A4)
- Escenario S5 en [escenarios_calidad.md](../escenarios_calidad.md)
