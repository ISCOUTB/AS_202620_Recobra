# Medición del escenario S1 — búsqueda con filtros (evidencia S9)

## Escenario ancla

- **Escenario:** [S1 — Rendimiento de búsqueda](calidad/escenarios_calidad.md#escenario-s1--rendimiento-de-búsqueda)
- **Umbral:** al menos el 95 % de las búsquedas responde en un máximo de
  400 ms (p95) con hasta 200 usuarios concurrentes.
- **Operación medida:** `GET /publicaciones?categoria=electronica&ubicacion=Bloque%20A1&limite=20`
  (decisión en [ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md)).

## Herramienta y procedimiento (reproducible)

[`scripts/measure-busqueda.js`](../scripts/measure-busqueda.js) usa
[`autocannon`](https://github.com/mcollina/autocannon) (carga HTTP
concurrente real: un bucle secuencial como `measure-post.js` no mide
concurrencia). Siembra publicaciones, abre 200 conexiones simultáneas
durante 15 s y reporta la distribución de latencias.

```bash
npm run build && node dist/main.js     # en una terminal
npm run measure:busqueda               # en otra (SEMBRAR, CONEXIONES, DURACION_S, BASE_URL)
```

Autocannon reporta p97,5 y no p95. Como p95 ≤ p97,5, exigir que **p97,5**
cumpla el umbral es una condición más estricta que la del escenario.

## Resultado 1 — local, adaptador en memoria (2026-10-04)

200 conexiones concurrentes, 15 s por corrida, 0 errores y 0 respuestas no
2xx en todas. **Cada corrida siembra 1000 publicaciones más en la misma
instancia**, así que las filas acumuladas crecen entre corridas:

| Corrida | Filas en el servidor | Peticiones/s | p50 | p97,5 | p99 | Máx. |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 1.000 | 5.860 | 33 ms | 43 ms | 46 ms | 74 ms |
| 2 | 2.000 | 4.819 | 41 ms | 53 ms | 58 ms | 62 ms |
| 3 | 3.000 | 3.836 | 51 ms | 67 ms | 71 ms | 89 ms |

**Cumple el umbral de 400 ms con p97,5 ≤ 67 ms** (margen ≥ 6×). La
latencia crece de forma lineal con las filas — consistente con el filtrado
O(n) del adaptador en memoria — y es la razón por la que ADR-0008 declara el
volumen que revisaría la decisión.

## Límites de esta medición (declarados, no ocultos)

- El generador de carga corre en la **misma máquina** que el servidor, así
  que comparten CPU: es una cota pesimista para el servidor, pero no incluye
  latencia de red.
- Este resultado es del **adaptador en memoria**. La consulta de PostgreSQL
  se verifica con prueba unitaria (parámetros, sin concatenación) y, abajo,
  con una medición contra el entorno desplegado.

## Trazabilidad

Aspecto **A6** en [`docs/aspectos.md`](aspectos.md) → S1 →
[ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md) →
`src/application/use-cases/buscar-publicaciones.ts`,
`src/infrastructure/persistence/` → `buscar-publicaciones.spec.ts`,
`test/publicaciones.e2e-spec.ts`, `test/contract.e2e-spec.ts` → esta
medición y [`docs/ia-auditoria-mutacion-busqueda.txt`](ia-auditoria-mutacion-busqueda.txt).
