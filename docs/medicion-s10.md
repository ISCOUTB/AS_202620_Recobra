# Experimento del segundo corte — S1 sobre el despliegue en Dokploy (evidencia S10)

## Escenario operativo

El docente indicó que el escenario del segundo corte es **uno de los que el
equipo ya tenía planeados** ([`docs/calidad/escenarios_calidad.md`](calidad/escenarios_calidad.md)).
El equipo eligió **S1, rendimiento de la búsqueda**, porque ya tenía
implementación ([ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md)),
una línea base y una brecha medida en producción
([`docs/medicion-busqueda.md`](medicion-busqueda.md)).

- **Umbral de S1:** al menos el 95 % de las búsquedas responde en ≤ 400 ms
  (p95) con hasta 200 usuarios concurrentes.
- **Pieza del sistema:** `GET /publicaciones` con filtros, sobre PostgreSQL.

## Hipótesis

> **H1.** Con la API y su base PostgreSQL desplegadas en Dokploy (servidor del
> laboratorio), la búsqueda con filtros sobre 1.000 publicaciones cumple S1:
> p97,5 ≤ 400 ms con 200 conexiones concurrentes y 0 errores. La brecha
> medida en Render Free (p97,5 = 1.113 ms con solo 20 conexiones) se debe a la
> capacidad de esa plataforma, no a la consulta ni al diseño.

Si H1 fuera falsa, el cuello estaría en la consulta SQL o en el diseño, y la
decisión correcta sería cambiar el código (por ejemplo, índices) y no la
plataforma.

## Montaje y variables

| Elemento | Valor |
|---|---|
| Sistema medido | `https://recobra.iscoutb.dev` (Dokploy), PostgreSQL del mismo proyecto, `DATABASE_SSL=false` |
| Commit desplegado | `a8068df` o posterior (ver `git log`) |
| Operación | `GET /publicaciones?categoria=carga-s10-electronica&ubicacion=Bloque%20A1&limite=20` |
| Datos | 1.000 publicaciones sembradas con la categoría `carga-s10-*`; cerca de 170 coinciden con el filtro, se devuelven 20 |
| Herramienta | [`scripts/measure-busqueda.js`](../scripts/measure-busqueda.js) (autocannon) |
| Variable independiente | Conexiones concurrentes: 20, 50, 100, 200 |
| Variable dependiente | Latencia de la respuesta (p50, p90, p97,5, p99, máx.), errores, peticiones/s |
| Controladas | Misma consulta, mismos datos, 15 s por nivel (10 s en el primero), mismo cliente |
| Métrica del servidor | `GET /metrics` → bloque `busqueda` (latencia medida dentro de la API, sin red) |

autocannon reporta p97,5 y no p95. Como p95 ≤ p97,5, exigir que p97,5 cumpla
el umbral es una condición **más estricta** que la del escenario.

## Línea base (estado inicial medido)

Medida el 2026-10-04 sobre Render Free + Neon, desde el mismo equipo cliente
([`docs/medicion-busqueda.md`](medicion-busqueda.md), resultado 2):

| Conexiones | p97,5 | ¿Cumple 400 ms? |
|---:|---:|:---:|
| 1 | 267 ms | sí |
| 5 | 274 ms | sí |
| 20 | **1.113 ms** | **no** |

## Resultado (Dokploy, 2026-10-08)

0 errores y 0 respuestas no 2xx en todos los niveles.

| Conexiones | Peticiones/s | p50 | p90 | p97,5 | p99 | Máx. | ¿Cumple 400 ms? |
|---:|---:|---:|---:|---:|---:|---:|:---:|
| 20 | 173 | 110 ms | 119 ms | 127 ms | 399 ms | 508 ms | sí |
| 50 | 427 | 110 ms | 118 ms | 125 ms | 134 ms | 2.754 ms | sí |
| 100 | 767 | 111 ms | 122 ms | 137 ms | 147 ms | 4.084 ms | sí |
| 200 | 1.337 | 118 ms | 135 ms | **157 ms** | 327 ms | 5.031 ms | **sí** |

**Contraste con el umbral:** con 200 conexiones el p97,5 es 157 ms, menos de
la mitad de los 400 ms. Con 20 conexiones, el mismo nivel que falló en
Render, el p97,5 pasó de 1.113 ms a 127 ms. **H1 se sostiene.**

