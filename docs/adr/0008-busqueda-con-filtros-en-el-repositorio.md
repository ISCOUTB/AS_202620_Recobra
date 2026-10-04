# ADR-0008: Búsqueda con filtros resuelta en el repositorio, con límite acotado

## Estado

Aceptada — 2026-10-04. Evidencia S9: es la porción nueva del sistema
construida con apoyo de IA dentro de la semana 9 (código, prueba de
mutación, medición y auditoría en
[`docs/auditoria-generacion-ia.md`](../auditoria-generacion-ia.md)). No
modifica ningún ADR anterior.

## Contexto

El escenario S1 (búsqueda, prioridad Alta) pide que al menos el 95 % de las
búsquedas con filtros de categoría y ubicación responda en un máximo de
400 ms (p95) con hasta 200 usuarios concurrentes. Hasta hoy Recobra solo
podía consultar una publicación por su id: no existía ninguna búsqueda, así
que el escenario ancla del producto no tenía implementación ni medida.

La decisión de diseño es **dónde se filtra**: el equipo debe poder cambiar
el adaptador de persistencia sin tocar el dominio (ADR-0002), pero la
búsqueda toca una restricción real — con PostgreSQL (ADR-0006) filtrar
fuera de la base de datos obliga a traer filas que luego se descartan.

## Alternativas consideradas

### A. Filtrar en el repositorio, con límite acotado (elegida)

El puerto `PublicacionRepository` gana un método `buscar(filtros)`; cada
adaptador lo resuelve a su manera (filtro en memoria; `WHERE` parametrizado
con `LIMIT` en PostgreSQL). El caso de uso `BuscarPublicaciones` valida la
entrada (tipo conocido, `limite` entero entre 1 y 50, 20 por defecto).

- **A favor:** el filtrado ocurre donde están los datos, el límite acota el
  tamaño de la respuesta, y el dominio y el caso de uso no cambian al
  migrar de memoria a PostgreSQL (ya demostrado para `guardar` en ADR-0006).
- **En contra:** hay que implementar y probar el filtro dos veces (una por
  adaptador) y mantenerlos coherentes.

### B. Traer todo con `listarPorTipo` y filtrar en la capa de aplicación (descartada)

- **A favor:** un solo punto de filtrado, sin tocar el puerto.
- **En contra:** con PostgreSQL traería la tabla entera en cada búsqueda;
  el costo crece con el total de publicaciones y no con el tamaño del
  resultado, justo lo contrario de lo que el escenario S1 exige bajo 200
  usuarios concurrentes.

### C. Motor de búsqueda externo (Elasticsearch, Meilisearch) (descartada)

- **A favor:** búsqueda de texto completo y tolerancia a errores de
  escritura.
- **En contra:** una pieza nueva de infraestructura que hoy no cabe en el
  límite de costo de $0/mes sin tarjeta (arc42, sección 2) ni se justifica
  con filtros exactos sobre dos campos; el escenario S1 no pide búsqueda de
  texto libre.

## Decisión

Se adopta la alternativa A. Los filtros son de **igualdad exacta**, sin
distinguir mayúsculas ni espacios de borde, sobre `tipo`, `categoria` y
`ubicacion`; el orden es el más reciente primero. En PostgreSQL la consulta
es **fija y parametrizada** (los valores del usuario viajan solo como
parámetros, nunca concatenados al SQL) y se crea un índice por `creado_en`
para el orden. La API se expone como `GET /publicaciones` y entra al
contrato OpenAPI en la versión 2.1.0 (cambio compatible).

## Consecuencias

**Positivas**

- Escenario S1 con implementación y medida reproducible (ver
  [`docs/medicion-busqueda.md`](../medicion-busqueda.md)).
- La entrada se valida en un único lugar y un límite máximo impide
  respuestas ilimitadas.
- La consulta parametrizada elimina la inyección SQL por construcción.

**Negativas / riesgos asumidos**

- Los filtros exactos no encuentran "mochila" si se publicó "mochilas": la
  categoría y la ubicación vienen de listas cerradas en la app, pero el
  texto libre ("Otro…") queda fuera de una coincidencia aproximada.
- La consulta fija (`$n IS NULL OR …`) no aprovecha un índice por
  categoría o ubicación; con el volumen del escenario es suficiente, pero no
  escalaría indefinidamente (ver abajo).

## Qué revisaría esta decisión

- **Dato que la haría revisar:** que la medición en el entorno desplegado
  (Render + Neon) muestre un p95 por encima de 400 ms, o que la tabla
  supere el orden de cientos de miles de filas — el punto en que un índice
  compuesto por `lower(categoria)` y `lower(ubicacion)`, o un motor de
  búsqueda (alternativa C), pasan a justificarse.
- **Costo de reversión aceptado:** bajo — el contrato del puerto
  (`buscar(filtros)`) no cambia al sustituir la consulta o el motor; solo
  se reescribe el adaptador afectado.

## Referencias

- [`docs/medicion-busqueda.md`](../medicion-busqueda.md)
- [`docs/auditoria-generacion-ia.md`](../auditoria-generacion-ia.md)
- [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml)
- [ADR-0002](0002-arquitectura-y-stack.md), [ADR-0006](0006-plataforma-persistencia-postgresql.md)
- Escenario S1 en [`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md)
