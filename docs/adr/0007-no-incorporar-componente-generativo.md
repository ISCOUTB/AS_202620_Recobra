# ADR-0007: No incorporar un componente generativo (LLM) en tiempo de ejecución

## Estado

Aceptada — 2026-10-01. Evidencia S9. No reemplaza ni modifica ningún ADR
anterior — es una decisión nueva sobre una pregunta nueva ("¿Recobra debe
llamar a un modelo generativo en producción?"), distinta de usar IA como
herramienta de desarrollo (eso ya está registrado en
[`docs/ia.md`](../ia.md), no es una decisión de arquitectura).

## Contexto

La evidencia de esta semana pide decidir explícitamente si Recobra
incorpora o va a incorporar un componente generativo (LLM) como parte del
sistema en ejecución — por ejemplo, para redactar descripciones de
publicaciones, resumir coincidencias, o mejorar la heurística de
emparejamiento de `BuscarCoincidencias` con comprensión semántica en vez de
comparación exacta de categoría/ubicación.

Candidato concreto evaluado: reemplazar o complementar la heurística actual
(`calcularScore`, comparación de texto) con una llamada a un LLM que
compare las descripciones libres de dos publicaciones y estime si son el
mismo objeto.

## Alternativas consideradas

### A. Incorporar un LLM para mejorar el emparejamiento (descartada por ahora)

- **A favor:** entendería "mochila azul Jansport" y "bolso azul de
  estudiante" como el mismo objeto, algo que la comparación de texto actual
  no puede.
- **En contra, contra las tres restricciones reales del proyecto:**
  1. **Latencia (S5):** el escenario S5 fija el corte vertical sin degradar
     su rendimiento; `docs/medicion-corte1.md` mide `POST /publicaciones`
     en ~2 ms. Una llamada a un LLM externo añade cientos de milisegundos a
     segundos por invocación — rompería ese presupuesto si se hiciera
     síncrono, y aunque se hiciera asíncrono (como ya es Emparejamiento,
     ADR-0004), seguiría siendo órdenes de magnitud más lento que los
     ~2 ms medidos en `docs/medicion-emparejamiento.md` para la heurística
     actual frente al umbral de 60 s de S3 — hay margen, pero el costo por
     operación (ver abajo) pesa más que la latencia aquí.
  2. **Costo por operación:** cada publicación nueva dispararía al menos
     una llamada al proveedor. Con el supuesto de volumen de
     `docs/despliegue/costo-mensual.md` (~180.000 operaciones/mes), aunque
     el costo por token sea bajo, deja de ser **$0/mes** — rompe
     directamente la restricción "sin tarjeta / límite de costo" de
     `docs/arc42/arc42.md` sección 2, que hoy se cumple en su totalidad.
  3. **Confiabilidad:** un LLM puede alucinar una coincidencia falsa o
     fallar/responder lento ante un pico de tráfico del proveedor — el
     aspecto A1 (disponibilidad, S4a) ya exige que un componente no crítico
     no tumbe la operación crítica; un LLM externo sería exactamente ese
     componente no crítico, con un modo de fallo nuevo (alucinación) que la
     heurística determinista no tiene.
- **Decisión sobre esta alternativa:** descartada **por ahora**, no para
  siempre — ver "Qué revisaría esta decisión".

### B. Mantener la heurística determinista actual (elegida)

- **A favor:** $0 de costo marginal por operación, ~2 ms medidos, 100 %
  reproducible y testeable con pruebas de mutación reales (ver
  `docs/auditoria-generacion-ia.md`), sin modo de fallo por alucinación.
- **En contra:** no detecta coincidencias cuando la categoría o la
  descripción difieren en redacción aunque sea el mismo objeto (falsos
  negativos). Es una limitación conocida y documentada, no oculta.

## Decisión

Recobra **no incorpora un componente generativo en tiempo de ejecución**
por ahora. El emparejamiento sigue siendo la heurística determinista de
`BuscarCoincidencias` (alternativa B). El uso de IA del proyecto queda
limitado a herramienta de desarrollo (`docs/ia.md`), no a un contenedor en
producción — por eso no aparece como contenedor externo en el C4 nivel 2.

## Consecuencias

**Positivas**

- Se conservan intactos el presupuesto de costo ($0/mes) y el de latencia
  (S5) ya medidos y verificados.
- No se introduce un modo de fallo nuevo (alucinación, dependencia de un
  proveedor externo) en una pieza que hoy es 100 % determinista y
  reproducible.

**Negativas / limitación asumida**

- Coincidencias semánticamente obvias para una persona pero con texto muy
  distinto no se detectan hoy. Se acepta como limitación conocida del
  alcance actual, no como deuda oculta.

## Qué revisaría esta decisión

- **Dato que la haría revisar:** si una medición real sobre publicaciones
  del campus muestra una tasa alta de falsos negativos (coincidencias
  reales no detectadas por diferencias de redacción) que afecte el valor
  del producto, sería el disparador para reconsiderar un LLM — con su
  propio ADR, su conjunto de evaluación con umbrales, costo por operación y
  latencia p95 medidos, como exige esta misma ficha.
- **Costo de reversión aceptado:** bajo — `BuscarCoincidencias` ya aísla la
  heurística en `calcularScore()`; sustituirla por una llamada a un LLM es
  cambiar un método, no la arquitectura del caso de uso ni el puerto
  `CoincidenciaRepository`.

## Referencias

- [`docs/auditoria-generacion-ia.md`](../auditoria-generacion-ia.md)
- [`docs/medicion-emparejamiento.md`](../medicion-emparejamiento.md)
- [`docs/despliegue/costo-mensual.md`](../despliegue/costo-mensual.md)
- [ADR-0004](0004-integracion-sincrona-vs-asincrona.md), [ADR-0005](0005-plataforma-despliegue-backend.md)
- Escenarios S3, S4a, S5 en [`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md)
