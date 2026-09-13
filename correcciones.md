# Correcciones — trazabilidad de hallazgos S1-S5

Este archivo enlaza cada hallazgo señalado en la retroalimentación del docente
(semanas 1 a 5) con la evidencia concreta de su corrección en este
repositorio. Es el documento que exigía explícitamente la ficha del corte 1 y
que no existía en la raíz al momento de calificar `f7c1a6c`.

Fuente de los hallazgos: retroalimentación publicada en
`AS_202620_feedback/revisiones/2026-2/AS_202620_Recobra/`.

## Semana 1 — Evidencia S1

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Faltaban las dos tensiones de calidad | Documentadas explícitamente en la ficha del problema | [`docs/ficha_problema.md`](docs/ficha_problema.md#tensiones-de-calidad) |
| `docs/aspectos.md` era texto narrativo, sin tabla de ocho columnas | Reemplazado por tabla de 8 columnas (aspecto → requisito → C4 → ADR → código → pruebas → evidencia) | [`docs/aspectos.md`](docs/aspectos.md) |
| Sin plantilla arc42 ni carpetas `docs/adr/` / `docs/c4/` | Carpetas creadas y documentación arc42 completa, ahora consolidada en `docs/arc42/` | [`docs/arc42/arc42.md`](docs/arc42/arc42.md), [`docs/adr/`](docs/adr/), [`docs/c4/`](docs/c4/) |
| `docs/ia` vacío y sin extensión `.md` | Borrado el archivo vacío; registro real de uso de IA por integrante y por semana | [`docs/ia.md`](docs/ia.md) |

## Semana 2 — Evidencia S2

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| 7 escenarios (más sub-escenarios) cuando la ficha pide 3-5 | Se mantienen documentados y priorizados por impacto/riesgo en el árbol de utilidad; S5 y S4/S4a se marcan como ancla del corte 1 | [`docs/calidad/arbol_utilidad.md`](docs/calidad/arbol_utilidad.md), [`docs/calidad/escenarios_calidad.md`](docs/calidad/escenarios_calidad.md) |
| Escenario S2 de seguridad sin medida numérica | Medida agregada: "0 % de reclamaciones llega a *reclamado* sin verificación; 100 % quedan registradas con usuario, fecha y hora" | [`docs/calidad/escenarios_calidad.md`](docs/calidad/escenarios_calidad.md#escenario-s2--seguridad-en-una-reclamación) |
| `docs/C4.md` era solo texto, no diagrama | Reemplazado por diagramas Mermaid por nivel, con leyenda y flechas etiquetadas | [`docs/c4/C4-C1.md`](docs/c4/C4-C1.md), [`docs/c4/C4-C2.md`](docs/c4/C4-C2.md) |
| `docs/aspectos.md` sin tabla de 8 columnas ni enlaces a escenarios | Ver hallazgo equivalente de S1, ya resuelto | [`docs/aspectos.md`](docs/aspectos.md) |
| `docs/ia.md` sin llenar | Ver hallazgo equivalente de S1, ya resuelto | [`docs/ia.md`](docs/ia.md) |
| Documentación sin organizar en `docs/arc42/`, `docs/adr/`, `docs/c4/` | Estructura de carpetas creada y consolidada | [`docs/arc42/`](docs/arc42/), [`docs/adr/`](docs/adr/), [`docs/c4/`](docs/c4/) |
| Dos integrantes no aparecían en el historial | Identidades consolidadas con `.mailmap`; Fernando Isacc Conde Herrera y Verónica Ubarne (`vylrir`) ya aparecen en `git shortlog` | [`.mailmap`](.mailmap), commit [`6ee5b66`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/6ee5b66) |

## Semana 3

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Sección 4 sin tácticas concretas ligadas a S1-S7 | Sección 4 desarrollada con matriz comparativa ponderada, decisión y principios de diseño derivados | [`docs/arc42/arc42.md`](docs/arc42/arc42.md#4-estrategia-de-solución) |
| Matriz comparativa de §4.2 no evaluaba contra el árbol de utilidad; `docs/matriz_arquitectura.md` obsoleto y contradecía el ADR | Matriz reconstruida con criterios pesados según los atributos de calidad de S2; el documento obsoleto ya no existe en el repositorio | [`docs/arc42/arc42.md`](docs/arc42/arc42.md#42-matriz-comparativa-de-estilos-arquitectónicos) |
| ADR no enlazado desde `docs/aspectos.md` ni desde el escenario que lo motiva | Aspectos A1, A2 y A4 enlazan directamente a ADR-0002/0003; sección 9 de arc42 indexa los tres ADR | [`docs/aspectos.md`](docs/aspectos.md), [`docs/arc42/arc42.md`](docs/arc42/arc42.md#9-decisiones-de-arquitectura) |
| Faltaban los paquetes `domain/ports` y `application/use-cases` (solo existía el adaptador HTTP) | Paquetes materializados con entidad, puerto, casos de uso y adaptador de persistencia | [`src/domain/`](src/domain/), [`src/application/`](src/application/), [`src/infrastructure/`](src/infrastructure/) |
| Higiene del repo: `node_modules/` versionado; ADR anterior sin marcar como reemplazado | `node_modules/` fuera del índice y en `.gitignore`; ADR-0001 marcado explícitamente "Reemplazada por ADR-0002" | [`.gitignore`](.gitignore), [`docs/adr/0001-estilo-arquitectonico.md`](docs/adr/0001-estilo-arquitectonico.md) |

## Semana 4 · S4

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Completar sección 9 de arc42 enlazando los ADR | Sección 9 añadida con tabla de los tres ADR y su estado | [`docs/arc42/arc42.md`](docs/arc42/arc42.md#9-decisiones-de-arquitectura) |
| C4 nivel 2 debía coincidir con el código real | C4 nivel 2 actualizado a los contenedores reales (API NestJS, cliente Flutter, persistencia en memoria) | [`docs/c4/C4-C2.md`](docs/c4/C4-C2.md) |
| `docs/aspectos.md` debía llegar a las 8 columnas con enlaces verificables | Tabla de 8 columnas con filas A1-A4 navegables | [`docs/aspectos.md`](docs/aspectos.md) |
| Evidencia pública de que las pruebas corren en CI | Workflow `.github/workflows/ci.yml` con jobs de backend y Flutter; runs en verde antes y después del cierre de S5 (`6ee5b66`, `f7c1a6c`) | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Evitar versionar `node_modules` | `node_modules/` retirado del índice (`git rm -r --cached`) y cubierto por `.gitignore` | [`.gitignore`](.gitignore) |
| `docs/arc42.md` suelto convivía con `docs/arc42/04-estrategia-solucion.md`, y luego arc42 quedó fragmentado en varios archivos por sección | Unificado por completo en un solo archivo, `docs/arc42/arc42.md`, con el mismo nombre que usan otros equipos del curso | [`docs/arc42/arc42.md`](docs/arc42/arc42.md) |

## Semana 5 · CORTE1

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Falta `correcciones.md` en la raíz | Este mismo archivo | [`correcciones.md`](correcciones.md) |
| PDF de Moodle con cifra de latencia "8-15 ms" desactualizada, sin corrida registrada | `docs/medicion-corte1.md` ya reemplazó la estimación por la medición reproducible (p95 = 0.54-1.00 ms); `scripts/generar-pdf-corte1.py` corregido con la misma cifra — pendiente regenerar el binario (ver [`docs/no-conformidades.md`](docs/no-conformidades.md)) | [`docs/medicion-corte1.md`](docs/medicion-corte1.md), [`scripts/generar-pdf-corte1.py`](scripts/generar-pdf-corte1.py) |
| CI sin análisis estático de SonarCloud pese a tener `sonar-project.properties` | Job de SonarCloud agregado al workflow de backend (condicionado a que exista el secreto `SONAR_TOKEN`) | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Token de Coveralls expuesto en el historial (`905f546:node_modules/debug/.coveralls.yml`), sin confirmar rotación | **Pendiente** — requiere una acción del equipo en la cuenta de Coveralls, fuera del alcance de una corrección local de código. Ver plan detallado en [`docs/no-conformidades.md`](docs/no-conformidades.md#1-token-de-coveralls-expuesto-en-el-historial-de-git) | — |
| Etiqueta `corte-1` fijada casi 10 horas después del cierre | **No corregible retroactivamente** sin reescribir historial (riesgo mayor al problema). Plan de proceso para futuros cortes en [`docs/no-conformidades.md`](docs/no-conformidades.md#6-disciplina-de-etiquetado-git) | — |
| Un integrante (Fernando Isacc Conde Herrera) con una sola contribución en el semestre | **Pendiente de reparto de trabajo real**, no es una no conformidad de código. Plan en [`docs/no-conformidades.md`](docs/no-conformidades.md#7-participación-desigual-del-equipo) | — |

## Reorganización de archivos (posterior al corte 1)

| Cambio | Corrección | Evidencia |
|---|---|---|
| Nombres y estructura de `docs/` no seguían la misma convención que otros proyectos del curso | Reorganizado para usar los mismos nombres: `docs/ficha_problema.md`, `docs/arc42/arc42.md`, `docs/c4/C4-C1.md`/`C4-C2.md`/`C4-C3.md`, `docs/calidad/` (agrupa `escenarios_calidad.md`, `arbol_utilidad.md`, `restricciones_justificadas.md`) | [`docs/ficha_problema.md`](docs/ficha_problema.md), [`docs/arc42/arc42.md`](docs/arc42/arc42.md), [`docs/c4/`](docs/c4/), [`docs/calidad/`](docs/calidad/) |

## Pendientes que siguen abiertos

Ver el detalle y el plan de corrección de cada uno en
[`docs/no-conformidades.md`](docs/no-conformidades.md).
