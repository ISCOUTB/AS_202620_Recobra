# Taller aplicado · Mensajes y consistencia

Evidencia del taller de la semana 12. Es un **resumen con enlaces**: el diseño
vive en el ADR, el contrato en `docs/contracts/` y la prueba en el código; este
documento solo dice dónde está cada cosa y qué no cubre.

## 1. Operación elegida (real, del proyecto)

**Avisar a quien publicó un objeto encontrado que alguien lo reclamó**
(`POST /publicaciones/{id}/reclamaciones` → aviso en `GET /notificaciones`), y con
el mismo mecanismo avisar de una coincidencia, de la resolución de una
reclamación y de una publicación ocultada. Hay desacoplamiento temporal: quien
reclama recibe su respuesta y el aviso al otro lado llega después, sin que quien
reclama espere. No es un prototipo aislado: corre en producción
(https://recobra.iscoutb.dev).

Decisión frente a la alternativa síncrona:
[ADR-0026](adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md).

## 2. Matriz de los siete puntos del taller

| Qué pide el taller | Dónde está |
|---|---|
| **1. Contrato del mensaje y criterio de compatibilidad** | [`docs/contracts/eventos.md`](contracts/eventos.md) y [`eventos.schema.json`](contracts/eventos.schema.json): sobre `{id, tipo, version, ocurridoEn, carga}`, cuatro cargas v1 y una tabla de qué cambio es compatible y cuál no. Código: `src/application/events/eventos-dominio.ts` |
| **2. Garantía de entrega y consecuencias asumidas** | **Al menos una vez, con consumidor idempotente** (reintentos y cola de fallidos), y "como máximo una vez" si el proceso muere con el evento en memoria, caso que cubre la conciliación. Consecuencias asumidas (repetición posible, sin orden garantizado, no es un broker durable): ADR-0026, decisión 2, y arc42 §8.4 |
| **3. Duplicados** | Idempotencia con clave derivada **del dato**, no del mensaje: `reclamacion-nueva:<reclamacionId>`, `reclamacion-resuelta:<reclamacionId>`, `coincidencia:<id>:<cuenta>`, `moderacion:<publicacionId>`; guardado con `ON CONFLICT (id) DO NOTHING`. Código: `src/application/use-cases/notificaciones.ts` (`guardar`), `postgres-notificacion.repository.ts` |
| **4. Reintentos con espera creciente y cola de fallidos** | 3 intentos con espera de 200 ms y 800 ms (×4, ±20 %): `esperaCreciente` y `ProcesadorDeEventos` en `src/application/use-cases/entrega-de-eventos.ts`. **Cola de fallidos:** tabla `eventos_fallidos` (`postgres-evento-fallido.repository.ts`), reprocesada cada 5 min por `ReprocesarEventosFallidos` y limpiada a los 7 días |
| **5. Pruebas de un duplicado y de un fallo recuperable** | `src/application/use-cases/entrega-de-eventos.spec.ts`: «**un evento duplicado** (el mismo mensaje entregado dos veces) no duplica el aviso»; «**un fallo recuperable**: falla dos veces, espera cada vez más y el tercer intento lo procesa»; además, el fallo que no se recupera, el reproceso y el mensaje de versión desconocida. Contrato: `src/application/events/eventos-contrato.spec.ts`. Run que las ejecutó: ver §4 |
| **6. Métrica o log para seguir un mensaje de productor a consumidor** | El identificador del sobre aparece en el registro del productor y del consumidor, y los contadores salen en `GET /metrics` (`eventos`). Ejemplo real en §3 |
| **7. ADR que compara con la alternativa síncrona** | [ADR-0026](adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md): alternativa A (llamada síncrona) y B (broker externo) comparadas por acoplamiento, latencia, disponibilidad y operación |

## 3. Ejemplo real de un mensaje seguido de punta a punta

Capturado ejecutando la API (`node dist/main.js`, adaptadores en memoria, cuentas
de prueba locales) y haciendo una reclamación. El registro del servidor, en JSON
por línea:

```json
{"timestamp":"2026-10-21T23:05:37.591Z","level":"info","context":"Eventos","message":{"evento":"evento.emitido","eventoId":"1bdf1782-2dd5-4c70-8232-a0ef1900c6a0","tipo":"reclamacion.creada","version":1}}
{"timestamp":"2026-10-21T23:05:37.592Z","level":"info","context":"Eventos","message":{"evento":"evento.procesado","eventoId":"1bdf1782-2dd5-4c70-8232-a0ef1900c6a0","tipo":"reclamacion.creada","intento":1}}
```

El mismo `eventoId` en las dos líneas es el seguimiento del productor al
consumidor. El aviso resultante (`GET /notificaciones` de quien publicó) tiene el
id `reclamacion-nueva:<id de la reclamación>`, y `GET /metrics` mostró:

```json
"eventos": {"emitidos": 1, "procesados": 1, "reintentos": 0, "enColaDeFallidos": 0, "reprocesados": 0,
            "ventana": "desde que arrancó el proceso (en memoria, se reinicia con él)"}
```

Con un fallo, el mismo identificador aparece además en `evento.reintento`
(con `intento` y `esperaMs`) y, si no se recupera, en `evento.en_cola_de_fallidos`
y `evento.reprocesado`. Esa secuencia está **probada** con un repositorio
simulado (`entrega-de-eventos.spec.ts`), no capturada de una caída real de la
base.

## 4. Evidencia de ejecución

- Pruebas: `npm test` (todas las unitarias, incluidas `entrega-de-eventos.spec.ts`
  y `eventos-contrato.spec.ts`) y `npm run test:e2e`, en el flujo de integración
  continua (`.github/workflows/ci.yml`, trabajo «Backend NestJS»).
- Run del commit `d61fd21` que las ejecutó, con todos los trabajos en verde
  (pruebas del backend, adaptadores contra PostgreSQL real, cliente Flutter,
  análisis y Quality Gate de SonarCloud):
  https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/39692259031

## 5. Límites del experimento (qué no cubre y qué haría falta en producción)

- **No es un broker durable.** El evento vive en la memoria del proceso: si el
  proceso muere antes del primer intento o mientras espera un reintento, se
  pierde, y solo la conciliación lo recupera, y solo lo que se puede rehacer desde
  el dato. En producción con garantías fuertes haría falta una bandeja de salida
  escrita junto con el dato o un broker.
- **Una sola instancia.** Con varias, un evento de la cola de fallidos podría
  reprocesarse en dos a la vez (el aviso no se duplica por ser idempotente; el
  contador sí). Haría falta un bloqueo o una cola de trabajos con reclamo.
- **El fallo se simula, no se provoca.** Las pruebas hacen fallar al repositorio de
  avisos; no se probó con una caída real de PostgreSQL. La caída real de la base se
  probó para las peticiones HTTP (`docs/modos-de-fallo.md`, I1), no para los eventos.
- **Reintentos fijos y cortos** (3 intentos, 200 ms y 800 ms): no son
  configurables. Una caída de la base de más de unos segundos se atiende con la
  cola de fallidos, no con los reintentos.
- **Sin orden garantizado** entre eventos; los avisos son independientes entre sí.
- **Sin alertas.** El tamaño de la cola de fallidos solo se ve en el registro y en
  la tabla, no genera un aviso a quien opera el sistema.
- **Métricas en memoria**, que se reinician con el proceso.
- **El evento `publicacion.creada`** (el que dispara el emparejamiento) no está bajo
  este contrato ni tiene reintentos: si falla, no se recalculan las coincidencias.
- **Los eventos viajan dentro del proceso**: no se probó la compatibilidad entre
  dos versiones del servidor desplegadas a la vez, que un broker sí exigiría.
