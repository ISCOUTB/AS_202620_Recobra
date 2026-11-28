# Cierre arquitectónico: aplicación de la retroalimentación final

Entrega de la semana 17 (ficha `arqsw:cierre`). Recoge **toda** la retroalimentación recibida después del
proyecto final, la clasifica, enlaza cada cambio a su commit y ADR, y cierra con la retrospectiva del
equipo.

- **Estado de partida:** `8aeffba`, el commit observado en el
  [corte final del 25-nov](https://github.com/ISCOUTB/AS_202620_feedback/blob/master/revisiones/2026-2/AS_202620_Recobra/corte-final-2026-11-25.md).
  La [evaluación S16](https://github.com/ISCOUTB/AS_202620_feedback/blob/master/revisiones/2026-2/AS_202620_Recobra/semana-16-final.md)
  observó `703d444`.
- **Cambios:** commits de `4edfa3e` en adelante
  ([comparación](https://github.com/ISCOUTB/AS_202620_Recobra/compare/8aeffba...master)).

## Fuentes y recuento

| Origen | Qué se recibió | Recomendaciones | En la matriz |
|---|---|---|---|
| **Jurado** (sustentación final, 2026-11-23) | Recomendación oral, registrada por el equipo | 1 | J1 |
| **Revisión entre pares** (semana 14) | **No se recibió ninguna**: ningún equipo revisó Recobra y Recobra no tuvo revisión asignada. Ya estaba declarado en arc42 §11.4. No hay filas que inventar | 0 | — |
| **Docente: evaluación S16** (2026-11-23) | 3 acciones concretas (la 1 y la 3 traen dos partes cada una), 3 preguntas de sustentación y una observación sobre SonarCloud | 9 | D1–D9 |
| **Docente: corte final** (2026-11-25) | Persistencia con condición operativa | 1 | D10 |
| **Total** | | **11** | **11 filas** |

## Matriz de retroalimentación

**Clasificación de las 11:** 8 aceptadas, 1 aceptada en parte (D3; su otra mitad, D3b, aplazada) y 2
aplazadas (D5 y D9). Ninguna rechazada: las dos aplazadas dependen de un acceso que el repositorio no
tiene, y cada una dice qué la cierra y quién.

| # | Recomendación | Origen | Clasificación | Qué se hizo / por qué no | Código y pruebas | ADR | Documentación |
|---|---|---|---|---|---|---|---|
| **J1** | Justificar las decisiones de arquitectura desde lo que es el proyecto: a la materia le importa la arquitectura, no el software | Jurado | **Aceptada** | Cada decisión, en una tabla: rasgo de Recobra que la pidió → escenario → alternativa descartada → evidencia. Además, el video final se centra en las decisiones, no en las pantallas | — (documental) | Todos, desde [arc42 §9](arc42/arc42.md#9-decisiones-de-arquitectura) | [`decisiones-en-contexto.md`](decisiones-en-contexto.md), enlazado desde arc42 §9 y el README |
| **D1** | A8 y A9 de la tabla de aspectos citan `public/index.html`, retirado por ADR-0031 | S16, acción 1 | **Aceptada** | Se quitaron las referencias a la vitrina. La campana de avisos apunta ahora a la app Flutter | — | [ADR-0031](adr/0031-una-sola-interfaz-la-app-flutter-reemplaza-la-vitrina.md) | [`aspectos.md`](aspectos.md) |
| **D2** | Convertir en enlaces las columnas Código y Pruebas de todos los aspectos | S16, acción 1 | **Aceptada** | 107 enlaces directos a archivos. Quedan como texto solo los nombres de clases y métodos, que no son archivos. `scripts/verificar-documentacion.js` comprueba en el CI que cada enlace llegue a un archivo que existe | — | — | [`aspectos.md`](aspectos.md) |
| **D3** | El job «SonarCloud Scan» aparece en verde aunque falla (*Not authorized*, `continue-on-error`): separarlo del Quality Gate sin ocultar el estado | S16, acción 2 | **Aceptada en parte** | El job se llama «SonarCloud Scan (sin permiso; no bloquea)» y, si falla, deja una **advertencia visible** en el run. El Quality Gate sigue bloqueando con el análisis automático de SonarCloud ([`f9ab16d`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/f9ab16d283ae0477213c709ace8d32cddd1b5fb6)). El primer intento retiraba el job ([`4edfa3e`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/4edfa3e2acb626b931495f0d2b73244683506e6d)), pero eso reabría la observación S8, que exige invocar el scanner desde el workflow; se corrigió en el commit siguiente | [`ci.yml`](../.github/workflows/ci.yml) | [ADR-0030](adr/0030-seguridad-en-el-pipeline-dependencias-secretos-y-permisos.md) | [`no-conformidades.md`](no-conformidades.md) punto 4; arc42 RV-11 |
| **D3b** | …y corregir el permiso del scanner | S16, acción 2 | **Aplazada** | **Motivo técnico:** SonarCloud rechaza el análisis porque la cuenta del token no tiene el permiso *Execute Analysis* sobre el proyecto de la organización `isco-utb`. Ese permiso solo lo concede un administrador de la organización; un integrante no puede dárselo a sí mismo ni generar un token con ese alcance. **Mientras tanto:** el job Quality Gate bloquea; su bloqueo está probado con los runs `38070271517` (rojo) y `38070527030` (verde). **Se cierra cuando:** el administrador conceda el permiso; entonces se quitan `continue-on-error` y la advertencia. **Responsable:** Camilo | — | — | arc42 RV-11 |
| **D4** | Repetir la búsqueda con un catálogo representativo (S14 midió con 2 publicaciones) | S16, acción 3 | **Aceptada** | Medición con 1.000, 10.000 y 100.000 publicaciones en un PostgreSQL de prueba, sin tocar producción ([`1c9c4cc`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/1c9c4cce07ed7fdd39f9ec54409c0705be1c40fc), [`0c19b9f`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/0c19b9f4957a90ba9c8909536abfcbfd5b640121)). **Encontró un defecto real:** con 100.000 publicaciones la búsqueda con filtros daba 2.783 ms, cuando el umbral es 400. Se corrigió con índices ([`9859fe7`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/9859fe754c8aebd774c95ce2107513cbd7ff8481)): ahora da 100 ms | [`postgres-publicacion.repository.ts`](../src/infrastructure/persistence/postgres-publicacion.repository.ts); medición repetible en [`medir-catalogo.js`](../scripts/medir-catalogo.js) y [`medicion-catalogo.yml`](../.github/workflows/medicion-catalogo.yml) (antes: [run 46145262833](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/46145262833); después: [run 46145746943](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/46145746943)) | **Nuevo:** [ADR-0034](adr/0034-indices-de-busqueda-por-categoria-y-lugar.md), que **reemplaza en parte** [ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md) | [`medicion-catalogo.md`](medicion-catalogo.md); aspectos A6; arc42 RV-02 |
| **D5** | Verificar el respaldo y la restauración en producción, no solo en el CI | S16, acción 3 | **Aplazada** | **Motivo técnico:** para verificarlo sin arriesgar los datos reales hace falta (1) programar el respaldo en el panel de Dokploy (T26) y (2) restaurar en una **base aparte** del mismo servidor y comparar. Ambas son operaciones del panel, que no tiene API ni acceso desde el repositorio. Restaurar sobre la base de producción para «probar» destruiría los datos. **Lo que hay hoy:** el CI restaura y compara con PostgreSQL 16 real en cada push ([`verificar-respaldo-postgres.sh`](../scripts/verificar-respaldo-postgres.sh)). **Se cierra cuando:** exista el respaldo programado y una restauración cronometrada; esa misma prueba da el RTO de S4b (RV-08). **Responsable:** Camilo, con acceso a Dokploy | — | [ADR-0027](adr/0027-la-decision-de-datos-mas-costosa-de-revertir.md) | [`despliegue/respaldos.md`](despliegue/respaldos.md); arc42 RV-08 |
| **D6** | Pregunta 1: si el proceso muere tras guardar una reclamación y antes del aviso, ¿cómo se reconstruye el aviso sin duplicarlo y sin entregar dos veces el objeto? | S16, preguntas | **Aceptada** (sin cambio de código: ya estaba cubierta; se responde con sus pruebas) | **El aviso:** la conciliación (cada 5 min, últimos 3 días) recorre las reclamaciones creadas y recrea el aviso que falte. El id del aviso se deriva del dato (reclamación + destinatario), así que repetir no duplica. **La entrega:** aprobar es un `UPDATE … WHERE estado = …` condicional, así que dos aprobaciones dejan una sola. Que el aviso se repita o no, nunca cambia de dueño el objeto | [`conciliar-avisos.spec.ts`](../src/application/use-cases/conciliar-avisos.spec.ts) («recrea … y no los duplica al repetir»); [`reclamaciones.spec.ts`](../src/application/use-cases/reclamaciones.spec.ts) (dos aprobaciones simultáneas dejan una) | [ADR-0024](adr/0024-conciliacion-de-avisos.md), [ADR-0020](adr/0020-consistencia-entre-publicaciones-y-reclamaciones.md) | [`modos-de-fallo.md`](modos-de-fallo.md) |
| **D7** | Pregunta 2: con 100.000 publicaciones, ¿qué permite concluir el p97,5 de 203 ms medido con dos? | S16, preguntas | **Aceptada** | Nada; y al medirlo, no cumplía. Ver D4 | Ver D4 | [ADR-0034](adr/0034-indices-de-busqueda-por-categoria-y-lugar.md) | [`medicion-catalogo.md`](medicion-catalogo.md) |
| **D8** | Pregunta 3: si Flutter Web tarda demasiado en la red del campus, ¿qué umbral reabre ADR-0031 y cómo se conservan el 404 y la moderación sin duplicar la interfaz? | S16, preguntas | **Aceptada** | Se midió la primera carga: **10,6 MB sin comprimir**. Ahora se comprime con gzip solo bajo `/app/` y baja a **3,9 MB** ([`a369178`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/a36917872a083edc3519f96906e0293cc00fdd08)). La API no se comprime, por riesgo tipo BREACH. **Umbral:** 5 MB comprimidos. **Si se cruza:** una página de búsqueda de solo lectura servida por la API; el 404 no cambia (lo decide la API) y la moderación sigue en la app | [`compresion-de-la-app.ts`](../src/seguridad/compresion-de-la-app.ts) y su prueba [`compresion-de-la-app.spec.ts`](../src/seguridad/compresion-de-la-app.spec.ts) | **Nuevo:** [ADR-0032](adr/0032-primera-carga-de-la-app-web-compresion-y-umbral.md), que **reemplaza en parte** el criterio de revisión de [ADR-0031](adr/0031-una-sola-interfaz-la-app-flutter-reemplaza-la-vitrina.md) | C4-C2 (app); arc42 §5 |
| **D9** | SonarCloud: 113 incidencias nuevas y cobertura nueva de 0 %, «no cero problemas» | S16, observación | **Aplazada** | **Motivo técnico:** la cobertura de 0 % no mide las pruebas. Es el análisis automático de SonarCloud, que **no recibe el informe de cobertura**: solo el análisis desde el CI lo sube, y ese es el que no tiene permiso (D3b). Las 113 incidencias son del periodo de código nuevo del proyecto entero, sin clasificar por severidad. Revisarlas sin el análisis del CI significaría clasificar a mano hallazgos que cambiarán al activarse. El Quality Gate del mismo commit está aprobado. **Se cierra con D3b** | — | — | — |
| **D10** | El `compose` no administra PostgreSQL y, sin `DATABASE_URL`, la app arranca en memoria: acreditar la persistencia con *readiness* y un reinicio controlado | Corte final | **Aceptada** | **Código:** en producción, sin `DATABASE_URL` el proceso **no arranca** ([`4edfa3e`](https://github.com/ISCOUTB/AS_202620_Recobra/commit/4edfa3e2acb626b931495f0d2b73244683506e6d)); el CI arranca la imagen sin base y exige que se detenga. **Evidencia en producción** (solo lectura, 2026-11-28): `/health/ready` responde `almacenamiento: "postgres"`, y la búsqueda devuelve publicaciones del 8-oct al 24-nov que sobrevivieron a los cinco redespliegues de hoy, cada uno un reinicio del contenedor | [`seleccion-de-persistencia.ts`](../src/infrastructure/persistence/seleccion-de-persistencia.ts) y su prueba [`seleccion-de-persistencia.spec.ts`](../src/infrastructure/persistence/seleccion-de-persistencia.spec.ts); paso del CI «La imagen no arranca en producción sin base de datos» | **Nuevo:** [ADR-0033](adr/0033-produccion-no-arranca-sin-base-de-datos.md), que **reemplaza en parte** [ADR-0006](adr/0006-plataforma-persistencia-postgresql.md) | C4-C2 (base de datos); arc42 §5 y §6; [`compose.lab.yaml`](../deploy/compose.lab.yaml) |

## ADR nuevos y reemplazados

| Nuevo | Reemplaza en parte | Por qué (fila) |
|---|---|---|
| [ADR-0032](adr/0032-primera-carga-de-la-app-web-compresion-y-umbral.md) | [ADR-0031](adr/0031-una-sola-interfaz-la-app-flutter-reemplaza-la-vitrina.md): su criterio de revisión | D8 |
| [ADR-0033](adr/0033-produccion-no-arranca-sin-base-de-datos.md) | [ADR-0006](adr/0006-plataforma-persistencia-postgresql.md): el respaldo a memoria | D10 |
| [ADR-0034](adr/0034-indices-de-busqueda-por-categoria-y-lugar.md) | [ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md): su índice único | D4, D7 |

Cada ADR reemplazado lleva al principio la línea que apunta a su sucesor. Es lo único que ADR-0011
permite agregar a un ADR aceptado; su texto original no se tocó.

## Diagramas y arc42

| Artefacto | Cambio |
|---|---|
| [C4-C2](c4/C4-C2.md) | Base de datos: en producción no hay respaldo a memoria (ADR-0033); índices de búsqueda (ADR-0034). App: primera carga comprimida y umbral (ADR-0032) |
| [arc42](arc42/arc42.md) | §5 y §6: memoria solo en pruebas; §9: ADR-0032 a 0034 y enlace a las decisiones en contexto; §11.4: RV-02 corregido, RV-11 en parte |
| [aspectos](aspectos.md) | D1, D2; A6 con la medición nueva; A7 con ADR-0033 |
| [decisiones en contexto](decisiones-en-contexto.md) | Nuevo (J1) |

C4-C3 no cambia: no hay componentes nuevos. La compresión es una configuración del borde HTTP y los
índices son internos al adaptador.

## Ausencia de regresiones

- **Código y pruebas:** 223 unitarias (antes 216: +4 de la selección de persistencia y +3 de la
  compresión), 129 e2e, 10 de contrato, 37 de adaptadores contra PostgreSQL real y 35 de la app. Ninguna
  prueba existente se modificó ni se borró.
- **Run del pipeline posterior al último cambio de código y documentación:**
  [run 46146551105](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/46146551105), commit
  `ff81c7d` (2026-11-28), **en verde**: Backend NestJS (unitarias, contrato, e2e, documentación y la
  imagen que no arranca sin base), Adaptadores contra PostgreSQL real, Seguridad, Flutter y Quality Gate.
  El job del scanner aparece con su advertencia visible (D3). El único commit posterior es este registro,
  que solo toca documentos.
- **Medición de rendimiento posterior a los índices:**
  [run 46145746943](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/46145746943), las 9
  mediciones dentro de S1.
- **Producción:** `/health/ready` con `almacenamiento: "postgres"`, `/` con 302 y `/app/` con 200,
  después de los redespliegues de hoy.

## Retrospectiva

### Qué funcionó

- **Medir antes de decidir.** Render a Dokploy salió de una medición, y esta semana la retroalimentación
  nos hizo medir de nuevo y encontró un defecto que nadie había visto (D4).
- **Las reglas que vigila el CI se mantienen.** La hexagonal (`arquitectura.spec.ts`), la documentación
  (`verificar-documentacion.js`) y el Quality Gate nunca se rompieron sin que el pipeline lo dijera.
- **ADR-0011.** Reemplazar en vez de editar hizo que hoy se pudieran agregar tres decisiones sin
  reescribir la historia.

### Qué no funcionó

- **Presentamos el software más que la arquitectura.** El jurado lo dijo con claridad. Teníamos 31 ADR,
  pero la exposición recorrió pantallas y funciones; las decisiones se explicaban por lo que hacían, no
  por qué Recobra las necesitaba (J1).
- **Dimos por buena una medición vacía.** S14 midió con dos publicaciones, lo declaramos como límite y
  seguimos. Con 100.000 la búsqueda tardaba siete veces el umbral.
- **Un verde que mentía.** El scanner de SonarCloud falló durante semanas detrás de un
  `continue-on-error` en verde. Lo sabíamos y estaba documentado, pero el pipeline no lo mostraba.
- **Una comodidad de pruebas llegó a producción.** El respaldo a memoria pensado para las pruebas podía
  hacer que producción «funcionara» sin guardar nada.
- **Sin revisión entre pares.** No pedimos ni hicimos una; nos perdimos una mirada externa antes del
  cierre.

### Qué haríamos distinto

- Escribir cada ADR empezando por el rasgo del proyecto que lo pide (C1–C7 de
  [decisiones en contexto](decisiones-en-contexto.md)) y ensayar la exposición con esa estructura.
- Medir cada escenario con datos representativos desde el principio, y repetir la medición de forma
  automática cuando cambia el código que la afecta, como hace ahora `medicion-catalogo`.
- No aceptar un paso en verde que falla: o bloquea, o avisa.
- Tratar la configuración de producción como parte de la arquitectura: el entorno se decide al arrancar,
  no se deduce por la falta de una variable.

### Una lección por integrante

| Integrante | Lección |
|---|---|
| **Camilo** | Medí S1 con dos publicaciones y escribí «cumple, con límite declarado». Declarar un límite no lo vuelve aceptable: con 100.000 publicaciones la búsqueda daba 2.783 ms. Una medición sin datos representativos debe marcarse **sin medir**, no «cumple». |
| **Fernando** | La hexagonal nos dio dos adaptadores por puerto, y la selección entre ellos quedó como un `process.env.DATABASE_URL ? … : …` repetido en siete módulos. El punto más delicado de la arquitectura, el *composition root*, era el menos revisado. Las decisiones sobre el entorno deben tomarse en un solo lugar, al arrancar, y fallar fuerte. |
| **Miguel** | El índice por fecha de ADR-0008 era correcto para 1.000 filas y nadie lo volvió a mirar. Un índice tiene que nacer de la consulta que sirve (la misma expresión `lower(trim(...))`) y verificarse con `EXPLAIN` sobre datos grandes, no con la latencia de un catálogo pequeño. |
| **Verónica** | Escribimos los ADR para explicar el software: qué hace el sistema. El jurado esperaba la arquitectura: por qué Recobra necesitaba esa forma. Una decisión se defiende desde el contexto (confianza, campus, celular, $0) hacia la tecnología, y no al revés. Por eso rehicimos el índice de decisiones y el video. |
