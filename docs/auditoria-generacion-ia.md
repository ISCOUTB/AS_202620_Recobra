# Auditoría de generación con IA (evidencia S9)

Cubre los barridos que pide la ficha de S9. Las secciones 1-5 son sobre la
primera porción (Emparejamiento y PostgreSQL); la segunda porción, construida
dentro de la semana 9, está a partir de la sección 6.

Primera porción: Emparejamiento + persistencia PostgreSQL
(`src/emparejamiento/`, `src/application/use-cases/buscar-coincidencias.ts`,
`src/infrastructure/persistence/postgres-publicacion.repository.ts`).

## 1. Auditoría de erosión (límites de contexto y propiedad de datos, S6)

Comando ejecutado sobre `HEAD`, excluyendo `docs/` y `node_modules/`:

```bash
git grep -nIE '(INSERT INTO|UPDATE |\.save\(|\.create\(|repository\.)' HEAD -- . ':!docs' ':!node_modules'
```

**Resultado:** un único `INSERT INTO publicaciones`, en
`src/infrastructure/persistence/postgres-publicacion.repository.ts` — el
adaptador propio del contexto **Publicaciones**, el dueño único de ese dato
según [`docs/modulo-datos.md`](modulo-datos.md). Ninguna escritura sobre
`publicaciones` aparece en `src/emparejamiento/` ni en
`buscar-coincidencias.ts`.

Revisión manual de `buscar-coincidencias.ts`: importa `Publicacion` (el
tipo) y `PublicacionRepository` (el puerto), y solo llama a
`publicacionRepository.listarPorTipo(...)` — una lectura a través del
puerto, nunca una escritura directa. Coincide exactamente con la regla
documentada en `docs/context-map.md`: *"Emparejamiento consume
publicaciones a través del puerto PublicacionRepository [...], nunca
escribe directamente sobre los datos de Publicaciones."*

**Conclusión: sin erosión.** La generación con IA de este módulo respetó el
límite de contexto y la regla de dueño único de datos sin que hiciera falta
corregir nada después — se diseñó la auditoría antes de aceptar el código,
no después (ver `docs/ia.md`, entrada de la semana de Emparejamiento).

## 2. Dependencias propuestas por el modelo, verificadas

Dependencias añadidas en el período de Emparejamiento/Postgres/contrato
(`git diff` sobre `package.json` entre el estado de S6 y HEAD):

| Paquete | ¿Existe en el registro? | Mantenedor / repositorio | Descargas último mes | Antigüedad |
|---|---|---|---|---|
| `pg` | Sí | `github.com/brianc/node-postgres` (el driver canónico de PostgreSQL para Node) | 221.383.203 | Publicado 2010-12-19 |
| `@types/pg` | Sí | DefinitelyTyped (registro oficial de tipos de la comunidad TS) | — | — |
| `@nestjs/event-emitter` | Sí | `github.com/nestjs/events` (organización oficial de NestJS) | 8.995.791 | — |
| `jest-openapi` | Sí | `github.com/RuntimeTools/OpenAPIValidators` | 438.078 | — |

Verificado con la API pública del registro de npm (sin autenticación):

```bash
curl -s "https://registry.npmjs.org/pg" | grep -o '"repository":{[^}]*}'
curl -s "https://api.npmjs.org/downloads/point/last-month/pg"
```

**Conclusión: las cuatro dependencias son legítimas**, de mantenedores
reconocibles y con volumen de descargas que descarta un paquete inventado
por el modelo y registrado después por un tercero (el riesgo que esta
semana estudia). Ninguna se agregó a ciegas: `pg` y `@types/pg` porque
ADR-0006 ya había decidido PostgreSQL; `@nestjs/event-emitter` porque
ADR-0004 ya exigía un bus de eventos en proceso; `jest-openapi` porque ya
estaba en uso desde S7 para la prueba de contrato.

## 3. Credenciales en código, ejemplos y documentación generada

```bash
git grep -inE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{12,}" -- . ':!node_modules' ':!package-lock.json'
```

