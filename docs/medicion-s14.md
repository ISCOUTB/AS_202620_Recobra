# Medición S14 — S1 contrastado con su umbral en el entorno vigente

## Qué se mide y contra qué

- **Escenario:** S1, rendimiento de la búsqueda ([`escenarios_calidad.md`](calidad/escenarios_calidad.md)).
- **Umbral:** al menos el 95 % de las búsquedas responde en **≤ 400 ms (p95)** con hasta
  **200 usuarios concurrentes**.
- **Pieza del sistema:** `GET /publicaciones` con filtros, sobre PostgreSQL
  ([ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md)).
- **Por qué repetirla:** desde la medición S10 (2026-10-08, [`medicion-s10.md`](medicion-s10.md))
  entraron al camino de cada petición los cambios de S11 a S13: cabeceras de seguridad y CSP
  ([ADR-0029](adr/0029-cabeceras-de-seguridad-csp-y-cors.md)), el guardia de límites de uso
  ([ADR-0028](adr/0028-limites-de-uso-por-cuenta-y-por-origen.md)), ETag en la búsqueda
  ([ADR-0025](adr/0025-diseno-de-cache-y-politica-de-invalidacion.md)) y Cloudflare delante del
  dominio. Hay que comprobar que S1 se sigue cumpliendo con todo eso puesto.

## Montaje

| Elemento | Valor |
|---|---|
| Sistema medido | `https://recobra.iscoutb.dev` (Dokploy), PostgreSQL del mismo proyecto |
| Commit desplegado | `0dda9ab`, el HEAD de `master` en el remoto al medir (cada commit a `master` redespliega solo; no se confirmó en el panel de Dokploy) |
| Fecha y ventana | 2026-11-08, de 18:34:26 a 18:35:25 UTC |
| Operación | `GET /publicaciones?categoria=electronica&ubicacion=Bloque%20A1&limite=20` |
| Datos | Los reales de producción: **2 publicaciones activas**; el filtro devuelve 0 (cuerpo `[]`) |
| Herramienta | [`scripts/measure-busqueda.js`](../scripts/measure-busqueda.js) (autocannon), con `SEMBRAR=0` |
| Variable independiente | Conexiones concurrentes: 20, 50, 100, 200 |
| Variable dependiente | Latencia (p50, p90, p97,5, p99, máx.), errores, peticiones/s |
| Controladas | Misma consulta, mismo cliente, 10 s en el primer nivel y 15 s en los demás (igual que S10) |
| Métrica del servidor | `GET /metrics` → bloque `busqueda` |

**Por qué solo lectura y sin sembrar.** En S10 se sembraron 1.000 publicaciones. Hoy no se puede ni
conviene hacerlo:

1. La regla `publicar` permite 20 publicaciones por hora y por cuenta (ADR-0028). Para sembrar 1.000
   habría que abrir unas 50 cuentas, es decir, saltarse a propósito el control que se acaba de poner.
2. Cada publicación sembrada pasa por Emparejamiento y podría avisar de una coincidencia falsa a una
   persona real (ADR-0015, ADR-0018).
3. Los datos de S10 ya se borraron (`carga-s10-*` devuelve 0).

autocannon reporta p97,5 y no p95. Como p95 ≤ p97,5, exigir que el p97,5 cumpla el umbral es una
condición **más estricta** que la del escenario.

**Salidas originales:** [`docs/evidencia/medicion-s14-dokploy.json`](evidencia/medicion-s14-dokploy.json).

## Resultado (2026-11-08)

0 errores y 0 respuestas no 2xx en todos los niveles (43.465 respuestas en total). Ninguna regla de
límite de uso se activó (`seguridad.limitesExcedidos` vacío): las búsquedas no tienen límite.

| Conexiones | Peticiones/s | p50 | p90 | p97,5 | p99 | Máx. | Umbral 400 ms | Margen |
|---:|---:|---:|---:|---:|---:|---:|:---:|---:|
| 20 | 176 | 105 ms | 118 ms | 149 ms | 390 ms | 465 ms | **cumple** | 251 ms |
| 50 | 445 | 105 ms | 122 ms | 151 ms | 222 ms | 611 ms | **cumple** | 249 ms |
| 100 | 846 | 107 ms | 131 ms | 173 ms | 238 ms | 1.113 ms | **cumple** | 227 ms |
| 200 | 1.490 | 119 ms | 160 ms | **203 ms** | 227 ms | 1.830 ms | **cumple** | **197 ms** |

### Contraste con el umbral

