# Medición del escenario S3 — Emparejamiento (evidencia S9)

## Escenario ancla

- **Escenario:** [S3 — Notificación de coincidencia](calidad/escenarios_calidad.md#escenario-s3--notificación-de-coincidencia)
- **Umbral del escenario:** el 95 % de las coincidencias que superen el
  umbral debe **notificarse** en un máximo de 60 segundos tras detectarse.
- **Alcance real de lo medido:** Notificaciones todavía no existe como
  componente (ver `docs/context-map.md` — sigue "planeado"). Lo que se mide
  aquí es el tramo que sí está implementado y es la parte crítica de la
  latencia total: el tiempo entre que se crea la publicación que completa
  una coincidencia y que esa coincidencia queda **detectada y consultable**
  (`GET /coincidencias`). Cuando Notificaciones exista, se le sumará su
  propio tiempo de envío; lo que aquí se demuestra es que la detección en sí
  no es el cuello de botella frente al umbral de 60 s.

## Procedimiento (reproducible)

```bash
npm run start                      # en una terminal
npm run measure:emparejamiento     # en otra
```

[`scripts/measure-emparejamiento.js`](../scripts/measure-emparejamiento.js):
crea una publicación "perdido", luego una "encontrado" de la misma
categoría y ubicación (coincidencia garantizada), y mide desde el `POST` de
la segunda hasta que `GET /coincidencias` devuelve el resultado —
reintentando cada 5 ms, sin esperar un tiempo fijo.

## Resultado (2026-10-01, 3 corridas locales)

| Corrida | Latencia de detección |
|---|---|
| 1 | 2.89 ms |
| 2 | 1.73 ms |
| 3 | 1.63 ms |

**Cumple el umbral de 60.000 ms con un margen de ~20.000×.** No es
casualidad: el evento `publicacion.creada` (ADR-0004) se procesa en el
mismo proceso, en memoria, sin red ni cola externa de por medio — es la
consecuencia directa y medida de haber elegido un bus de eventos en
proceso para esta pieza en vez de una integración remota.

## Trazabilidad

Aspecto **A5** en [`docs/aspectos.md`](aspectos.md) → S3 → [ADR-0004](adr/0004-integracion-sincrona-vs-asincrona.md)
→ `src/emparejamiento/`, `src/application/use-cases/buscar-coincidencias.ts`
→ `buscar-coincidencias.spec.ts`, `test/emparejamiento.e2e-spec.ts` → esta
medición.
