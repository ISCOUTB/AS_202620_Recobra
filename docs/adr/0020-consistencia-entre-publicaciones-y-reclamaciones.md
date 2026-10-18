# ADR-0020: Consistencia entre Publicaciones y Reclamaciones: pasos retomables y reconciliación

## Estado

Aceptada — 2026-10-18. Responde a la consistencia que ADR-0014 y ADR-0017
dejaron pendiente (escenario de la semana 12: mensajería y consistencia). No
modifica esos ADR.

## Contexto

Cuatro operaciones cambian a la vez el estado de una publicación (contexto
Publicaciones) y una reclamación (contexto Reclamaciones), que son dueños de
tablas distintas y no comparten transacción:

| Operación | Paso 1 | Paso 2 |
|---|---|---|
| Reclamar | guardar la reclamación | objeto `publicado → en_verificacion` |
| Rechazar | guardar la reclamación como rechazada | si no quedan pendientes, objeto `en_verificacion → publicado` |
| Aprobar | objeto `en_verificacion → por_entregar` | guardar la reclamación aprobada y rechazar las demás |
| Entregar | objeto `por_entregar → reclamado` | guardar la fecha de entrega en la reclamación |

Si el proceso cae o la base falla entre el paso 1 y el 2, quedan desalineadas:
por ejemplo, un objeto "por entregar" cuya reclamación sigue "pendiente", que
nadie puede resolver porque el estado ya no es el esperado.

## Alternativas consideradas

### A. Una transacción de base de datos que abarque las dos tablas (descartada)

- **A favor:** atomicidad real.
- **En contra:** obliga a que los adaptadores de dos contextos compartan un
  cliente de transacción, lo que rompe la regla de dueño único de datos
  (`docs/modulo-datos.md`) y ata los contextos a la misma base; los adaptadores
  en memoria no tienen transacciones. Si Reclamaciones se extrae algún día
  (ADR-0012), habría que deshacerlo.

### B. Pasos retomables y reconciliación (elegida)

Una saga con **recuperación hacia adelante**: no se deshace nada; se termina lo
que quedó a medias.

## Decisión

1. **El paso 1 deja constancia.** Al aprobar, el cambio de estado a
   `por_entregar` guarda en la publicación, **en el mismo `UPDATE` atómico**
   (comparar y fijar), qué reclamación se aprobó (`reclamacion_aprobada_id`).
   Es un dato interno: no sale por la API.
2. **El reintento retoma.** Si `aprobar` o `entregar` se repite para la
   misma reclamación y el estado ya cambió, comprueba que la publicación
   recuerda *esa* reclamación y continúa con el paso 2 en vez de fallar. Otra
   reclamación distinta sigue recibiendo 409: no se puede colar en el hueco.
3. **Los pasos 2 son idempotentes:** guardar la reclamación aprobada y rechazar
   las demás se puede repetir sin cambiar el resultado (guardar por id; los
   avisos tienen id derivado del evento, ADR-0015).
4. **Reconciliador:** `ReconciliarReclamaciones` corre a los 45 s de arrancar y
   cada 5 minutos, y repara las cuatro interrupciones de la tabla. Recorre solo
   lo abierto: reclamaciones pendientes o aprobadas sin entrega, y objetos en
   verificación; una lista corta, no la historia completa.
5. **Dueño único:** el reconciliador cambia el estado de las publicaciones solo
   a través de `CambiarEstadoPublicacion`, como el resto de Reclamaciones.

## Consecuencias

- Una caída entre los dos pasos ya no deja nada atascado: o el usuario repite la
  acción y continúa, o el reconciliador lo termina en minutos. Mientras tanto,
  el estado es **eventualmente consistente**: durante esos minutos un objeto
  puede aparecer "por entregar" con la reclamación todavía "pendiente".
- Las pruebas simulan la caída entre los pasos (`consistencia-reclamaciones.spec.ts`)
  y comprueban el reintento, el reconciliador y que lo sano no se toca.
- El reconciliador corre dentro de la API; con varias réplicas cada una lo
  ejecutaría (es idempotente). Si falla, deja una advertencia y lo reintenta.
- Sigue siendo una consistencia dentro del proceso: si se pierde un evento de
  aviso (ADR-0015) no se reenvía; para eso haría falta una bandeja de salida
  (outbox) o un broker.

## Qué haría revisar esta decisión

- Que Reclamaciones se extraiga a otro servicio: el reconciliador ya funciona
  entre contextos, pero habría que moverlo y consultar por red.
- Que los minutos de inconsistencia molesten a los usuarios: bajar el
  intervalo o reconciliar al leer.
