# Uso de IA en el proyecto Recobra

Este documento registra los usos reales de herramientas de IA durante el
desarrollo del proyecto, tal como lo pide la evidencia S1/S2.

| Fecha | Integrante | Herramienta | Qué se le pidió | Qué se usó del resultado / qué se descartó |
|---|---|---|---|---|
| 2026-08-23 | Equipo | Claude / ChatGPT | Comparar arquitectura en capas, hexagonal y monolito modular para el backend de Recobra | Se usó la matriz comparativa como base y se ajustaron los pesos según restricciones reales; se descartó la recomendación de microservicios por sobredimensionada |
| 2026-09-05 | Equipo | Cursor / Claude | Replantear ADR y migrar a NestJS + Flutter ante el stack obligatorio del curso; alinear feedback del algoritmo (aspectos 8 columnas, CI, medición corte 1) | **Aceptado:** ADR-0002/0003, tabla de aspectos con 8 columnas, CI, cliente Flutter del corte, script de medición, C4 alineado a NestJS. **Corregido:** no tratar el feedback automático como nota final; la “restricción asignada” del algoritmo no existía aparte del stack. **Rechazado:** reescribir el dominio en Python/FastAPI y pasar el cliente a NextJS (mayor riesgo de aprendizaje sin beneficio para S5). |
| 2026-09-05 | Equipo | Cursor / Composer | Explicar fallo de GitHub Actions / SonarCloud Quality Gate (Reliability C, Security C) tras el push del corte; corregir hallazgos y redactar el PDF de 2 páginas para Moodle | **Aceptado:** `lang="es"` en `mobile/web/index.html`; endurecer `.github/workflows/ci.yml` (SHA fijos de actions, `npm ci --ignore-scripts`, `flutter pub get --enforce-lockfile`); `allowBackup=false` y cleartext solo en debug; minify/obfuscation en release Android; `gradle/verification-metadata.xml`; PDF en `docs/entrega-corte1-moodle.pdf` generado con script revisado por el equipo. **Corregido:** el job rojo no era el de tests Nest/Flutter sino el Quality Gate de Sonar de la organización. **Rechazado:** desactivar Sonar o excluir `mobile/` del análisis para “pasar en verde” sin corregir las causas. |
| 2026-09-19 | Camilo Conde | Claude | Evidencia S7 (contrato de API y prueba de contrato) y cierre de pendientes de S6: contrato OpenAPI, prueba de contrato con `jest-openapi`, ADR-0004 de integración síncrona/asíncrona, y verificar dos hallazgos que la documentación daba por ciertos sin comprobarlos (token de Coveralls y SonarCloud) | **Aceptado:** `docs/contracts/openapi.yaml`, `test/contract.e2e-spec.ts`, paso "Contract tests" en CI, ADR-0004. **Corregido:** dos afirmaciones de `docs/no-conformidades.md` resultaron falsas al verificarlas contra el estado real — no existía ningún paso de SonarCloud en `ci.yml` (corre por GitHub App, ya en verde) y el token de Coveralls no es de Recobra (es un artefacto del paquete `debug@2.6.9`); se corrigió la documentación en vez de dejar la afirmación sin comprobar. **Rechazado:** reescribir el historial de git (`git filter-repo`) para "limpiar" el token de Coveralls — innecesario, dado que no es un secreto propio, y arriesgaba invalidar commits ya calificados. |
| 2026-09-26 | Camilo Conde | Claude | Evidencia S8 (despliegue reproducible, CI y observabilidad): elegir plataforma sin tarjeta, preparar Dockerfile/IaC, logs estructurados, métrica ligada a S5, ADR-0005 y estimación de costo | **Aceptado:** `Dockerfile`, `render.yaml`, `src/observabilidad/` (logger JSON, métrica `/metrics`), ADR-0005, `docs/despliegue/costo-mensual.md`, secciones 2 y 7 de arc42. **Corregido:** el equipo no tiene acceso al "servidor del laboratorio" ni confirmó la condición operativa del taller aplicado — se documentó como supuesto explícito (límite de costo + sin tarjeta) en vez de asumirlo en silencio. **Rechazado:** Fly.io (exige tarjeta) y una función serverless para la API (el estado en memoria no sobrevive entre invocaciones frías, y el arranque en frío de Node compite mal con el objetivo p95 de S5). La URL pública real depende de que el equipo apruebe el despliegue en Render (paso manual, no ejecutable por IA). |
| 2026-09-27/28 | Camilo Conde | Claude | Implementar Emparejamiento (antes solo diseño) y persistencia real en PostgreSQL; mejorar la interfaz Flutter; corregir la vitrina y completar el taller aplicado tras encontrar su ficha real | **Aceptado:** `src/emparejamiento/` (entidad, puerto, caso de uso, evento en proceso, endpoint), `PostgresPublicacionRepository` (ADR-0006), desplegables de categoría/ubicación en Flutter, reintentos en `public/index.html`. **Corregido:** un bug real de CSS que dejaba el botón "Reintentar" de la vitrina siempre visible aunque el backend estuviera en línea (especificidad `#id` vs. `[hidden]`); la cifra de arranque en frío del taller, que citaba un benchmark público, se reemplazó por una medición local real (586/576/568 ms) porque la ficha del taller exige medición, no estimación de manual. **Rechazado:** inventar una identidad visual "UTB" sin un manual de marca real — se mantuvo un diseño neutral en vez de fabricar una marca institucional falsa. |
| 2026-10-01 | Camilo Conde | Claude | Evidencia S9 (generación verificada y trazable): cadena completa de Emparejamiento, auditoría de erosión y de dependencias, prueba de mutación real, medición de S3, y ADR-0007 sobre no incorporar un LLM en producción | **Aceptado:** `docs/auditoria-generacion-ia.md` (erosión limpia, 4 dependencias verificadas contra el registro de npm con su repositorio y descargas), `docs/medicion-emparejamiento.md` (~2 ms vs. 60.000 ms de S3), `scripts/measure-emparejamiento.js`, ADR-0007. **Corregido:** se encontró (de nuevo) una afirmación de `docs/no-conformidades.md` que la revisión oficial marcó "No cumple" — SonarCloud sigue sin un paso explícito en `ci.yml` que el algoritmo de revisión pueda citar, aunque el Quality Gate corra y pase por GitHub App; se agrega el paso real esta vez en vez de seguir explicando por qué no hace falta. **Rechazado:** usar un LLM para mejorar la heurística de emparejamiento (coincidencias semánticas) — el costo por operación rompe el presupuesto de $0/mes y la latencia no justifica el beneficio frente a la heurística determinista ya medida; motivo completo en ADR-0007. |


