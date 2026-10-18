# ADR-0024: Conciliación de avisos en lugar de una tabla de eventos pendientes

## Estado

Aceptada — 2026-10-18. Complementa [ADR-0015](0015-notificaciones-en-la-aplicacion.md)
(los avisos se generan con eventos en proceso) y sigue la misma idea que
[ADR-0020](0020-consistencia-entre-publicaciones-y-reclamaciones.md). No cambia el
contrato de la API.

## Contexto

Los eventos en proceso (`coincidencia.detectada`, `reclamacion.creada`,
`reclamacion.resuelta`, `publicacion.moderada`) son rápidos pero **no durables**:
si el proceso se reinicia (por ejemplo, en un redespliegue) entre guardar el dato
y procesar su evento, o la base falla justo al escribir el aviso, el aviso se
pierde y nadie se entera. La evaluación del planteamiento lo señaló como deuda.

## Alternativas consideradas

### A. Tabla de eventos pendientes ("outbox") (descartada)

Escribir el evento en una tabla junto con el cambio y procesarla después.

- **En contra:** exige que el cambio y el evento se escriban **de forma atómica**.
  Hoy cada contexto escribe su propia tabla sin transacción común (ADR-0020 lo
  descartó a propósito), así que el outbox tendría la misma ventana de fallo que
  intenta cerrar, salvo que se rompa esa regla de dueño único.

### B. Reintentar dentro del oyente (descartada)

- **En contra:** no cubre el reinicio del proceso, que es el caso más común.

### C. Conciliar a partir del dato (elegida)

El id de cada aviso ya se deriva del dato que lo origina (`coincidencia:<id>:<cuenta>`,
`reclamacion-nueva:<id>`, `reclamacion-resuelta:<id>`, `moderacion:<id>`) y guardarlo
es idempotente. Basta con repasar lo reciente y volver a pedir los avisos.

## Decisión

1. `ConciliarAvisos` repasa lo ocurrido en los **últimos 3 días**: coincidencias
   detectadas, reclamaciones (creadas y ya resueltas) y reportes cuya publicación se
   ocultó, y pide a `Notificar` los avisos correspondientes. Los que existen no se
   duplican; los que faltan se crean. Lo hace con los mismos métodos que usan los
   oyentes, así el texto y el destinatario son idénticos.
2. Corre dentro del proceso al minuto de arrancar y cada 5 minutos (como el
   reconciliador de ADR-0020) y no en las pruebas. Vive en su propio módulo
   (`ConciliacionAvisosModule`) para que Notificaciones no dependa de los demás
   contextos: lee sus datos solo por los puertos (`listarCreadasDesde`,
   `listarOcultadosDesde`).
3. **Una cuenta eliminada no recibe avisos** (ADR-0021), ni por la conciliación ni
   por un evento tardío: `Notificar` lo comprueba antes de guardar.

## Consecuencias

- Un aviso perdido aparece como máximo unos 5 minutos después (antes, nunca). El
  escenario S3 (60 s) se sigue cumpliendo en el caso normal; esto es la red de
  seguridad para el caso de fallo.
- Un aviso que la persona ya borró no existe (los avisos no se borran individualmente),
  y los que vencen por retención (90 días) quedan fuera de la ventana de 3 días,
  así que no reaparecen.
- La ventana de 3 días significa que un fallo más largo que eso (por ejemplo, la
  aplicación caída varios días) no se repara. Es un límite deliberado.
- Cada pasada lee hasta 500 registros por tipo; con el volumen actual es trivial.

## Qué haría revisar esta decisión

- Que aparezcan eventos que no se puedan derivar del estado guardado (por ejemplo,
  avisos por acciones que no dejan huella): habría que volver a plantear un outbox.
- Que el volumen haga caro el repaso periódico.
