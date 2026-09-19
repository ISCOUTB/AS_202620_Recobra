# No conformidades y plan de corrección

Lista de no conformidades detectadas al comparar el estado actual del
repositorio con el contrato del curso y con la retroalimentación del docente
(`AS_202620_feedback`). Para el detalle hallazgo-por-hallazgo de S1-S5 ya
resuelto, ver [`correcciones.md`](../correcciones.md).

## 1. Token de Coveralls expuesto en el historial de git

- **Severidad:** reclasificada de crítica a informativa tras investigar el
  origen exacto del archivo (ver "Hallazgo" abajo).
- **Evidencia:** el archivo `node_modules/debug/.coveralls.yml`, versionado
  por error hasta el commit `cb5c579` y retirado del índice en `3a82ca6`,
  contiene un `repo_token`. El archivo ya no existe en `HEAD`, pero el blob
  sigue siendo recuperable desde el historial (`git show
  905f546:node_modules/debug/.coveralls.yml`).
- **Hallazgo (por qué no es una no conformidad de Recobra):** ese archivo no
  pertenece a Recobra ni a ninguna cuenta del equipo. Es un artefacto del
  propio paquete de npm `debug@2.6.9`: junto al `.coveralls.yml` vienen
  `.travis.yml`, `.eslintrc`, `karma.conf.js` — configuración de CI de los
  mantenedores de `debug`, incluida por error en el paquete que publicaron a
  npm. El mismo archivo, con el mismo token, existe hoy en miles de
  repositorios públicos de cualquier proyecto que haya instalado esa versión
  de `debug`. No es una cuenta de Coveralls del equipo, y el equipo no tiene
  ni puede tener acceso para "rotarlo" — no es su token.
- **Por qué se cerró como no conformidad de Recobra:** el problema real nunca
  fue el token en sí, sino haber versionado `node_modules/` completo, lo cual
  arrastra a cualquier archivo de configuración de cualquier dependencia,
  propio o ajeno. Esa causa raíz ya está corregida (`node_modules/` fuera del
  índice desde `3a82ca6`, cubierto por `.gitignore`).
- **Plan de corrección:**
  1. ~~Rotar el token en la cuenta de Coveralls del proyecto~~ — no aplica: no
     existe tal cuenta del proyecto: es un token público de un tercero.
  2. Documentar este hallazgo (este mismo texto) para que quede trazable si
     una revisión futura vuelve a señalarlo.
  3. Reescribir el historial con `git filter-repo` sigue **sin recomendarse**:
     cambiaría todos los hashes posteriores (incluido el ya calificado
     `f7c1a6c`) por un archivo que no representa ningún riesgo real.
- **Estado:** resuelta — no es una no conformidad de Recobra; la causa raíz
  (versionar `node_modules/`) ya estaba corregida.

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

- **Corrección de un hallazgo anterior de este mismo documento:** una versión
  previa de esta entrada decía que se había agregado un paso `SonarCloud
  Scan` a `.github/workflows/ci.yml`. Se verificó el archivo real y **ese
  paso no existe ni existió** en el workflow. El análisis corre por un
  mecanismo distinto (ver abajo), así que la entrada anterior era incorrecta;
  se corrige aquí en vez de dejarla.
- **Cómo corre realmente el análisis:** SonarCloud está conectado como
  GitHub App al repositorio (no como paso de `ci.yml`); publica un *check*
  llamado "SonarCloud Code Analysis" directamente sobre cada commit,
  independiente del workflow de Actions.
- **Evidencia verificada (2026-09-19), con la API pública de SonarCloud, sin
  necesidad de sesión iniciada:**
  ```bash
  curl -s "https://sonarcloud.io/api/qualitygates/project_status?projectKey=ISCOUTB_AS_202620_Recobra"
  # {"projectStatus":{"status":"OK", ...}}
  curl -s "https://sonarcloud.io/api/components/show?component=ISCOUTB_AS_202620_Recobra"
  # {"component":{...,"visibility":"public","analysisDate":"2026-09-19T18:34:05+0000"}}
  ```
  Quality Gate: **OK** (aprobado). Visibilidad del proyecto: **pública**.
  Confirmado también vía la API de GitHub (`check-runs` del commit `667d66f`):
  `"name":"SonarCloud Code Analysis","conclusion":"success"`, con
  `details_url: https://sonarcloud.io/dashboard?id=ISCOUTB_AS_202620_Recobra&branch=master`.
- **Estado:** resuelta — corre en cada push, Quality Gate en verde, URL
  pública verificable. No se necesita crear ningún secreto `SONAR_TOKEN`
  porque el análisis no depende del workflow de Actions.

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
| 1 | Token de Coveralls expuesto | Resuelta — es un artefacto público de `debug@2.6.9`, no de Recobra; no hay nada que rotar |
| 2 | `correcciones.md` ausente | Resuelta en esta entrega |
| 3 | arc42 fragmentado | Resuelta en esta entrega |
| 4 | CI sin SonarCloud | Resuelta — corre por GitHub App, Quality Gate OK, verificado por API pública |
| 5 | PDF con latencia desactualizada | Texto corregido; falta regenerar el binario |
| 6 | Etiqueta `corte-1` tardía | No corregible en retrospectiva; plan de proceso para futuros cortes |
| 7 | Participación desigual | Abierta; depende del equipo |
