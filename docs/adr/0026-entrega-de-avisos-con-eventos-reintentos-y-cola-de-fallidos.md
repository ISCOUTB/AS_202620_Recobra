# ADR-0026: Entrega de avisos con eventos, reintentos y cola de fallidos, frente a una llamada síncrona

## Estado

Aceptada — 2026-10-21. Es el ADR del taller de mensajes y consistencia (semana
12). Precisa y completa [ADR-0015](0015-notificaciones-en-la-aplicacion.md)
(los avisos nacen de eventos en proceso) y [ADR-0024](0024-conciliacion-de-avisos.md)
(conciliación a partir del dato); no cambia el contrato de la API.

## Contexto

La operación elegida es real y ya existía: **avisar a quien publicó un objeto
encontrado que alguien lo reclamó** (y, con el mismo mecanismo, avisar de una
coincidencia, de la resolución de una reclamación y de una publicación
ocultada). Hay desacoplamiento temporal evidente: quien reclama espera la
respuesta de `POST /publicaciones/{id}/reclamaciones`, y el aviso al otro lado
puede llegar después sin que nadie lo note.

Antes de este cambio, el mecanismo tenía tres huecos que la evaluación señaló:
los eventos no tenían contrato ni identificador (no se podía seguir un mensaje),
un fallo del consumidor se registraba y el aviso se perdía, y no había forma de
saber cuántos mensajes se habían perdido.

## Alternativas consideradas

### A. Llamada síncrona: el caso de uso de reclamar crea el aviso antes de responder (descartada)

- **A favor:** sin pérdida entre el dato y el aviso mientras no falle la base;
  más simple de razonar.
- **En contra, acoplamiento:** Reclamaciones tendría que conocer y llamar a
  Notificaciones (hoy ninguno depende del otro; ADR-0004 los separó a propósito).
  Cada nuevo consumidor de "reclamación creada" (correo, push, métricas) obligaría
  a tocar el caso de uso.
- **En contra, latencia y disponibilidad:** quien reclama esperaría el tiempo del
  aviso y un fallo de Notificaciones fallaría la reclamación, que ya está
  guardada: respondería error por un efecto secundario. El escenario S4a pide lo
  contrario (un fallo de Notificaciones no tumba publicar, buscar ni reclamar).
- **Costo medido de la alternativa elegida:** el emisor no espera al consumidor;
  el aviso aparece en la siguiente consulta del cliente (`test/notificaciones.e2e-spec.ts`
  mide la espera contra los 60 s de S3).

### B. Broker externo (RabbitMQ, Redis Streams, SQS) (descartada)

- **A favor:** entrega durable y reintentos nativos.
- **En contra:** un componente más que operar en el servidor del laboratorio,
  sin presupuesto ni necesidad con una sola instancia; el taller no pide marca
  ni cantidad de contenedores. La garantía que necesitamos se obtiene con el
  dato como fuente de verdad (ADR-0024) y una cola de fallidos en la misma base.

### C. Eventos en proceso con sobre, reintentos con espera creciente, cola de fallidos y conciliación (elegida)

## Decisión

1. **Contrato del mensaje** ([`docs/contracts/eventos.md`](../contracts/eventos.md) y
   `eventos.schema.json`): todo evento viaja en un sobre `{ id, tipo, version,
   ocurridoEn, carga }` y las cargas v1 de los cuatro tipos están definidas. El
   **criterio de compatibilidad** es: agregar un campo opcional es compatible;
   quitar, renombrar, cambiar el tipo o el significado de un campo, o ampliar un
   `enum`, obliga a un evento de otra versión. `eventos-contrato.spec.ts` ejecuta
   los casos de uso reales y valida lo que emiten contra el esquema.
