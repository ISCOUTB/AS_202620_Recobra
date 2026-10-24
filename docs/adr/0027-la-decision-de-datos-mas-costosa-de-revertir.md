# ADR-0027: La decisión de datos más costosa de revertir

## Estado

Aceptada — 2026-10-21. Responde al pedido de la semana 12 (ADR de la decisión
de datos más costosa de revertir, con su argumento). No introduce una decisión
nueva: **designa, compara y justifica** cuál de las ya tomadas lo es, y qué se
hace para que cueste menos.

## Contexto

Recobra tomó varias decisiones sobre sus datos. Todas se pueden defender; no
todas cuestan lo mismo si hay que deshacerlas. Llamar "la más costosa" a una
cualquiera no sirve: hay que compararlas con el mismo criterio.

**Criterio de costo de reversión.** Se mide con cuatro preguntas sobre volver a
la alternativa que se descartó:

1. **Alcance:** ¿cuánto código y cuántas tablas hay que tocar? (medido en el repositorio)
2. **Datos:** ¿hay que mover datos reales de personas, y se pueden perder?
3. **Silencio del error:** si la reversión sale mal, ¿falla con ruido (una prueba
   roja, un error 500) o en silencio (duplicados, estados incoherentes)?
4. **Ventana:** ¿exige detener el servicio?

## Decisiones comparadas

Cifras medidas sobre el commit de esta fecha: 10 puertos de persistencia
(`src/domain/ports`), **9 adaptadores PostgreSQL** (`postgres-*.repository.ts`,
~970 líneas), **9 tablas**, 8 inserciones con `ON CONFLICT`, 3 actualizaciones
condicionales de estado, 1 índice único de negocio, **0 claves foráneas** y
**0 transacciones** (`git grep` de `BEGIN|COMMIT|transaction` sobre `src/`
no encuentra nada).

| # | Decisión | Qué implicaría revertirla | Alcance (medido) | Datos | Falla en silencio | Ventana | Costo |
|---|---|---|---|---|---|---|---|
| D1 | **PostgreSQL como único almacén, y la consistencia apoyada en escrituras atómicas de una sola sentencia** (ADR-0006, ADR-0010, ADR-0020) | Cambiar de motor o de modelo: reescribir los adaptadores y **reconstruir en el motor nuevo** las garantías que hoy da PostgreSQL | **9 de 9** adaptadores, **9 de 9** tablas, ~970 líneas de SQL | **Todos** los datos reales de personas (cuentas, sesiones, publicaciones, reclamaciones…) | **Sí** (ver abajo) | Sí, para migrar | **Alto** |
| D2 | Anonimizar en vez de borrar (ADR-0021) | Pasar a borrado físico: borrar filas. Volver a conservar datos: imposible para lo ya anonimizado | 1 caso de uso + 3 métodos de adaptador | Solo las cuentas que pidieron eliminarse | No | No | Bajo hacia adelante; **no hay vuelta atrás** para lo ya anonimizado (es intencional) |
| D3 | Una base compartida con tablas de dueño único, **sin claves foráneas ni transacciones entre contextos** (`modulo-datos.md`, ADR-0020) | Agregar transacciones entre contextos, o separar una base por contexto | 4 casos de uso de Reclamaciones y el reconciliador; separar bases solo cambia la conexión (ya no hay claves foráneas) | Ninguno | A medias | No | Medio-bajo |
| D4 | Ids derivados del dato como clave de idempotencia (`reclamacion-nueva:<id>`, `a__b`) (ADR-0015, ADR-0018, ADR-0024) | Cambiar el esquema de ids: migrar ids guardados o convivir con los dos | 3 tablas (`notificaciones`, `coincidencias`, `eventos_fallidos`) y los constructores de ids | Avisos y coincidencias (derivables) | Algo: podrían duplicarse avisos | No | Medio-bajo |
| D5 | Cuenta = correo institucional, con sesiones opacas (ADR-0013) | Pasar a inicio de sesión único (SSO) | `cuentas`, `sesiones`, contrato de `/sesiones` y 3 clientes | Cuentas y sesiones | No | No | Medio |
| D6 | Fotos como `BYTEA` en la misma base (ADR-0023) | Pasar a almacenamiento de objetos | 1 puerto, 1 tabla, 1 adaptador | Las fotos (se borran al cerrar) | No | No | Bajo |

