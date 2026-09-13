# No conformidades y plan de corrección

Lista de no conformidades detectadas al comparar el estado actual del
repositorio con el contrato del curso y con la retroalimentación del docente
(`AS_202620_feedback`). Para el detalle hallazgo-por-hallazgo de S1-S5 ya
resuelto, ver [`correcciones.md`](../correcciones.md).

## 1. Token de Coveralls expuesto en el historial de git

- **Severidad:** crítica (seguridad).
- **Evidencia:** el archivo `node_modules/debug/.coveralls.yml`, versionado
  por error hasta el commit `cb5c579` y retirado del índice en `3a82ca6`,
  contiene un `repo_token` de Coveralls. El archivo ya no existe en `HEAD`,
  pero el blob sigue siendo recuperable desde el historial (`git show
  905f546:node_modules/debug/.coveralls.yml`).
- **Por qué sigue abierta:** eliminar el archivo del working tree no invalida
  un secreto ya expuesto; cualquiera con acceso de lectura al repositorio
  público puede recuperarlo del historial.
- **Plan de corrección:**
  1. El equipo debe entrar a la cuenta de Coveralls del proyecto y **rotar
     (regenerar) el token** — esta acción solo la puede hacer quien tiene
     acceso a esa cuenta; no es una operación de este repositorio ni de git.
  2. Confirmar la rotación por escrito en la sustentación (captura de pantalla
     o fecha del cambio).
  3. Evaluar, **solo si el docente lo exige explícitamente**, reescribir el
     historial con `git filter-repo --path node_modules --invert-paths` para
     eliminar el blob por completo. Esto cambia todos los hashes posteriores
     al commit afectado (incluido el hash ya calificado `f7c1a6c`) y exige
     `push --force` coordinado con todo el equipo — no se ejecuta en esta
     entrega para no invalidar commits ya evaluados por el docente.
- **Estado:** abierta — depende de una acción externa (cuenta de Coveralls)
  que no puede resolverse solo con cambios en el código.

## 2. `correcciones.md` ausente en la raíz

- **Severidad:** alta (bloqueaba 4 de 12 criterios de la rúbrica del corte 1).
- **Plan de corrección:** creado [`correcciones.md`](../correcciones.md) en la
  raíz del repositorio, enlazando cada hallazgo S1-S5 con su evidencia.
- **Estado:** resuelta en esta entrega.

## 3. Documentación arc42 fragmentada (`docs/arc42.md` + `docs/arc42/`)

- **Severidad:** media (higiene de repositorio, señalada en S4 y S5).
- **Plan de corrección:** se unificó todo el contenido en un único archivo,
  [`docs/arc42/arc42.md`](arc42/arc42.md), dentro de la carpeta `docs/arc42/`
  (así queda organizado en su propia carpeta, como pedía la revisión, pero sin
  dividirse en varios archivos). Se eliminó el `docs/arc42.md` suelto y los
  archivos por sección que se habían creado en un intento anterior, y se
  actualizó el enlace en el `README.md` raíz. De paso, se alineó toda la
  carpeta `docs/` con la convención de nombres usada por otros equipos del
  curso: `docs/ficha_problema.md`, `docs/c4/C4-C1.md`/`C4-C2.md`/`C4-C3.md`
  y `docs/calidad/` (agrupando `escenarios_calidad.md`, `arbol_utilidad.md`
  y `restricciones_justificadas.md`).
- **Estado:** resuelta en esta entrega.

## 4. CI sin análisis estático de SonarCloud

- **Severidad:** media (`sonar-project.properties` existía pero no se
  ejecutaba en ningún workflow).
- **Plan de corrección:** se agregó un paso `SonarCloud Scan` al job
  `backend` de [`.github/workflows/ci.yml`](../.github/workflows/ci.yml),
  condicionado a que exista el secreto `SONAR_TOKEN`, y se agregó
  `sonar.javascript.lcov.reportPaths` a `sonar-project.properties` para que
  el análisis pueda leer la cobertura generada por `npm test -- --coverage`.
