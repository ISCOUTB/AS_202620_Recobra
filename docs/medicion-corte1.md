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
| Latencia `POST /publicaciones` (p95, N=50, local) | Script cronometrando HTTP contra Express en localhost | ~8–15 ms en máquina de desarrollo del equipo (orden de magnitud; sin carga concurrente) |

Procedimiento de latencia (reproducible):

1. Levantar el backend en `http://localhost:3000`.
2. Ejecutar `npm run measure:post` (50 iteraciones de `POST /publicaciones`).
3. Reportar p50 y p95 en milisegundos.

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