## Criterio del equipo sobre el uso de IA

- La IA se usa para acelerar borradores de documentación (arc42, ADR) y para
  discutir alternativas, no para generar la decisión final sin revisión del
  equipo.
- Toda salida generada con IA se revisa y se ajusta contra las restricciones
  reales del proyecto (S1: técnicas, organizativas, legales) antes de
  incorporarse al repositorio.
- El código de lógica de negocio (a partir de la semana 4) se escribe y se
  entiende por el equipo; el uso de IA en esa etapa también se registrará
  aquí.
- Para el primer corte vertical (crear/consultar publicación), la IA generó
  una propuesta completa de entidad, puerto, caso de uso, adaptador y
  pruebas; el equipo la valida verificando que las pruebas pasen (`npm
  test`) y que la estructura respete los límites de capas definidos en
  ADR-0001 antes de darla por aceptada.

## Registro de Uso de IA - [Fernando Isacc Conde Herrera]

### 1. Nivel de Uso
* *Frecuencia:* Uso puntual como herramienta de apoyo conceptual y consulta.
* *Herramientas empleadas:* Gemini / Claude (muy baja frecuencia de uso).

### 2. Casos de Uso Específicos
* *Clarificación de requisitos arquitectónicos:* Consultas relativas a los componentes del estándar y los criterios de aceptación para el corte vertical.
* *Revisión y validación de código:* Análisis de fragmentos de código en JavaScript (Node.js) para entender el flujo de datos entre la interfaz y la lógica del corte vertical.
* *Estructuración de entregables:* Guía en la organización de la documentación del proyecto y verificación de la lista de chequeo de la entrega.
* *Verificación de dependencias (S9):* Confirmé manualmente en npmjs.com que `pg`, `@types/pg`, `@nestjs/event-emitter` y `jest-openapi` son paquetes reales, con repositorio público y volumen de descargas alto — ninguno parece inventado por una IA.
* *Verificación de la dependencia de la búsqueda (S9):* Confirmé manualmente en npmjs.com que `autocannon` (herramienta de carga HTTP agregada para medir la búsqueda) es un paquete real: repositorio público `mcollina/autocannon`, licencia MIT, publicado desde 2016 y con alto volumen de descargas — no parece inventado por una IA.