**Dónde se va el tiempo (CPU, red o SQL).** La métrica del servidor, medida
dentro de la API tras la corrida de 200 conexiones, dio una media de 7,3 ms y
un p95 de 12,8 ms. El p50 que ve el cliente es de ~110 ms, y no cambia entre
20 y 200 conexiones. La diferencia (~100 ms) es red entre el cliente y el
servidor; la consulta SQL y el proceso no son el cuello a este volumen. Esto
respalda **no modificar la consulta** por ahora.

## Factores de confusión y límites de validez

- **La plataforma no fue la única diferencia con la línea base.** La medición
  en Render se hizo con 1 fila en la base; la de Dokploy, con 1.000. Esto
  juega en contra de Dokploy (más datos) y a pesar de ello mejoró, pero no es
  una comparación controlada. No se pudo repetir en Render con el mismo
  volumen: el 2026-10-08 ese servicio respondía 503.
- **Una sola corrida por nivel.** No se calcularon intervalos de confianza.
- **El cliente está fuera de la red del servidor**, así que las cifras
  incluyen ~110 ms de red. Es una cota pesimista para el servidor.
- **El servidor del laboratorio es compartido**: la carga de otros servicios
  en ese momento no se controló.
- **Máximos de 2,7 a 5 s** en los niveles de 50 a 200 conexiones: probablemente
  se deban al establecimiento de las conexiones TLS al inicio de la corrida
  (hipótesis, no verificada); no afectan al p97,5 pero conviene vigilarlos.
- **Volumen:** 1.000 filas. No se midió la carga de ruptura ni volúmenes
  mayores; el escenario no los exige.
- **Disponibilidad durante un redespliegue:** en los redespliegues observados
  el dominio respondió 404 entre ~30 y ~50 s. No hay actualización sin corte.

## Procedimiento reproducible

```bash
BASE_URL=https://recobra.iscoutb.dev PREFIJO_CATEGORIA=carga-s10- \
  SEMBRAR=1000 CONEXIONES=20 DURACION_S=10 node scripts/measure-busqueda.js
for c in 50 100 200; do
  BASE_URL=https://recobra.iscoutb.dev PREFIJO_CATEGORIA=carga-s10- \
    SEMBRAR=0 CONEXIONES=$c DURACION_S=15 node scripts/measure-busqueda.js
done
curl -s https://recobra.iscoutb.dev/metrics   # bloque "busqueda": p95 del servidor
```

Para retirar los datos sembrados (en el terminal de la base en Dokploy):

```sql
DELETE FROM publicaciones WHERE categoria LIKE 'carga-s10-%';
```

## Persistencia verificada tras un redespliegue

Con `DATABASE_URL` apuntando al PostgreSQL de Dokploy, se creó una
publicación marcador (categoría `verificacion-s10`, id `16f789ce…`, creada el
2026-10-08 a las 22:22 UTC) y se provocó un redespliegue con el commit
`9560cc0`. Al volver el dominio, `GET /publicaciones?categoria=verificacion-s10`
devolvió la misma publicación y `/health/ready` respondió
`{"status":"ok","almacenamiento":"postgres"}`. Los datos sobreviven a un
redespliegue. Durante ese redespliegue el dominio respondió 404 durante unos
26 a 34 segundos (sondeo cada ~8 s).

## Costo

La alternativa elegida cuesta **$0/mes** para el equipo. La alternativa de
pago equivalente en Render (Starter) costaría USD 7/mes solo por la API
([`docs/despliegue/costo-mensual.md`](despliegue/costo-mensual.md)), sin una
medición que garantice cerrar la brecha. La carga a la que deja de bastar el
servidor del laboratorio **no se midió**.

## Trazabilidad

Aspecto A6 en [`docs/aspectos.md`](aspectos.md) → escenario S1 →
[ADR-0010](adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md) (y
[ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md)) →
`deploy/compose.lab.yaml`, `src/observabilidad/` (métrica de búsqueda),
`src/salud/` (`/health/ready`) → `test/almacenamiento-no-disponible.e2e-spec.ts`,
`src/observabilidad/metricas.service.spec.ts` → esta medición.