**Resultado: sin coincidencias** en código, `docs/`, ni archivos de
ejemplo. `.env.example` solo declara las claves (`PORT`, `DATABASE_URL`)
sin valores — ver [`.env.example`](../.env.example). El único secreto que
alguna vez apareció en el historial (`node_modules/debug/.coveralls.yml`)
ya está investigado y cerrado como un artefacto ajeno al equipo, no un
secreto propio (ver [`docs/no-conformidades.md`](no-conformidades.md#1-token-de-coveralls-expuesto-en-el-historial-de-git)).

## 4. Prueba que falla ante el defecto que cubre

Evidencia de mutación real (no solo afirmada): se invirtió a propósito la
condición de categoría en `buscar-coincidencias.ts` (`!==` → `===`), se
corrieron las pruebas, 3 de 4 fallaron con el mensaje exacto del defecto
introducido, y se revirtió. Salida completa capturada en
[`docs/ia-auditoria-mutacion-emparejamiento.txt`](ia-auditoria-mutacion-emparejamiento.txt).

## 5. Medición del escenario asociado

Ver [`docs/medicion-emparejamiento.md`](medicion-emparejamiento.md) — S3,
umbral 60.000 ms, resultado medido ~1.6-2.9 ms.

---

# Segunda porción: búsqueda con filtros (construida dentro de S9)

La revisión preliminar de S9 señaló con razón que Emparejamiento y PostgreSQL
(secciones 1-5 de arriba) nacieron en el commit `e952f5b`, antes de la línea
base de S8 (`5c7f77b`). Para tener una porción **íntegramente construida
dentro de la semana**, se construyó la búsqueda con filtros del escenario S1,
que no existía. Cadena completa: aspecto
[A6](aspectos.md) → [S1](calidad/escenarios_calidad.md#escenario-s1--rendimiento-de-búsqueda)
→ [ADR-0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md) →
`src/application/use-cases/buscar-publicaciones.ts` y `buscar()` en los dos
adaptadores → `buscar-publicaciones.spec.ts`, `test/publicaciones.e2e-spec.ts`,
`test/contract.e2e-spec.ts` → [medición](medicion-busqueda.md).

## 6. Erosión

```bash
grep -rn "\.buscar(" src | grep -v spec
grep -rnE "(INSERT INTO|UPDATE |\.save\(|\.create\()" src --include=*.ts | grep -v spec | grep -v "NestFactory.create"
```

- `buscar()` solo la invoca `BuscarPublicaciones`: ningún otro contexto lo
  usa (Emparejamiento sigue leyendo con `listarPorTipo`).
- El único `INSERT` del código sigue siendo el de `guardar()` en el adaptador
  de **Publicaciones**, el dueño único del dato (`docs/modulo-datos.md`). La
  búsqueda es de solo lectura y no agrega ninguna escritura.
- El caso de uso importa solo el dominio y el puerto, no un adaptador.

**Conclusión: sin erosión** en la segunda porción.

## 7. Dependencias propuestas en el período

```bash
git diff 5c7f77b -- package.json | grep -E '^\+ ' | grep -v '^+++'
```

Desde la línea base de S8 solo se agregó **`autocannon`** (devDependency):
herramienta de carga HTTP concurrente que necesita la medición de S1 (200
usuarios simultáneos; el script secuencial anterior no mide concurrencia).

| Paquete | Registro de npm | Repositorio | Descargas último mes | Antigüedad |
|---|---|---|---|---|
| `autocannon` | existe, licencia MIT | `github.com/mcollina/autocannon` (Matteo Collina, miembro del comité técnico de Node.js) | 4.084.184 | Publicado 2016-03-31 |

```bash
curl -s "https://registry.npmjs.org/autocannon" | grep -o '"repository":{[^}]*}'
curl -s "https://api.npmjs.org/downloads/point/last-month/autocannon"
```

Se verificó antes de instalarlo, no después.

## 8. Credenciales

Mismo barrido que la sección 3, repetido tras agregar esta porción:
**sin coincidencias** en código, `docs/` ni ejemplos.

## 9. Prueba que falla ante el defecto, y lo que reveló

Se invirtió a propósito el filtro de categoría en
`MemoriaPublicacionRepository.buscar` (`===` → `!==`). La **primera**
corrida mostró que la prueba unitaria fallaba (1 de 10) pero la prueba e2e
**seguía en verde**: era débil, porque otra publicación "encontrado" de otra
categoría, creada por otro test, hacía que el conteo diera 1 por casualidad.
Se reforzó el e2e (publicación de ruido de otra categoría y comprobación del
id exacto) y se repitió: ahora **fallan las dos** (1 de 10 y 1 de 7) y, al
revertir, pasan todas. Salida completa en
[`docs/ia-auditoria-mutacion-busqueda.txt`](ia-auditoria-mutacion-busqueda.txt).
La mutación no solo comprobó una prueba: corrigió una que parecía buena.
