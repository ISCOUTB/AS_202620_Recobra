# ADR-0018: Coincidencias persistidas y parecido ponderado (lugar, palabras y fecha)

## Estado

Aceptada — 2026-10-17. Mejora el emparejamiento del escenario S3 sin cambiar
la decisión de ADR-0007 (heurística determinista, sin modelo generativo) ni la
de ADR-0012 (Emparejamiento sigue dentro de la API).

## Contexto

La evaluación del planteamiento encontró dos debilidades del emparejamiento:

1. **Las coincidencias vivían en memoria** y se perdían en cada redespliegue
   (unas cuantas veces al día), mientras los avisos sí quedaban guardados.
2. **El puntaje solo miraba el lugar.** Con la misma categoría, "Calculadora
   Casio" en el Bloque A1 y "Cable USB" en la Biblioteca daban 0,3 y generaban
   un aviso; dos descripciones casi iguales en lugares distintos daban lo mismo.

## Alternativas consideradas

### A. Usar un modelo de lenguaje para comparar descripciones (descartada)

Ya descartada en ADR-0007: costo por publicación, latencia y respuestas no
explicables.

### B. Parecido ponderado, determinista y explicable (elegida)

## Decisión

1. **Parecido entre 0 y 1** (`src/domain/emparejamiento/parecido.ts`), solo
   entre publicaciones de tipo opuesto y la misma categoría:
   - **50 % lugar:** mismo lugar 1; uno contiene al otro 0,6; distinto 0.
   - **30 % palabras en común:** índice de Jaccard de las palabras clave de las
     descripciones (sin tildes, sin mayúsculas, de 3 letras o más y sin
     palabras vacías).
   - **20 % fechas:** hasta 2 días 1; hasta una semana 0,6; hasta un mes 0,3;
     más, 0.
2. **Umbral 0,3:** por debajo no se guarda la coincidencia ni se avisa. Es el
   "umbral definido" que menciona el escenario S3.
3. **Persistencia:** con `DATABASE_URL`, `PostgresCoincidenciaRepository`
   guarda las coincidencias en su propia tabla (`coincidencias`), con id
   determinista por par: recalcular actualiza el puntaje en vez de duplicar.

## Consecuencias

- Los puntajes cambiaron: el mismo caso de las pruebas pasó de 1 a 0,8 (mismo
  lugar, una palabra en común de tres y mismo día). El contrato no cambia
  (`score` sigue siendo un número entre 0 y 1).
- Las coincidencias y los avisos ahora sobreviven a los redespliegues.
- Las coincidencias calculadas antes de este cambio se perdieron con el último
  reinicio; las nuevas publicaciones generan las suyas.
- Sigue sin reprocesarse un evento perdido (pendiente de la S12).

## Qué haría revisar esta decisión

- Muchos avisos falsos o que no llegan → ajustar pesos y umbral con datos
  reales (publicaciones que terminaron entregadas frente a las que no).
- Descripciones muy cortas → sumar sinónimos frecuentes del campus ("carné" y
  "carnet", "audífonos" y "auriculares").