### 3. Declaración de Autonomía
* El código final y la documentación enviada fueron revisados, comprendidos y validados manualmente antes de su integración al repositorio.

## Registro de Uso de IA - [Camilo Conde]

### 1. Nivel de Uso
* *Frecuencia:* Uso frecuente como apoyo técnico durante el desarrollo del backend.
* *Herramientas empleadas:* Claude (frecuencia media-alta de uso).

### 2. Casos de Uso Específicos
* *Diseño y arquitectura:* Consultas sobre la aplicación práctica del estilo hexagonal (puertos y adaptadores) en casos de uso concretos del proyecto.
* *Generación de código base:* Apoyo en la escritura de entidades, casos de uso, adaptadores y pruebas automatizadas siguiendo la estructura ya definida en el repositorio.
* *Documentación técnica:* Ayuda para mantener actualizados el README y la documentación de arquitectura (ADR, arc42) conforme avanza el desarrollo.
* *Corte 1 / stack obligatorio:* Apoyo con Cursor para migrar a NestJS + Flutter, completar ADR-0002/0003, medición, CI y el PDF de Moodle.
* *Quality Gate SonarCloud:* Diagnóstico del fallo post-push y correcciones de seguridad/confiabilidad en CI y Android/web.
* *Búsqueda con filtros (S9, aspecto A6):* Apoyo para implementar `GET /publicaciones` (puerto `buscar`, caso de uso, adaptadores de memoria y PostgreSQL), el contrato 2.1.0, ADR-0008/0009 y la medición con `autocannon`. **Aceptado:** la consulta SQL fija y parametrizada, el límite acotado a 50 y el script de carga concurrente. **Corregido:** la primera prueba e2e del filtro de categoría pasaba aun con el filtro invertido (la prueba de mutación lo reveló), por lo que se reforzó con una publicación de ruido y la comparación del id exacto; durante la escritura del adaptador, el shell consumió los marcadores `$1..$4` del SQL y la sentencia quedó vacía; se detectó al revisar el diff y se corrigió a mano. **Rechazado:** armar el `WHERE` por concatenación de cadenas (riesgo de inyección SQL) y medir con un bucle secuencial (no mide concurrencia). `autocannon` se verificó en el registro de npm antes de instalarlo (ver `docs/auditoria-generacion-ia.md`).

### 3. Declaración de Autonomía
* Todo el código y la documentación generados con apoyo de IA fueron revisados, ejecutados (pruebas automatizadas) y validados antes de integrarlos al repositorio.
* 
## Registro de Uso de IA - [Verónica Ubarne]

### 1. Nivel de Uso
* *Frecuencia:* Uso moderado como asistente para la documentación, revisión de código y análisis arquitectónico.
* *Herramientas empleadas:* Claude (frecuencia media de uso).

