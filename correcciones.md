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
| Token de Coveralls expuesto en el historial (`905f546:node_modules/debug/.coveralls.yml`), sin confirmar rotación | **Resuelta** — investigado a fondo: es un artefacto público del paquete npm `debug@2.6.9` (config de CI de sus propios mantenedores incluida por error en el paquete publicado), no una cuenta de Coveralls de Recobra. No hay token propio que rotar; la causa raíz (versionar `node_modules/`) ya estaba corregida. Detalle en [`docs/no-conformidades.md`](docs/no-conformidades.md#1-token-de-coveralls-expuesto-en-el-historial-de-git) | — |
| Etiqueta `corte-1` fijada casi 10 horas después del cierre | **No corregible retroactivamente** sin reescribir historial (riesgo mayor al problema). Plan de proceso para futuros cortes en [`docs/no-conformidades.md`](docs/no-conformidades.md#6-disciplina-de-etiquetado-git) | — |
| Un integrante (Fernando Isacc Conde Herrera) con una sola contribución en el semestre | **Pendiente de reparto de trabajo real**, no es una no conformidad de código. Plan en [`docs/no-conformidades.md`](docs/no-conformidades.md#7-participación-desigual-del-equipo) | — |

## Semana 6 · S6

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Diff contra hash de corte 1, C4 nivel 3 y ADR si cambiaron los límites | Aclarado explícitamente que los límites **no cambiaron**: el mapa de contextos documenta diseño objetivo, no una migración ya hecha | [`docs/context-map.md`](docs/context-map.md#diferencia-con-los-límites-del-corte-1) |
| arc42 sección 8 (lenguaje ubicuo y mapa de contextos) | **Pendiente** — asignado como tarea individual de esta semana | Ver reparto de tareas de la semana en `docs/ia.md` |
| Auditoría de no conformidades de propiedad de datos (recorrido de escrituras) | **Pendiente** — asignado como tarea individual de esta semana | Ver reparto de tareas de la semana en `docs/ia.md` |
| SonarCloud con run exitoso y URL pública del Quality Gate | **Resuelta** — corre como GitHub App (no como paso de `ci.yml`); Quality Gate `OK` verificado por la API pública el 2026-09-19 | [`https://sonarcloud.io/dashboard?id=ISCOUTB_AS_202620_Recobra&branch=master`](https://sonarcloud.io/dashboard?id=ISCOUTB_AS_202620_Recobra&branch=master), detalle en [`docs/no-conformidades.md`](docs/no-conformidades.md#4-ci-sin-análisis-estático-de-sonarcloud) |
| Token de Coveralls expuesto, sin confirmar rotación | **Resuelta** — no es un token de Recobra, ver hallazgo completo | [`docs/no-conformidades.md`](docs/no-conformidades.md#1-token-de-coveralls-expuesto-en-el-historial-de-git) |

## Semana 7 · S7

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Sin contrato de API en formato ejecutable versionado | Contrato OpenAPI 3.0.3 (versión `1.0.0`) con rutas y esquemas de datos | [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml) |
| Sin prueba de contrato ni invocación en el pipeline | Prueba con `jest-openapi` (`test/contract.e2e-spec.ts`), paso «Contract tests» en el workflow | [`test/contract.e2e-spec.ts`](test/contract.e2e-spec.ts), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Sin evidencia de que la prueba falle ante un cambio incompatible | Se forzó un campo requerido (`matchScore`) que la API no devuelve y se registró la salida real de la prueba fallando, luego revertido | [`docs/contracts/evidencia-fallo-2026-09-19.txt`](docs/contracts/evidencia-fallo-2026-09-19.txt) |
| Sin ADR de estrategia de integración síncrona/asíncrona | ADR-0004: REST síncrono para el corte vertical, eventos asíncronos para Publicaciones→Emparejamiento→Notificaciones, contra S3/S4a/S5 | [`docs/adr/0004-integracion-sincrona-vs-asincrona.md`](docs/adr/0004-integracion-sincrona-vs-asincrona.md) |
| C4 nivel 2 sin protocolo/formato en cada flecha | **Resuelta** — las 5 flechas etiquetadas con protocolo y formato | [`docs/c4/C4-C2.md`](docs/c4/C4-C2.md) |
| arc42 secciones 6 (flujos de interacción), 7, 11 y 12 incompletas | **Resuelta** — las 4 secciones agregadas por el equipo | [`docs/arc42/arc42.md`](docs/arc42/arc42.md) |

## Semana 8 · S8

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Sin despliegue en la nube; arc42 sección 7 describía solo ejecución local | Contenedor Docker + Render Blueprint; sección 7 reescrita con una caja por pieza | [`Dockerfile`](Dockerfile), [`render.yaml`](render.yaml), [`docs/arc42/arc42.md`](docs/arc42/arc42.md#7-vista-de-despliegue) |
| Sin infraestructura como código versionada | `Dockerfile` + `render.yaml`, validados por el paso «Docker build» del CI | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Sin logs estructurados | Logger JSON por línea (`timestamp`, `level`, `context`, `message`) | [`src/observabilidad/json-logger.service.ts`](src/observabilidad/json-logger.service.ts) |
| Sin métrica consultable ligada a un escenario | `GET /metrics`: p50/p95 de `POST /publicaciones`, ligada a S5 | [`src/observabilidad/metricas.service.ts`](src/observabilidad/metricas.service.ts) |
| Sección 2 de arc42 sin límite de costo ni condición de tarjeta | Restricciones de despliegue agregadas (sin tarjeta, $0/mes) | [`docs/arc42/arc42.md`](docs/arc42/arc42.md#2-restricciones) |
| Sin ADR de plataforma de despliegue | ADR-0005: Render vs Fly.io (descartada por tarjeta) vs función serverless (descartada por estado en memoria y arranque en frío) | [`docs/adr/0005-plataforma-despliegue-backend.md`](docs/adr/0005-plataforma-despliegue-backend.md) |
| Sin estimación de costo mensual | Estimación desde el volumen del escenario S1 (200 usuarios concurrentes), con punto de ruptura de la capa gratuita | [`docs/despliegue/costo-mensual.md`](docs/despliegue/costo-mensual.md) |
| URL pública del sistema desplegado | **Resuelta** — https://recobra-backend.onrender.com, desplegado 2026-09-26, verificado desde fuera de la red universitaria (200 en `/`, `/health`, `/metrics`; `POST /publicaciones` probado de extremo a extremo con `201`) | [`docs/arc42/arc42.md`](docs/arc42/arc42.md#7-vista-de-despliegue) |

## Reorganización de archivos (posterior al corte 1)

| Cambio | Corrección | Evidencia |
|---|---|---|
| Nombres y estructura de `docs/` no seguían la misma convención que otros proyectos del curso | Reorganizado para usar los mismos nombres: `docs/ficha_problema.md`, `docs/arc42/arc42.md`, `docs/c4/C4-C1.md`/`C4-C2.md`/`C4-C3.md`, `docs/calidad/` (agrupa `escenarios_calidad.md`, `arbol_utilidad.md`, `restricciones_justificadas.md`) | [`docs/ficha_problema.md`](docs/ficha_problema.md), [`docs/arc42/arc42.md`](docs/arc42/arc42.md), [`docs/c4/`](docs/c4/), [`docs/calidad/`](docs/calidad/) |

## Avance posterior a S8 (2026-09-27)

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Emparejamiento solo existía como diseño (`docs/context-map.md`), sin código | Implementado: entidad `Coincidencia`, puerto, caso de uso `BuscarCoincidencias`, evento en proceso (ADR-0004), endpoint `GET /coincidencias`, verificado en producción con una coincidencia real detectada sola | [`src/emparejamiento/`](src/emparejamiento/), [`docs/aspectos.md`](docs/aspectos.md) (fila A5) |
| Persistencia solo en memoria, se perdía en cada redeploy | `PostgresPublicacionRepository` (Neon, sin tarjeta, ADR-0006) activo en producción; verificado que los datos sobreviven a un reinicio real del servicio | [`docs/adr/0006-plataforma-persistencia-postgresql.md`](docs/adr/0006-plataforma-persistencia-postgresql.md#verificación) |
| Interfaz mínima, sin mostrar el emparejamiento, sin adaptar a navegador | Sección "Coincidencias" visible en la app; layout centrado con ancho máximo para navegador de escritorio; chips de color por tipo | [`mobile/lib/main.dart`](mobile/lib/main.dart) |

## Semana 9 · S9 (2026-10-04)

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Ninguna porción generada con IA construida dentro de la semana (Emparejamiento y PostgreSQL son anteriores a S8) | Búsqueda con filtros del escenario S1 (`GET /publicaciones`), construida en S9 de punta a punta: aspecto A6 → ADR-0008 → código → pruebas → medición | [`docs/aspectos.md`](docs/aspectos.md), [`docs/auditoria-generacion-ia.md`](docs/auditoria-generacion-ia.md), [`docs/medicion-busqueda.md`](docs/medicion-busqueda.md) |
| Dependencia nueva sin verificar | `autocannon` verificada en npm (repositorio, mantenedor, descargas) antes de instalarla | [`docs/auditoria-generacion-ia.md`](docs/auditoria-generacion-ia.md#7-dependencias-propuestas-en-el-período) |
| ADR-0004 editado después de aceptarse | ADR-0009 sucesor registra los cambios posteriores; ADR-0004 no se vuelve a modificar | [`docs/adr/0009-versionado-del-contrato-y-error-unico.md`](docs/adr/0009-versionado-del-contrato-y-error-unico.md) |
| Prueba e2e débil detectada por mutación | Reforzada y repetida la mutación hasta que falla ante el defecto | [`docs/ia-auditoria-mutacion-busqueda.txt`](docs/ia-auditoria-mutacion-busqueda.txt) |
| SonarCloud sin invocación explícita en el workflow | Paso `sonarcloud` en `ci.yml`; **parcial**: falta el secreto `SONAR_TOKEN` (acción del equipo) | [`docs/no-conformidades.md`](docs/no-conformidades.md) |

## Semana 10 · Segundo corte (2026-10-08)

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Escenario operativo asignado "No verificado" | Se documenta que el docente indicó tomar uno de los escenarios planeados por el equipo; se elige S1 con su motivo | [`docs/medicion-s10.md`](docs/medicion-s10.md) |
| Hipótesis, montaje, variables, umbral y línea base | Hipótesis H1, montaje, variables, umbral y línea base de Render (1/5/20 conexiones) | [`docs/medicion-s10.md`](docs/medicion-s10.md) |
| S1 no demostrado en producción (p97,5 = 1.113 ms a 20 conexiones) | Se mide sobre Dokploy: 200 conexiones, p97,5 = 157 ms, 0 errores; incluye factores de confusión y límites | [`docs/medicion-s10.md`](docs/medicion-s10.md) |
| Decisión registrada en ADR | ADR-0010 (Dokploy en lugar de Render y Neon), con alternativas, costo y qué la revisaría | [`docs/adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md`](docs/adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md) |
| Métrica ligada al escenario (`/metrics` solo medía POST) | `/metrics` expone la latencia de la búsqueda (S1) con errores aparte | `src/observabilidad/`, `src/observabilidad/metricas.service.spec.ts` |
| Salud del proceso confundida con disponibilidad de datos | `/health` (vivo) y `/health/ready` (base responde, 503 si no); el proceso arranca sin la base | `src/salud/`, `test/almacenamiento-no-disponible.e2e-spec.ts` |
| C4-C2/C3 con PostgreSQL "planeado" y sin búsqueda ni Emparejamiento | Ambos diagramas reescritos con el estado real del código | [`docs/c4/C4-C2.md`](docs/c4/C4-C2.md), [`docs/c4/C4-C3.md`](docs/c4/C4-C3.md) |
| Sucesión de ADR-0002/0003 y enlace de ADR-0004 | ADR-0011 registra las enmiendas; cada ADR afectado lleva una línea de estado con enlace | [`docs/adr/0011-registro-de-enmiendas-a-adrs-aceptados.md`](docs/adr/0011-registro-de-enmiendas-a-adrs-aceptados.md) |
| README sin variables de entorno y con ejemplo de error antiguo | Tabla de variables, URL de Dokploy y ejemplo de error `{statusCode, message}` | [`README.md`](README.md) |
| SonarCloud: scanner con `continue-on-error`, sin run exitoso acreditado | **Abierta, causa identificada:** el secreto `SONAR_TOKEN` ya existe (token personal de `Cconde31`), pero al quitar `continue-on-error` el scanner falló con «Not authorized or project not found»: falta el permiso *Execute Analysis* sobre el proyecto de la organización `isco-utb`. El CI con la bandera quedó en verde; el Quality Gate público (GitHub App) sigue en OK | [`docs/no-conformidades.md`](docs/no-conformidades.md), run `37858210549` (fallo sin la bandera) |

### Tras la revisión preliminar del 2026-10-10

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Sin salidas brutas ni SHA exacto desplegado ("a8068df o posterior") | Se fija el commit `a8068df`, la ventana horaria y se guardan las salidas originales de cada corrida y de `/metrics` | [`docs/medicion-s10.md`](docs/medicion-s10.md), [`docs/evidencia/medicion-s10-dokploy.json`](docs/evidencia/medicion-s10-dokploy.json) |
| Se presentaba como medición lo que era inferencia (red frente a CPU/SQL) | Se reescribe como indicio: la ventana de `/metrics` son 200 éxitos recientes, no la corrida completa; se añade que la hipótesis causal no queda aislada y qué haría falta para separarla | [`docs/medicion-s10.md`](docs/medicion-s10.md) |
| `SELECT 1` no prueba que el esquema esté listo | `/health/ready` exige base y esquema preparado; una tabla inexistente responde 503; pruebas unitarias nuevas | `src/infrastructure/persistence/postgres-publicacion.repository.ts` y su spec |
| Contrato sin 503 en `GET /publicaciones/{id}` | Se declara el 503 y se prueban las cuatro respuestas 503 contra OpenAPI | [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml), `test/almacenamiento-no-disponible.e2e-spec.ts` |
| arc42 secciones 5 y 6 y C4-C3 sin el estado actual | Reescritas con PostgreSQL, búsqueda, Emparejamiento, `/health/ready`, métrica GET, filtro 503 y los modos de fallo | [`docs/arc42/arc42.md`](docs/arc42/arc42.md), [`docs/c4/C4-C3.md`](docs/c4/C4-C3.md) |
| TLS con `rejectUnauthorized: false` | Se documenta que cifra pero no valida el certificado, y que `DATABASE_SSL=false` es una decisión para red interna no verificada | [`docs/arc42/arc42.md`](docs/arc42/arc42.md) (riesgos) |

## Pendientes que siguen abiertos

Ver el detalle y el plan de corrección de cada uno en
[`docs/no-conformidades.md`](docs/no-conformidades.md).