2. **Garantía de entrega: al menos una vez, con consumidor idempotente.**
   - Mientras el proceso vive, un evento se entrega hasta **3 veces** (el
     primer intento y dos reintentos); si el consumidor sigue fallando, pasa a la
     cola de fallidos y se reprocesa. Esa es la parte "al menos una vez".
   - Si el proceso muere con el evento en memoria, ese evento se pierde (aquí es
     "como máximo una vez"); lo recupera la **conciliación** (ADR-0024), que
     rehace los avisos desde el dato durante 3 días.
   - **Lo que se asume al elegirla:** el mismo aviso puede intentarse más de una
     vez, así que el consumidor tiene que producir el mismo resultado al repetirse,
     y **no hay orden garantizado** entre eventos (un aviso de "reclamación
     rechazada" podría crearse antes que el de "reclamación nueva"; los avisos son
     independientes, no dependen del orden).
3. **Duplicados: idempotencia con clave derivada del dato.** El id del aviso se
   construye con el hecho que lo origina (`reclamacion-nueva:<reclamacionId>`,
   `reclamacion-resuelta:<reclamacionId>`, `coincidencia:<id>:<cuenta>`,
   `moderacion:<publicacionId>`) y se guarda con `ON CONFLICT (id) DO NOTHING`.
   Un mismo mensaje entregado dos veces, o el mismo hecho emitido dos veces con
   otro identificador de evento, produce un solo aviso.
4. **Reintentos con espera creciente:** 3 intentos con espera de 200 ms, 800 ms
   (×4) y ±20 % de variación (`esperaCreciente`). Es corta a propósito: el evento
   corre en segundo plano y una caída larga se atiende con la cola, no con esperas.
5. **Cola de mensajes fallidos:** tabla `eventos_fallidos` (PostgreSQL) con el
   evento, su carga, los intentos y el último error (recortado a 200 caracteres).
   Cada 5 minutos se **reprocesa**: si ahora se pudo, queda `reprocesado`; si no,
   suma un intento. Se borra lo de más de 7 días. Un mensaje de una versión o tipo
   desconocido no se descarta en silencio: va a la cola y se ve.
6. **Trazabilidad:** el identificador del sobre se escribe en el registro de quien
   emite (`evento.emitido`) y de quien procesa (`evento.procesado`,
   `evento.reintento`, `evento.en_cola_de_fallidos`, `evento.reprocesado`), y los
   contadores salen en `GET /metrics` (`eventos`: emitidos, procesados,
   reintentos, enColaDeFallidos, reprocesados, pendientesEnCola y `alertaCola`).
   Ejemplo de un mensaje seguido de punta a punta:

   ```json
   {"timestamp":"…","level":"info","context":"Eventos","message":{"evento":"evento.emitido","eventoId":"3f1c…","tipo":"reclamacion.creada","version":1}}
   {"timestamp":"…","level":"warn","context":"Eventos","message":{"evento":"evento.reintento","eventoId":"3f1c…","tipo":"reclamacion.creada","intento":1,"esperaMs":187,"error":"connect ECONNREFUSED…"}}
   {"timestamp":"…","level":"info","context":"Eventos","message":{"evento":"evento.procesado","eventoId":"3f1c…","tipo":"reclamacion.creada","intento":2}}
   ```
7. **Alerta de la cola:** al terminar cada pasada de reproceso se cuenta lo que
   sigue esperando; con **5 o más** eventos pendientes (`UMBRAL_ALERTA_COLA`) se
   escribe una línea de nivel `error` (`alerta.cola_de_fallidos`, con la cantidad
   y el umbral) y `GET /metrics` marca `alertaCola: true`. Uno o dos pendientes son
   una caída breve; cinco juntos ya son algo que mirar. La alerta se apaga sola
   cuando la cola se vacía. **Es una alerta en el registro y en la métrica: no
   avisa a nadie por sí sola** (ver los límites).
8. **Las cargas no llevan datos que el aviso no muestre ya:** en particular, no
   llevan el texto de la prueba de una reclamación, de modo que guardarlas en la
   cola de fallidos no suma datos personales (`eventos-contrato.spec.ts` lo comprueba).

## Qué se probó