### 2. Casos de Uso Específicos
* *Revisión del repositorio:* Análisis de la estructura del proyecto, archivos clave (package.json, server.js, adaptadores HTTP) y verificación del estado del corte vertical.
* *Completar documentación arc42:* Apoyo para redactar las secciones 5 (Requisitos de calidad) y 6 (Construcción y despliegue) que faltaban en el archivo `arc42.md`.
* *Estructuración de la tabla de aspectos:* Transformación del texto plano sobre seguridad en una tabla con el formato solicitado (Aspecto, Decisión, Justificación, Pruebas).
* *Análisis de arquitectura modular (entrega 2):* Revisión de `app.module.ts`, `publicaciones.module.ts` y `main.ts` para identificar los módulos del sistema y sus relaciones.
* *Identificación de dueños de datos (entrega 2):* Análisis de la entidad `Publicacion`, el puerto `PublicacionRepository` y el adaptador `MemoriaPublicacionRepository` para determinar qué módulo es dueño único de cada conjunto de datos.
* *Detección de violaciones arquitectónicas (entrega 2):* Revisión del código real (controlador, casos de uso, DTO, entidad, módulo) para identificar violaciones como la falta de autenticación, la persistencia volátil en memoria, la falta de trazabilidad de estados, la ausencia de pruebas e2e y la falta de validación en el DTO.
* *Redacción del plan de corrección (entrega 2):* Apoyo en la propuesta de acciones concretas, prioridades y plazos para resolver cada violación detectada.
* *Verificación de entregables:* Revisión de la lista de chequeo de las entregas incrementales (arc42, C4, corte vertical, tabla de aspectos, tabla de dueños, violaciones) para confirmar que todo estuviera completo.
* *Organización del trabajo:* Guía sobre el flujo de trabajo con Git y la estructura de carpetas para la documentación.
* *Revisión de prueba de mutación y ADR de IA (S9):* Verifiqué que la prueba sobre el emparejamiento falla de verdad al introducir un defecto real (no solo que pasa en verde), revisando la salida capturada en `docs/ia-auditoria-mutacion-emparejamiento.txt`. También revisé el ADR-0007, que justifica por qué el equipo decidió no usar un modelo generativo para mejorar el emparejamiento (costo por operación, latencia, riesgo de alucinación) en vez de incorporarlo sin una decisión explícita.
* 

### 3. Declaración de Autonomía
* Toda la documentación generada con apoyo de IA fue revisada, ajustada y validada por mí antes de integrarse al repositorio. El contenido final refleja el entendimiento del proyecto y sus requisitos.
* Todo el código y la documentación generados con apoyo de IA fueron revisados, ejecutados (pruebas automatizadas y pruebas manuales) y comprendidos por mí antes de integrarlos al repositorio.

## Registro de Uso de IA - [Miguel Alejandro Iii Jacome Yanez]

### 1. Nivel de Uso
* *Frecuencia:* Uso moderado como apoyo en documentación de arquitectura (C4, arc42) y revisión de código generado.
* *Herramientas empleadas:* Claude (frecuencia media de uso).

### 2. Casos de Uso Específicos
* *Diagramas C4:* Apoyo para etiquetar las flechas del nivel 2 con protocolo y formato (S7), y para los flujos de interacción de la sección 6 de arc42.
* *Revisión de la auditoría de erosión (S9):* Revisé `docs/auditoria-generacion-ia.md` y confirmé que el código de Emparejamiento generado con IA solo lee publicaciones a través del puerto `PublicacionRepository` y nunca escribe sobre datos que no son suyos — respeta la regla de dueño único de datos de la semana 6.
* *Revisión de la erosión en la búsqueda con filtros (S9):* Revisé las secciones 6 a 9 de `docs/auditoria-generacion-ia.md` y comprobé en el buscador de código de GitHub que `buscar()` solo la invoca el caso de uso `BuscarPublicaciones` (fuera de las pruebas), y que ese caso de uso solo importa el dominio y el puerto, sin adaptadores. La búsqueda es de solo lectura, así que no rompe la regla de dueño único de datos.

### 3. Declaración de Autonomía
* Todo el código y la documentación generados con apoyo de IA que revisé fueron comprendidos y validados por mí antes de darlos por aceptados.
