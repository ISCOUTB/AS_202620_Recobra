# Medición S1 con un catálogo representativo (2026-11-28)

Responde a la observación de la evaluación S16: la medición S14 ([`medicion-s14.md`](medicion-s14.md))
se hizo con **dos publicaciones** y respuesta vacía, así que no decía nada de un catálogo real. Su
pregunta 2: «si el catálogo crece a 100.000 publicaciones, ¿qué permite concluir el p97,5 de 203 ms?».
Respuesta corta: nada; y al medirlo, la búsqueda con filtros **no cumplía S1** a partir de 10.000.

## Cómo se midió

- **Dónde:** workflow [`medicion-catalogo`](../.github/workflows/medicion-catalogo.yml), en GitHub
  Actions (`ubuntu-latest`), con el backend y un PostgreSQL 16 efímero en la misma máquina. **No es el
  servidor del laboratorio** y no se sembró nada en producción: el script se niega a correr contra
  `recobra.iscoutb.dev`.
- **Datos:** [`scripts/medir-catalogo.js`](../scripts/medir-catalogo.js) siembra con `generate_series`
  1.000, 10.000 y 100.000 publicaciones: 7 categorías, 20 lugares, 75 % activas y fechas repartidas en
  180 días.
- **Carga:** autocannon, **200 conexiones** a la vez durante 10 s por consulta (la carga de S1). Se
  reporta p97,5, más estricto que el p95 del escenario.
- **Tres búsquedas:**
  - *frecuente:* `categoria=electronica&ubicacion=Biblioteca`, con resultados;
  - *sin filtros:* lo que ve quien abre Inicio;
  - *sin coincidencias:* `categoria=paraguas`, el peor caso, porque obliga a buscar en todo el catálogo.

## Resultados

Umbral S1: 400 ms.

### Antes: solo índice por fecha ([run 46145262833](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/46145262833), commit `0c19b9f`)

| Publicaciones | Frecuente | Sin filtros | Sin coincidencias |
|---|---|---|---|
| 1.000 | 100 ms ✅ | 82 ms ✅ | 65 ms ✅ |
| 10.000 | 285 ms ✅ | 84 ms ✅ | **430 ms ❌** |
| 100.000 | **2.783 ms ❌** (75 pet/s) | 92 ms ✅ | **3.199 ms ❌** (62 pet/s, 89 respuestas 503) |

Plan de PostgreSQL del peor caso con 100.000 (`EXPLAIN ANALYZE`):
`Index Scan using idx_publicaciones_creado_en … Rows Removed by Filter: 100000 · Execution Time: 264.755 ms`.
Recorría el catálogo entero en orden de fecha buscando filas que cumplieran el filtro. Las 89
respuestas 503 son el límite de 2 s por consulta cortando las que más esperaban.

### Después: índices por categoría y lugar ([run 46145746943](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/46145746943), commit `a369178`, ADR-0034)

| Publicaciones | Frecuente | Sin filtros | Sin coincidencias |
|---|---|---|---|
| 1.000 | 117 ms ✅ | 119 ms ✅ | 72 ms ✅ |
| 10.000 | 75 ms ✅ | 120 ms ✅ | 76 ms ✅ |
| 100.000 | **100 ms ✅** (2.465 pet/s) | 126 ms ✅ | **77 ms ✅** (3.206 pet/s) |

Plan del peor caso con 100.000:
`Index Scan using idx_publicaciones_categoria_fecha … Index Cond: (lower(TRIM(BOTH FROM categoria)) = 'paraguas') · Execution Time: 0.024 ms`.

Cero errores y cero respuestas que no fueran 2xx en todas las mediciones de después. Los valores
exactos están en las anotaciones de cada run y en
[`evidencia/medicion-catalogo.json`](evidencia/medicion-catalogo.json).

## Qué se concluye, y qué no

- **S1 se cumple con 100.000 publicaciones** en las tres búsquedas, con un margen de 300 ms.
- La consulta sin filtros sube un poco (92 → 126 ms). No usa los índices nuevos: la diferencia es
  variación entre runners de GitHub, no un efecto del cambio.
- **No es una medición de producción:** el runner no es el servidor del laboratorio, y la red es local.
  En producción se suma el trayecto de red: S10 midió 157 ms con 1.000 filas, frente a los 82 ms de
  aquí con el mismo tamaño.
- **Lo que enseña la medición S14:** medir con un catálogo vacío dio un resultado verdadero pero
  inútil. El problema solo aparece con datos.