**Contra la aplicación completa** (`test/entrega-eventos.e2e-spec.ts`), con un
repositorio de avisos que falla a propósito, sobre la operación real de reclamar:

- «**fallo recuperable**: el consumidor falla dos veces, se reintenta con espera
  creciente y el aviso llega» (3 intentos, esperas que crecen, un solo aviso);
- «un mensaje **duplicado** (entregado dos veces) no duplica el aviso»;
- «un fallo que no se recupera deja el evento en la **cola de fallidos** y el
  reproceso lo entrega cuando la base vuelve»;
- «**trazabilidad**: el mismo identificador de correlación sale en el registro del
  productor y del consumidor» (`evento.emitido`, `evento.reintento`,
  `evento.procesado` con el mismo `eventoId`).

**Unitarias** (`src/application/use-cases/entrega-de-eventos.spec.ts`, nombres literales):

- «un evento duplicado … no duplica el aviso» y «el mismo hecho emitido dos veces
  con otro identificador tampoco duplica»;
- «un fallo recuperable: falla dos veces, espera cada vez más y el tercer intento
  lo procesa»;
- «un fallo que no se recupera … queda en la cola de fallidos» y «cuando lo que
  falló se recupera, el reproceso entrega lo que quedó en la cola, una sola vez»;
- «un mensaje de una versión que no se entiende no se descarta en silencio»;
- «trazabilidad: el mismo identificador aparece en el registro de quien emite y en
  el de quien procesa»;
- «alerta: con cinco eventos esperando en la cola se emite una línea de error y se
  marca en las métricas; con menos, no» (y se apaga al vaciarse la cola).

## Consecuencias

- Reclamar, publicar y moderar no esperan ni dependen de Notificaciones; un fallo
  de la base al escribir el aviso ya no lo pierde: lo reintenta, lo guarda y lo
  reprocesa.
- Hay **tres redes de seguridad** con cobertura distinta y no redundante: el
  reintento (fallos breves, segundos), la cola de fallidos (caídas de minutos u
  horas, hasta 7 días) y la conciliación por estado (eventos que nunca llegaron a
  la cola porque el proceso murió, hasta 3 días).
- El costo es más código y una tabla más; el beneficio es poder decir qué se
  pierde y qué no.

## Límites del experimento (qué no cubre)

- **No es un broker durable.** Un evento en memoria se pierde si el proceso muere
  antes del primer intento o mientras espera un reintento; solo la conciliación lo
  recupera, y solo para lo que se puede rehacer desde el dato (los cuatro tipos
  actuales). Un evento que no deje huella en el dato no se recuperaría.
- Una sola instancia: con varias, un evento en la cola de fallidos podría
  reprocesarse en dos a la vez (el aviso no se duplicaría por ser idempotente,
  pero el contador sí).
- La espera creciente y el número de intentos son fijos, no configurables, y no
  se probaron con una base real caída: las pruebas simulan el fallo del
  repositorio. El fallo real de PostgreSQL se probó antes en `docs/modos-de-fallo.md`
  (I1) con dobles.
- Los contadores viven en la memoria del proceso y se reinician con él.
- **La alerta de la cola no avisa a nadie por sí sola.** Escribe una línea de
  error y marca `alertaCola` en `/metrics`; que alguien la vea depende de mirar
  los registros de Dokploy o de conectar esa línea o esa métrica a un aviso
  (correo, mensaje), algo que todavía no está configurado.
- El evento `publicacion.creada` (que dispara Emparejamiento) no está bajo este
  contrato: sigue siendo un evento en proceso sin reintentos propios. Su fallo se
  registra, y recalcular coincidencias no está cubierto (riesgo vigente, arc42 §11.2).

## Qué haría revisar esta decisión

- Más de una instancia del backend, o un consumidor que no pueda ser idempotente:
  habría que pasar a un broker o a una cola de trabajos con bloqueo en la base.
- Eventos cuyo efecto no se pueda rehacer desde el dato.
- Que el volumen de eventos haga caro el reproceso periódico.