**S1 se cumple.** Con 200 conexiones, el nivel que exige el escenario, el p97,5 es **203 ms**, es decir,
el 51 % del umbral, con un margen de 197 ms. Como el p97,5 ya está por debajo de 400 ms, el p95 también
lo está. El servidor midió, dentro de la API y sin red, un p95 de **28,7 ms** sobre sus últimas 200
búsquedas.

### Contraste con S10

| Indicador (200 conexiones) | S10 (2026-10-08) | S14 (2026-11-08) | Cambio |
|---|---:|---:|---:|
| p97,5 del cliente | 157 ms | 203 ms | +46 ms (+29 %) |
| p90 del cliente | 135 ms | 160 ms | +25 ms |
| p50 del cliente | 118 ms | 119 ms | ≈ igual |
| Máximo | 5.031 ms | 1.830 ms | −3.201 ms |
| Peticiones/s | 1.337 | 1.490 | +11 % |
| p95 dentro de la API (`/metrics`) | 12,8 ms | 28,7 ms | ×2,2 |
| Media dentro de la API (`/metrics`) | 7,3 ms | 21,7 ms | ×3 |
| Publicaciones en la base / devueltas | 1.000 / 20 | 2 / 0 | — |

Lo que se puede afirmar:

- **El margen sigue siendo amplio, pero se redujo.** La cola (p90 y p97,5) subió con 200 conexiones,
  aunque la mediana no cambió.
- **Dentro de la API, la búsqueda tarda el triple que en S10**, y eso pasa con una base casi vacía y
  una respuesta vacía. Por eso el aumento no viene del volumen de datos. **Hipótesis, no verificada:**
  el trabajo que se agregó por petición entre S11 y S13 (guardia de límites, cabeceras y CSP, cálculo
  del ETag, resolución del origen detrás del proxy) o la carga de otros servicios en el servidor
  compartido. Para separarlas habría que medir el mismo commit con y sin esas capas.
- **Los máximos bajaron** de 2,7–5 s a 0,6–1,8 s. En S10 se atribuían, sin verificarlo, al
  establecimiento de conexiones TLS. Ahora Cloudflare termina el TLS cerca del cliente, lo que
  coincide con esa explicación sin demostrarla.

## Factores de confusión y límites de validez

- **El volumen no es comparable con S10.** Hay 2 publicaciones en vez de 1.000, y la respuesta es
  `[]` en vez de 20 resultados. Esto favorece a S14 en cuanto al trabajo de la consulta y al tamaño
  del cuerpo. **La conclusión vale para el volumen actual de producción, no para 1.000 filas.** La
  medición S10 sigue siendo la evidencia para 1.000.
- **Varias cosas cambiaron a la vez:** el código (S11 a S13), Cloudflare delante del dominio y el
  momento de la medición. La diferencia con S10 no se puede atribuir a una sola causa.
- **Una sola corrida por nivel**, sin intervalos de confianza.
- **El cliente está fuera de la red del servidor**, así que las cifras incluyen la red (unos 100 ms
  de p50). Es una cota pesimista para el servidor.
- **El servidor del laboratorio es compartido** y su carga no se controló.
- **La ventana de `/metrics`** es de las últimas 200 búsquedas, no de toda la corrida. Su p95 y el
  del cliente no se restan para estimar la red (mismo cuidado que en S10).

## Qué se decide

- **No se cambia el código.** S1 se cumple con un margen de 197 ms en el entorno real y con todos los
  controles de seguridad activos.
- **Queda como deuda** (arc42 §11.2): repetir S1 con volumen (1.000 publicaciones o más) sin sembrar
  por la API de producción. Por ejemplo, con una copia de la base restaurada (el procedimiento de
  [`respaldos.md`](despliegue/respaldos.md)) o con una siembra directa por SQL en un entorno aparte.
  También queda sin explicar por qué la latencia interna se triplicó.

## Procedimiento reproducible

Solo lectura: no crea cuentas ni publicaciones.

```bash
npm ci --ignore-scripts
BASE_URL=https://recobra.iscoutb.dev SEMBRAR=0 CONEXIONES=20 DURACION_S=10 node scripts/measure-busqueda.js
for c in 50 100 200; do
  BASE_URL=https://recobra.iscoutb.dev SEMBRAR=0 CONEXIONES=$c DURACION_S=15 node scripts/measure-busqueda.js
done
curl -s https://recobra.iscoutb.dev/metrics   # bloque "busqueda": p95 del servidor
```

## Trazabilidad

Aspecto A6 en [`docs/aspectos.md`](aspectos.md) → escenario S1 →
[ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md),
[ADR-0010](adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md) → `src/observabilidad/`
(métrica de búsqueda) → [`medicion-s10.md`](medicion-s10.md) (línea base con 1.000 filas) → esta
medición.
