# Modos de fallo de las integraciones y su mitigación (evidencia S11)

Para cada integración del sistema: qué pasa si el otro lado **no responde**,
**responde tarde** o **responde dos veces**, qué mitigación tiene asignada,
dónde está en el código, qué prueba la cubre y qué queda pendiente.

## Integraciones del sistema

| # | Integración | Dónde ocurre la llamada | Por qué importa |
|---|---|---|---|
| **I1** | **API → PostgreSQL** (integración principal) | `src/infrastructure/persistence/postgres-publicacion.repository.ts` (`pg.Pool`, red interna de Dokploy) | Es la única llamada por red entre dos contenedores del despliegue y toda operación de publicaciones depende de ella |
| I2 | Cliente → API (HTTP/JSON) | `public/index.html` (`fetch('/publicaciones', …)`) y `mobile/lib/api/recobra_api.dart` (`_client.post`/`get`) | Es por donde el usuario entra; un reintento del cliente puede duplicar una creación |
| I3 | Publicaciones → Emparejamiento (evento en proceso) | `src/application/use-cases/crear-publicacion.ts` emite `publicacion.creada`; `src/emparejamiento/publicacion-creada.listener.ts` lo consume ([ADR-0004](adr/0004-integracion-sincrona-vs-asincrona.md)) | Es la integración entre contextos; el emparejamiento no debe frenar ni tumbar la publicación |

## Tabla de modos de fallo

Estado: **Probado** = hay una prueba automática que reproduce el fallo;
**Implementado** = existe en el código, sin prueba automática; **Pendiente** =
declarado con su plan.

### I1 · API → PostgreSQL (integración principal)

| Modo | Qué pasaría sin mitigación | Mitigación asignada | Código | Prueba | Estado |
|---|---|---|---|---|---|
| **No responde** (caída, DNS, conexión rechazada) | La petición queda colgada; al arrancar, el proceso se cae y todo el dominio da 404 | Conexión con límite de 3 s (`connectionTimeoutMillis`). Los errores de conexión se traducen a `AlmacenamientoNoDisponibleError` y la API responde **503** con el esquema de error único, sin detalles internos. El proceso arranca aunque la base no responda y reintenta preparar el esquema cada 5 s. `/health` sigue en 200 (proceso vivo) y `/health/ready` pasa a 503 | `postgres-publicacion.repository.ts` (`consultar`, `onModuleInit`, `programarReintento`); `src/publicaciones/almacenamiento-no-disponible.filter.ts`; `src/salud/salud.controller.ts` | `postgres-publicacion.repository.spec.ts` («traduce una caída de conexión», «onModuleInit no lanza»); `test/almacenamiento-no-disponible.e2e-spec.ts` (503 en las cuatro rutas, validado contra OpenAPI) | Probado |
| **Responde tarde** (consulta lenta, base saturada) | La petición espera indefinidamente y acumula conexiones del pool | La base corta la sentencia a los **2 s** (`statement_timeout`) y el cliente deja de esperar a los **2,5 s** (`query_timeout`); ambos casos responden **503**. Son 5 veces el presupuesto de S1 (400 ms) y unas 150 veces lo observado en el servidor (~13 ms, [`docs/medicion-s10.md`](medicion-s10.md)) | `postgres-publicacion.repository.ts` (opciones del `Pool`; código `57014` y mensaje de timeout en `consultar`) | `postgres-publicacion.repository.spec.ts` («limita cuánto espera a la base», «una base que responde tarde … se traduce a no disponible») | Probado con dobles; no medido contra una base real lenta |
| **Responde dos veces** | El driver no repite respuestas. El caso real es otro: la escritura se aplicó pero la respuesta se perdió, y el cliente reintenta | Creación idempotente: el id se deriva de la `Idempotency-Key` y la inserción es `INSERT … ON CONFLICT (id) DO NOTHING`, atómica por clave primaria; el adaptador informa si insertó (`guardarSiNoExiste`) | `postgres-publicacion.repository.ts` (`guardarSiNoExiste`); `crear-publicacion.ts` (`ejecutarIdempotente`) | `postgres-publicacion.repository.spec.ts` («guardarSiNoExiste informa si insertó»); ver I2 | Probado |

### I2 · Cliente → API