## Decisión: D1 es la más costosa de revertir

**Por qué D1 y no otra, con el criterio de arriba:**

1. **Alcance: es la única que toca todo.** Las demás afectan una tabla, un
   puerto o un caso de uso; D1 afecta los 9 adaptadores y las 9 tablas. La capa
   de dominio y de aplicación no cambiaría (los 10 puertos y los 9 adaptadores en
   memoria lo permiten, y ya se demostró una vez: el adaptador de PostgreSQL
   reemplazó al de memoria sin cambiar el dominio ni la aplicación, ADR-0006),
   pero todo lo que está debajo se reescribe.
2. **Falla en silencio: las garantías están en el motor, no en el código.** Tres
   propiedades que el sistema promete se sostienen porque PostgreSQL las da en
   **una sola sentencia atómica**:
   - crear sin duplicar ante reintentos (`INSERT … ON CONFLICT DO NOTHING`,
     S4, `docs/modos-de-fallo.md`);
   - cambiar el estado de una publicación solo si sigue en el esperado
     (`UPDATE … WHERE estado = $2`, comparar y fijar), de lo que depende que no
     haya dos aprobaciones a la vez (ADR-0020);
   - un solo reporte por cuenta y publicación (índice único `idx_reportes_uno_por_cuenta`).
   Un motor sin escrituras condicionales atómicas obligaría a reimplementarlas
   con bloqueos o versiones. Si se reimplementan mal, el sistema no falla con un
   error: **crea duplicados o permite estados incoherentes**, que es la peor
   forma de fallar. Las otras decisiones, cuando se revierten mal, fallan con
   ruido.
3. **Datos: todos los datos reales se mueven.** Las demás reversiones mueven datos
   derivables o ninguno (D3, D4, D6) o una fracción (D2, D5). D1 mueve las nueve
   tablas, con cuentas, contraseñas cifradas y pruebas de reclamaciones, y una
   migración defectuosa es la única que puede **perder** información de
   personas reales (el procedimiento de respaldo y restauración está verificado
   en CI, pero el respaldo programado de producción todavía no está configurado:
   [`docs/despliegue/respaldos.md`](../despliegue/respaldos.md)).
4. **Ventana: es la única que exige parar el servicio** para migrar, más allá de
   los 30 a 50 segundos de un redespliegue.
5. **Costo de verificarla: era alto y se redujo, sin desaparecer.** Las pruebas
   e2e de la aplicación corren contra los adaptadores **en memoria**, y la única
   prueba de un adaptador de PostgreSQL (`postgres-publicacion.repository.spec.ts`)
   simula el paquete `pg` y comprueba el manejo de caídas y de TLS, no la
   semántica de las consultas. Al escribir este ADR eso se vio como la debilidad
   concreta que más encarecía la reversión, y se atacó: ahora existe una suite
   de contrato de los puertos (`test/adaptadores.e2e-spec.ts`, 10 propiedades) que
   corre contra memoria y contra un **PostgreSQL real en CI** (trabajo
   «Adaptadores contra PostgreSQL real»). Cubre **los 9 adaptadores**. Lo que
   **no** cubre: las pruebas e2e de la aplicación completa siguen corriendo solo
   en memoria.

**Por qué las otras no ganan:**

- **D2 (anonimizar)** es lo único *irreversible*, pero es intencional (derecho de
  supresión, ADR-0021), afecta solo a quien lo pidió, y su costo de volver a
  "borrar de verdad" es casi nulo. Su irreversibilidad se acota con lo que sí
  está en nuestras manos: una política de copias de seguridad con retención corta
  (el procedimiento está verificado; configurarlo en producción es acción del
  equipo, ver abajo).
