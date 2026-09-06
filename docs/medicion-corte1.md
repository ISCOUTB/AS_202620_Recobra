# Medición del reto de corte 1

## Escenario ancla

- **Escenario:** [S5 — Mantenibilidad](escenarios_calidad.md#escenario-s5--mantenibilidad)
- **Umbral del escenario:** el cambio se implementa sin romper las pruebas
  existentes; el dominio no se reescribe.
- **Operación de servicio asociada al corte vertical:** `POST /publicaciones`
  (crear publicación de extremo a extremo).

## Restricción del reto

Stack obligatorio del curso: backend NestJS **o** FastAPI; frontend Flutter
**o** NextJS. Ver [ADR-0003](adr/0003-reto-corte1-stack-obligatorio.md).

## Línea base (antes del cambio)

Estado de referencia: backend Express hexagonal previo a la migración NestJS
(commit de línea base del corte vertical con `src/server.js` y pruebas en
`tests/`).

| Métrica | Herramienta / procedimiento | Resultado línea base |
|---------|-----------------------------|----------------------|
| Pruebas del dominio y del corte | `node --test` / suite Express del vertical slice | Verde sobre Express |
| Framework del contenedor API | Inspección de `package.json` + `src/server.js` | Express (fuera del stack permitido) |
| Cliente móvil | Árbol del repo | Ausente (solo C4 lo nombraba) |
| Latencia `POST /publicaciones` (p95, N=50, local) | `node src/server.js` en el commit `905f546` (Express, pre-migración), reproducido en un worktree aislado con `measure-post.js` copiado del corte 1; ver salida cruda abajo | **p95 = 0.54–1.00 ms** (p50 ≈ 0.28–0.32 ms) en 2 corridas estables tras el arranque en frío |

Procedimiento de latencia (reproducible):

1. Levantar el backend en `http://localhost:3000` (commit `905f546`: `node src/server.js`; commit actual: `npm run start`).
2. Ejecutar `npm run measure:post` (50 iteraciones de `POST /publicaciones`).
3. Reportar p50 y p95 en milisegundos.

Salida cruda (línea base, commit `905f546`, 2026-09-05, reproducida en worktree local):

```jsonc
// Corrida 1 (arranque en frío, primer request paga JIT/carga de módulos — se excluye del p95 reportado)
{ "n": 50, "avgMs": 3.11, "p50Ms": 0.32, "p95Ms": 1,    "minMs": 0.24, "maxMs": 135.31 }
// Corrida 2 (estable)
{ "n": 50, "avgMs": 0.43, "p50Ms": 0.28, "p95Ms": 0.65, "minMs": 0.23, "maxMs": 4.73 }
// Corrida 3 (estable)
{ "n": 50, "avgMs": 0.41, "p50Ms": 0.29, "p95Ms": 0.54, "minMs": 0.23, "maxMs": 4.7 }
```

La cifra "~8–15 ms" de una versión anterior de este documento era una estimación sin
corrida registrada; se reemplaza por la medición reproducible de arriba. La línea
base de Express resulta más rápida que la implementación NestJS de abajo (esperable:
menos capas de framework en memoria, sin overhead de Nest/reflection), pero ambas
cumplen ampliamente el umbral del escenario S5 (no romper pruebas, no reescribir el
dominio) y el objetivo local de 100 ms — la comparación de latencia es informativa,
no el criterio de aceptación de este reto.

## Cambio aplicado

- Migración del composition root y del adaptador HTTP a **NestJS**.
- Conservación de `domain/` y `application/` (mismas reglas de `Publicacion`).
- Cliente **Flutter** en `mobile/` consumiendo la API.
- CI en `.github/workflows/ci.yml`.

## Resultado (después del cambio)

| Métrica | Herramienta / procedimiento | Resultado | ¿Cumple umbral? |
|---------|-----------------------------|-----------|-----------------|
| Pruebas unitarias del dominio/casos de uso | `npm test` | Verde | Sí (S5) |
| Pruebas e2e del corte vertical | `npm run test:e2e` | Verde | Sí (S5) |
| Framework del contenedor API | `package.json` + `src/main.ts` | NestJS (permitido) | Sí (restricción) |
| Cliente móvil | `mobile/pubspec.yaml` + `flutter test` | Presente | Sí (restricción) |
| Latencia `POST /publicaciones` (p95, N=50) | `npm run measure:post` con NestJS (2026-09-05, local) | **p95 = 2.02 ms** (p50 = 0.67 ms, avg = 1.30 ms) | Sí — muy por debajo del objetivo local de 100 ms |
| Archivos de dominio reescritos por el cambio de framework | Diff `src/domain/**` | Reglas de validación intactas; solo tipado TS | Sí (S5) |

## Cómo reproducir

```bash
# Backend
npm install
npm test
npm run test:e2e
npm run start   # en otra terminal
npm run measure:post

# Cliente Flutter
cd mobile
flutter pub get
flutter test
```

## Trazabilidad

Aspecto **A2** en [aspectos.md](aspectos.md) → S5 → C4 API NestJS →
ADR-0002 / ADR-0003 → código Nest + Flutter → pruebas → esta medición.