| Modo | Qué pasaría sin mitigación | Mitigación asignada | Código | Prueba | Estado |
|---|---|---|---|---|---|
| **No responde** (servicio caído o redesplegándose) | La vitrina se queda esperando sin explicar nada | Vitrina: comprueba `/health` hasta 20 veces (8 s por intento, cada 4 s), muestra el motivo y ofrece reintentar. Las creaciones se cortan a los 10 s con un mensaje que invita a reintentar. App Flutter: límite de 10 s en la creación | `public/index.html` (`verificarSalud`, envío del formulario); `mobile/lib/api/recobra_api.dart` (`tiempoMaximo`) | Sin prueba automática de la vitrina; el límite de Flutter no tiene prueba propia | Implementado |
| **Responde tarde** (más de 10 s) | El usuario reintenta sin saber si la primera petición llegó, y se duplica la publicación | El cliente deja de esperar a los 10 s **y conserva la misma clave de idempotencia** para el reintento; la clave solo se renueva tras crear con éxito | `public/index.html` (`claveIdempotencia`); `mobile/lib/main.dart` (`_claveIdempotencia`) | `test/idempotencia.e2e-spec.ts` (el reintento con la misma clave no duplica) | Probado en el servidor; la vitrina no tiene prueba automática, pero se verificó a mano en producción el 2026-10-17 (doble clic en «Publicar» dejó una sola publicación) |
| **Responde dos veces** (doble clic o reintento: el cliente envía la misma creación dos veces) | Dos publicaciones iguales y dos cálculos de coincidencias | Cabecera `Idempotency-Key`: el segundo envío responde **200** con la publicación original y no crea otra; con la misma clave y datos distintos, **422**. El evento de Emparejamiento solo se emite en la primera creación. La vitrina además desactiva el botón mientras hay un envío en curso | `crear-publicacion.ts`; `publicaciones.controller.ts`; `src/publicaciones/conflicto-idempotencia.filter.ts`; contrato 2.3.0 en [`docs/contracts/openapi.yaml`](contracts/openapi.yaml) | `test/idempotencia.e2e-spec.ts` (reintento, dos envíos simultáneos, coincidencia no duplicada, 422, clave inválida, compatibilidad sin cabecera); `crear-publicacion-idempotente.spec.ts`; `mobile/test/widget_test.dart` (el cliente envía la clave y acepta el 200) | Probado |

### I3 · Publicaciones → Emparejamiento (evento en proceso)

| Modo | Qué pasaría sin mitigación | Mitigación asignada | Código | Prueba | Estado |
|---|---|---|---|---|---|
| **No responde** (el cálculo de coincidencias falla, p. ej. la base cae) | Un rechazo no manejado en el manejador del evento podría tumbar el proceso | El manejador captura el error y registra una advertencia; la publicación ya respondió 201 y no se ve afectada. Las coincidencias de esa publicación no se calculan (no hay reintento) | `src/emparejamiento/publicacion-creada.listener.ts` | `src/emparejamiento/publicacion-creada.listener.spec.ts` | Probado. **Pendiente:** el evento perdido no se reprocesa (plan: bandeja de salida o broker en la S12) |
| **Responde tarde** (emparejamiento lento) | Si fuera síncrono, la publicación esperaría al emparejamiento | El evento se procesa de forma asíncrona (`async: true`, ADR-0004): quien publica no espera. Hoy el cálculo tarda ~2 ms ([`docs/medicion-emparejamiento.md`](medicion-emparejamiento.md)) | `publicacion-creada.listener.ts`; `crear-publicacion.ts` (`notificar`) | `test/emparejamiento.e2e-spec.ts` (consulta con espera: consistencia eventual) | Probado. Si el cálculo se volviera lento, es un criterio de extracción ([ADR-0012](adr/0012-no-extraer-emparejamiento.md)) |
| **Responde dos veces** (el evento se procesa dos veces) | Coincidencias duplicadas para el mismo par | El id de la coincidencia es determinista por par (`origen__coincidente`) y el repositorio guarda por id, así que repetir el cálculo no duplica. La creación idempotente evita además emitir el evento dos veces | `src/application/use-cases/buscar-coincidencias.ts`; `src/infrastructure/persistence/memoria-coincidencia.repository.ts` | `buscar-coincidencias.spec.ts` («si el evento llega dos veces…»); `test/idempotencia.e2e-spec.ts` («el reintento no duplica la coincidencia») | Probado |

## Diseño de idempotencia

**Qué operación se puede repetir:** la única escritura del sistema,
`POST /publicaciones`. Las demás rutas son lecturas, que se pueden repetir sin
efectos.

