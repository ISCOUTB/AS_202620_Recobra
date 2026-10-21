# Contrato de los eventos entre contextos

Versión del contrato de eventos: **1**. Esquema formal:
[`eventos.schema.json`](eventos.schema.json) (JSON Schema, borrador 7). Decisión y
garantías de entrega: [ADR-0026](../adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md).
Código: `src/application/events/eventos-dominio.ts`. Prueba:
`src/application/events/eventos-contrato.spec.ts`, que ejecuta los casos de uso
reales y valida cada evento que emiten contra el esquema.

Estos contratos son **internos** (entre contextos de la misma API, en proceso),
a diferencia del contrato HTTP en [`openapi.yaml`](openapi.yaml). Se escriben
igual porque el mensaje se guarda en la cola de fallidos y se reprocesa más
tarde: lo que se emitió hoy lo tiene que entender el código de mañana.

## El sobre

Todo evento viaja dentro de este sobre:

| Campo | Tipo | Significado |
|---|---|---|
| `id` | texto | **Identificador de correlación.** Se genera al emitir y aparece en el registro de quien emite, en el de quien procesa y en la cola de fallidos |
| `tipo` | texto | Uno de los cuatro tipos de abajo |
| `version` | entero | Versión del contrato de ese tipo. Hoy, `1` |
| `ocurridoEn` | fecha y hora ISO 8601 | Cuándo se emitió |
| `carga` | objeto | Lo que cuenta el evento (según su tipo) |

## Los cuatro eventos (versión 1)

Quien emite → quien consume. Los cuatro los consume Notificaciones para crear un
aviso.

| Tipo | Lo emite | Carga | Aviso que genera |
|---|---|---|---|
| `coincidencia.detectada` | Emparejamiento (`PublicacionCreadaListener`) y "Lo tengo yo" (`ReportarHallazgo`) | `coincidenciaId`, `publicacionOrigenId`, `publicacionCoincidenteId`, `score` (0 a 1) | A quien perdió el objeto: «Encontraron algo que podría ser tuyo» |
| `reclamacion.creada` | Reclamaciones (`CrearReclamacion`) | `reclamacionId`, `publicacionId`, `publicacionAutorId` (puede ser nulo), `publicacionDescripcion` | A quien publicó el encontrado: «Alguien reclamó un objeto que publicaste» |
| `reclamacion.resuelta` | Reclamaciones (`ResolverReclamacion`, también por rechazo automático de las demás) | `reclamacionId`, `publicacionId`, `reclamanteId`, `resultado` (`aprobada` o `rechazada`), `motivoRechazo` (puede ser nulo), `publicacionDescripcion` | A quien reclamó: aprobada o rechazada |
| `publicacion.moderada` | Moderación (`ResolverReporte`) | `publicacionId`, `autorId` (puede ser nulo), `descripcion` | A quien publicó: «Ocultamos una publicación tuya» |

Ejemplo completo de un mensaje:

```json
{
  "id": "3f1c9a7e-6d0b-4b52-9a54-0f6c2f0c7a11",
  "tipo": "reclamacion.creada",
  "version": 1,
  "ocurridoEn": "2026-10-21T15:04:05.123Z",
  "carga": {
    "reclamacionId": "b2a0…",
    "publicacionId": "9c4e…",
    "publicacionAutorId": "e71d…",
    "publicacionDescripcion": "Mochila negra"
  }
}
```

## Qué NO lleva una carga

Una carga lleva referencias (ids) y, como mucho, los textos que el aviso ya
muestra (la descripción pública de la publicación, el motivo de un rechazo). **No
lleva la prueba que escribió quien reclama**, ni correos, ni nombres: la carga se
guarda en la cola de fallidos y no debe sumar datos personales. La prueba
`eventos-contrato.spec.ts` lo comprueba.

## Criterio de compatibilidad

Un cambio en una carga es **compatible** (no sube la versión) solo si quien
consume la versión 1 sigue funcionando sin cambios:

| Cambio | ¿Compatible? | Por qué |
|---|---|---|
| Agregar un campo **opcional** nuevo | Sí | Quien consume la versión 1 lo ignora. Los esquemas lo permiten a propósito (`additionalProperties` abierto) |
| Quitar un campo requerido | **No** | Quien consume lo lee y se rompe |
| Renombrar un campo | **No** | Equivale a quitar uno y agregar otro |
| Cambiar el tipo de un campo (texto a número, o permitir nulo donde no se permitía) | **No** | Quien consume hace suposiciones sobre el tipo |
| Cambiar el significado de un campo sin cambiar su forma | **No**, y es el más peligroso: ninguna validación lo detecta | Se evita con una versión nueva y una nota aquí |
| Agregar un valor a un `enum` (por ejemplo, un nuevo `resultado`) | **No** | Quien consume con un `switch` cerrado lo trataría mal; va con versión nueva |
| Agregar un tipo de evento nuevo | Sí | Nadie lo escucha todavía |

**Qué pasa con un cambio incompatible:** se emite con `version: 2`. Quien
consume la versión 1 **no lo entiende a medias**: `Notificar.procesar` lanza para
una versión que no conoce y el evento va a la cola de fallidos (donde se ve),
en vez de procesarse mal en silencio. Durante la transición se emiten las dos
versiones, y la 1 se retira cuando ya no haya mensajes pendientes en la cola (la
retención de la cola es de 7 días).

## Cómo se garantiza

1. El **esquema** (`eventos.schema.json`) es la fuente del contrato.
2. `eventos-contrato.spec.ts` ejecuta los casos de uso reales, recoge lo que emiten
   y lo valida contra el esquema; además prueba el criterio de arriba (agregar un
   campo opcional pasa, quitar o cambiar el tipo falla, una versión 2 no se valida
   como versión 1).
3. Esa prueba corre en cada commit (`npm test` en el flujo de integración): un
   cambio incompatible en una carga rompe la prueba antes de llegar a producción.