- **Pendiente fuera del alcance de este repositorio local:** alguien con
  permisos de administración del repo en GitHub debe crear el secreto
  `SONAR_TOKEN` (Settings → Secrets and variables → Actions). Sin ese
  secreto el paso se omite automáticamente (no rompe el pipeline) pero el
  análisis no corre.
- **Estado:** corregida la configuración local; pendiente la configuración
  del secreto en GitHub (acción remota que el equipo debe hacer).

## 5. PDF de Moodle con cifra de latencia desactualizada

- **Severidad:** media (inconsistencia entre `docs/entrega-corte1-moodle.pdf`
  y la medición reproducible vigente).
- **Evidencia:** la página 2 del PDF decía "latencia POST /publicaciones en
  orden de 8-15 ms en local", una estimación sin corrida registrada que
  `docs/medicion-corte1.md` ya reemplazó por una medición reproducible
  (p95 = 0.54-1.00 ms sobre la línea base Express, commit `905f546`).
- **Plan de corrección:** se corrigió el texto en
  [`scripts/generar-pdf-corte1.py`](../scripts/generar-pdf-corte1.py) para que
  coincida con `docs/medicion-corte1.md`.
- **Pendiente:** el binario `docs/entrega-corte1-moodle.pdf` **no se pudo
  regenerar en este entorno** porque no hay un intérprete de Python instalado
  aquí. Antes de la sustentación, alguien del equipo debe correr:

  ```bash
  pip install fpdf2
  python scripts/generar-pdf-corte1.py
  ```

  y volver a adjuntar el PDF resultante en Moodle.
- **Estado:** corregido el texto fuente; pendiente regenerar el archivo
  binario y resubirlo a Moodle.

## 6. Disciplina de etiquetado git

- **Severidad:** media (proceso, no código).
- **Evidencia:** la etiqueta `corte-1` se fijó casi 10 horas después del
  cierre formal (2026-09-10T17:00:00Z), lo que constituye una entrega tardía
  aunque el trabajo estuviera casi listo antes.
- **Por qué no se corrige retroactivamente:** mover o recrear una etiqueta
  para simular una fecha anterior falsificaría el historial; no se hace bajo
  ninguna circunstancia.
- **Plan de corrección (hacia adelante):** para cada corte futuro (`corte-2`,
  `final`), fijar la etiqueta correspondiente **antes** de la hora de cierre
  publicada, y verificar con `git log -1 <tag> --format=%cI` que la fecha del
  commit etiquetado es anterior al cierre, antes de considerar la entrega
  terminada.
- **Estado:** abierta como lección de proceso para los próximos cortes; no
  aplica una corrección sobre el corte 1 ya calificado.

## 7. Participación desigual del equipo

- **Severidad:** alta (observada en S1-S5; Fernando Isacc Conde Herrera con 1
  solo commit en todo el semestre frente a 26/9/7 de los demás integrantes).
- **Por qué no es una no conformidad de código:** el reparto de trabajo es una
  decisión del equipo, no algo que se corrija editando el repositorio.
- **Plan de corrección:** repartir explícitamente responsabilidades del
  siguiente corte (S6: mapa de contextos y propiedad de datos) entre los
  cuatro integrantes, con commits individuales verificables, y documentar en
  `docs/ia.md` o en un registro de tareas quién hizo qué antes del próximo
  cierre.
- **Estado:** abierta; depende de la organización interna del equipo, no de
  un cambio de código.

## Resumen de estado

| # | No conformidad | Estado |
|---|---|---|
| 1 | Token de Coveralls expuesto | Abierta — requiere acción externa (rotar en Coveralls) |
| 2 | `correcciones.md` ausente | Resuelta en esta entrega |
| 3 | arc42 fragmentado | Resuelta en esta entrega |
| 4 | CI sin SonarCloud | Configuración corregida; falta secreto `SONAR_TOKEN` en GitHub |
| 5 | PDF con latencia desactualizada | Texto corregido; falta regenerar el binario |
| 6 | Etiqueta `corte-1` tardía | No corregible en retrospectiva; plan de proceso para futuros cortes |
| 7 | Participación desigual | Abierta; depende del equipo |