**Cómo funciona:**

1. El cliente genera una clave aleatoria por cada creación (UUID en la
   vitrina, 128 bits aleatorios en Flutter) y la envía en `Idempotency-Key`.
   La reutiliza si tiene que reintentar y la cambia solo cuando la creación
   tiene éxito.
2. El servidor valida el formato (8 a 100 caracteres alfanuméricos, guion o
   guion bajo; si no, 400) y deriva el id de la publicación con
   `sha256("recobra:publicacion:" + clave)` en forma de UUID.
3. Si ya existe una publicación con ese id, compara los datos: si son los
   mismos, responde **200** con la original; si son distintos, **422**.
4. Si no existe, la inserta con `ON CONFLICT (id) DO NOTHING`. Si dos
   peticiones con la misma clave llegan a la vez, la clave primaria deja una
   sola fila; la que pierde lee la ganadora y responde 200.
5. El evento `publicacion.creada` solo se emite si la inserción fue de esta
   petición.

**Por qué derivar el id de la clave y no guardar una tabla de claves:**
reutiliza la clave primaria que ya existía y la regla `ON CONFLICT` del
adaptador, sin tablas ni migraciones nuevas, y la atomicidad la da la base.

**Límites declarados:**

- La cabecera es **opcional**: un cliente que no la envía conserva el
  comportamiento anterior (cada envío crea una publicación). Los dos clientes
  del proyecto la envían.
- Las claves no están ligadas a un usuario, porque aún no hay cuentas. Dos
  clientes distintos que eligieran la misma clave chocarían; con claves
  aleatorias de 128 bits es despreciable.
- No caduca: una clave usada vale para siempre. Es aceptable porque la
  publicación queda guardada igual.

## ¿Aplica una saga?

**No, por ahora, y este es el motivo.** Una saga coordina varios pasos en
almacenes distintos que deben deshacerse si uno falla. En Recobra la única
escritura (`POST /publicaciones`) toca una sola fila en una sola base. El
emparejamiento escribe después en su propio almacén, pero una publicación sin
coincidencias sigue siendo válida: si el emparejamiento falla, **no hay nada
que compensar**, solo algo que recalcular.

Aplicará cuando exista la **reclamación con verificación** (escenario S2):
cambiar el estado del objeto, registrar la reclamación y avisar al dueño son
pasos que pueden fallar por separado. Ese diseño corresponde a la semana 12
(mensajería y consistencia).

## Lo que no se implementó, y por qué

| Mecanismo | Decisión | Motivo |
|---|---|---|
| Reintentos con espera creciente en el servidor hacia la base | No implementado, a propósito | Reintentar contra una base caída multiplica la carga en el peor momento. Se falla rápido (3 s) con 503 y el reintento lo decide el cliente, que puede hacerlo sin duplicar gracias a la idempotencia |
| Circuit breaker hacia la base | Pendiente | Hoy hay una sola dependencia y la conexión falla en 3 s como máximo. Con una caída larga, cada petición esperaría esos 3 s; un breaker respondería 503 de inmediato. Plan: agregarlo en el adaptador si una caída real lo justifica, con una prueba que lo abra y lo cierre |
| Reprocesar eventos de Emparejamiento perdidos | Pendiente | El evento vive en memoria del proceso: si el proceso cae entre guardar y emitir, o si el cálculo falla, esas coincidencias no se recalculan. Plan: bandeja de salida (outbox) o broker en la S12 |
| Persistencia de coincidencias | Pendiente | Están en memoria y se pierden al reiniciar; ya estaba declarado en arc42 |
| Consistencia al aprobar una reclamación (desde ADR-0014) | Pendiente | Aprobar cambia la publicación a "reclamado" y después guarda la reclamación aprobada. El cambio de estado es atómico (comparar y fijar), pero entre las dos tablas no hay transacción: si la segunda escritura falla, quedan desalineadas. Es el primer caso real de saga del proyecto; plan: resolverlo en la S12 |

## Trazabilidad

Aspectos A5, A7 y A8 en [`docs/aspectos.md`](aspectos.md); riesgos en la
[sección 11 de arc42](arc42/arc42.md#11-riesgos-y-deuda-técnica); decisión de
extracción en [ADR-0012](adr/0012-no-extraer-emparejamiento.md); contrato
2.3.0 en [`docs/contracts/openapi.yaml`](contracts/openapi.yaml).
