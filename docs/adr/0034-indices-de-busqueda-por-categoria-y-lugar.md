# ADR-0034: Índices de búsqueda por categoría y lugar

## Estado

Aceptada — 2026-11-28. Reemplaza parcialmente a
[ADR-0008](0008-busqueda-con-filtros-en-el-repositorio.md): su índice único por fecha no basta con un
catálogo grande. La búsqueda sigue resuelta en el repositorio, con la misma consulta parametrizada.
Responde a la observación y la pregunta 2 de la evaluación S16, y entra en la
[matriz de retroalimentación](../retroalimentacion-final.md).

## Contexto

ADR-0008 resolvió la búsqueda con filtros de igualdad sobre `lower(trim(categoria))` y
`lower(trim(ubicacion))`, ordenada por fecha, con un índice por `creado_en`. Todas las mediciones de S1
se habían hecho con pocos datos: 1.000 filas en S10 y 2 publicaciones en S14.

La evaluación S16 preguntó qué se puede concluir de esas mediciones si el catálogo crece a 100.000.
Al medirlo ([`medicion-catalogo.md`](../medicion-catalogo.md)), con 200 conexiones a la vez:

- con 10.000 publicaciones, un filtro sin resultados ya pasaba del umbral (430 ms);
- con 100.000, el filtro más común daba **2.783 ms** y el peor caso **3.199 ms**, con respuestas 503
  porque el límite de 2 s por consulta cortaba las más lentas.

El plan de PostgreSQL mostró la causa: recorría el índice por fecha y descartaba las 100.000 filas que
no cumplían el filtro.

Para Recobra, 100.000 publicaciones no es un número absurdo. Con 7.000 estudiantes y las publicaciones
cerradas que se conservan para el historial (ADR-0017), se llega ahí en pocos años. Además, la búsqueda
es lo primero que usa quien perdió algo.

## Alternativas consideradas

### A. Motor de búsqueda aparte, por ejemplo Elasticsearch (descartada)

Resolvería este problema y otros, como buscar por texto. Pero es otro servicio que operar en el servidor
compartido, con su propia memoria y su sincronización, para un volumen que PostgreSQL atiende de sobra
con índices. Ningún escenario lo pide (ADR-0012 aplica el mismo criterio).

### B. Una caché de resultados (descartada)

ADR-0025 ya la descartó para esta lectura: una búsqueda guardada podría mostrar como disponible un objeto
ya entregado. Además, no arregla el peor caso, que es la primera vez.

### C. Índices sobre las mismas expresiones que usa la consulta (elegida)

## Decisión

En `crearEsquema` de [`postgres-publicacion.repository.ts`](../../src/infrastructure/persistence/postgres-publicacion.repository.ts)
se agregan tres índices, con `CREATE INDEX IF NOT EXISTS`, así que se crean solos al desplegar:

- `(lower(trim(categoria)), creado_en DESC)`
- `(lower(trim(ubicacion)), creado_en DESC)`
- `(lower(trim(categoria)), lower(trim(ubicacion)), creado_en DESC)`

Usan la misma expresión que la consulta, para que PostgreSQL pueda usarlos, y ya vienen ordenados por
fecha, así que la consulta lee solo las 20 filas que devuelve. La consulta y el puerto no cambian.

## Consecuencias

**Positivas**

- Con 100.000 publicaciones: el filtro frecuente baja de 2.783 a **100 ms** y el peor caso de 3.199 a
  **77 ms**; la consulta pasa de 264 ms a 0,02 ms.
- El workflow `medicion-catalogo` se repite solo cuando cambia el adaptador, así que una regresión se ve
  en el run.

**Negativas / riesgos asumidos**

- Cada publicación nueva actualiza tres índices más. Es despreciable con el ritmo de escritura de Recobra
  (el límite es 20 publicaciones por hora por cuenta, ADR-0028).
- Más espacio en disco y en el respaldo. Con 100.000 filas son pocos megabytes; queda dentro de RV-09.

## Qué revisaría esta decisión

- Que se pida buscar por **texto libre** en la descripción («audífonos negros»): los índices de igualdad
  no sirven y habría que evaluar la búsqueda de texto de PostgreSQL antes que un motor aparte.
- Que la medición con datos reales de producción pase de 400 ms con estos índices.

## Referencias

- [ADR-0008](0008-busqueda-con-filtros-en-el-repositorio.md), [ADR-0025](0025-diseno-de-cache-y-politica-de-invalidacion.md), [ADR-0012](0012-no-extraer-emparejamiento.md)
- [`medicion-catalogo.md`](../medicion-catalogo.md), [`scripts/medir-catalogo.js`](../../scripts/medir-catalogo.js), [`.github/workflows/medicion-catalogo.yml`](../../.github/workflows/medicion-catalogo.yml)
- Pregunta 2 de la [evaluación S16](https://github.com/ISCOUTB/AS_202620_feedback/blob/master/revisiones/2026-2/AS_202620_Recobra/semana-16-final.md#preguntas-de-sustentación)