- **D3, D4, D6** tocan una parte del sistema, sin datos que no se puedan
  reconstruir.
- **D5** es costosa de explicar a las personas, no de ejecutar.

**Estimación del costo de revertir D1** (del equipo, no medida; se basa en las
cifras de arriba): 9 adaptadores × ~0,5 día para reescribir y probar cada uno,
más ~1 día de guion y ensayo de migración de datos, más ~1-2 días para
reconstruir y probar las tres garantías atómicas en el motor nuevo, más una
ventana de mantenimiento: **del orden de 6 a 9 días-persona y una ventana de
minutos con el volumen actual**. Para comparar, las reversiones D3, D4, D5 y D6
se estiman entre 1 y 3 días, y D2 entre 0 y imposible según la dirección.

## Qué se hace para que cueste menos

Ya existe:

- **Un procedimiento de respaldo y restauración verificado en cada commit**
  (`scripts/verificar-respaldo-postgres.sh`): respaldo con `pg_dump`, restauración
  en una base nueva y comparación de cada tabla por filas y huella del contenido,
  incluidos los bytes de las fotos. Prueba el procedimiento, no el respaldo
  programado de producción.
- **Una suite de contrato de los puertos que corre contra PostgreSQL real en CI**
  (`test/adaptadores.e2e-spec.ts` y el trabajo del mismo nombre en
  `.github/workflows/ci.yml`, con `postgres:16` fijado por digest y efímero).
  Comprueba, contra el motor real y en paralelo contra memoria, las propiedades
  que el sistema delega al motor: crear sin duplicar y comparar y fijar bajo
  **concurrencia** (cinco operaciones simultáneas, una gana), unicidad del correo,
  del aviso y del reporte (índice único), que las coincidencias se actualicen sin
  duplicarse, y que los bytes (`BYTEA`, los 256 valores) y los JSON (`JSONB`)
  sobrevivan intactos. Un motor nuevo tendría una prueba que le dice si respeta
  las mismas propiedades.
- **Puertos como clases abstractas** y un adaptador en memoria por cada uno de
  ellos: una referencia de comportamiento y la prueba de que la sustitución
  funciona (se activa con `DATABASE_URL`).
- **Sin claves foráneas ni transacciones entre contextos:** las tablas son
  independientes, así que se puede migrar una a la vez.
- **Cada tabla tiene un solo dueño** (`docs/modulo-datos.md`), y solo su adaptador
  la toca.

Pendiente (no se afirma como hecho):

- **Correr las pruebas e2e completas de la aplicación contra PostgreSQL**; hoy
  esas pruebas suponen una base vacía y adaptadores en memoria (y alguna comprueba
  literalmente que el almacenamiento es "memoria").
- **Configurar el respaldo programado en Dokploy**, con retención corta, y hacer
  el primer ensayo con datos reales: limita el daño de una migración fallida y de
  D2. Está escrito en [`docs/despliegue/respaldos.md`](../despliegue/respaldos.md).

## Consecuencias

- El equipo sabe dónde está el mayor costo de cambiar de opinión sobre los datos
  y no lo descubre en medio de un cambio.
- Cualquier cambio de SQL en los adaptadores se trata con más cuidado que el
  resto, porque es donde viven las garantías.
- Escribir esto dejó a la vista una debilidad concreta (la falta de pruebas contra
  PostgreSQL en CI), y fue la primera acción que se desprendió del ADR: ya está
  cubierta (9 de 9 adaptadores).

## Qué haría revisar esta decisión

- Que aparezca una segunda base o un servicio de almacenamiento: el reparto del
  costo cambiaría.
- Que las pruebas e2e completas corran contra PostgreSQL y exista un respaldo de
  producción restaurado con éxito: D1 bajaría de "alto" a "medio" (hoy, "alto" con
  los adaptadores cubiertos pero sin ensayo con datos reales).
- Un volumen de datos que haga más lenta o riesgosa una migración.
