# ADR-0017: Ciclo de vida completo: cierre, vencimiento y entrega confirmada

## Estado

Aceptada — 2026-10-17. Completa el ciclo de vida de la publicación (escenario
S6) que ADR-0014 dejó en `publicado → en_verificacion → reclamado`. No edita
ADR-0014 (regla 1 de ADR-0011): cambia una de sus consecuencias, que aprobar
llevaba directo a "reclamado". Contrato 4.0.0.

## Contexto

La evaluación del planteamiento del 2026-10-17 encontró tres huecos en la
lógica del producto:

1. **Una publicación de "perdido" nunca se cerraba.** Si el dueño recuperaba el
   objeto por otro lado, la publicación seguía visible y seguía generando
   coincidencias falsas.
2. **Nada vencía.** Con el tiempo la búsqueda se llenaría de avisos viejos.
3. **"Entregado" se marcaba al aprobar.** Aprobar significa "es el dueño", no
   "ya lo tiene"; la entrega física podía no ocurrir nunca y el sistema la daba
   por hecha.

## Alternativas consideradas

### A. Solo borrar publicaciones (descartada)

- **En contra:** se pierde la trazabilidad que pide S6 y el registro de
  reclamaciones de S2.

### B. Estados nuevos y transiciones explícitas (elegida)

## Decisión

Se adopta **B**:

```
publicado ──reclamar──▶ en_verificacion ──aprobar──▶ por_entregar ──confirmar entrega──▶ reclamado (entregado)
    │                         │
    │                         └──rechazar todas──▶ publicado
    └──su autor la cierra (recuperado | retirado) o vence──▶ cerrado
```

1. **Cerrar:** su autor la cierra con `POST /publicaciones/{id}/cerrar`
   (`recuperado`, solo para objetos perdidos, o `retirado`). Solo desde
   "publicado": si hay una reclamación en curso, primero se resuelve.
2. **Vencer:** lo que lleva más de 60 días en "publicado" se cierra como
   `vencido`. Lo hace `ArchivadorVencidas` dentro del proceso (al minuto de
   arrancar y cada 6 horas); `DIAS_VIGENCIA_PUBLICACION` cambia los días.
3. **Entregar:** aprobar deja el objeto en `por_entregar` y comparte los
   contactos; quien reclamó ("lo recibí") o quien lo encontró ("lo entregué")
   confirma con `POST /reclamaciones/{id}/entregada`, y la publicación pasa a
   `reclamado`. La reclamación guarda `entregadaEn`.
4. **Visibilidad:** la búsqueda solo devuelve `publicado`, `en_verificacion` y
   `por_entregar`; el emparejamiento solo considera `publicado` y
   `en_verificacion`. Su autor sigue viendo todo en "Mis cosas".
5. **Dueño único:** todos los cambios de estado siguen pasando por el contexto
   Publicaciones (`CambiarEstadoPublicacion`, `CerrarPublicacion`) con
   comparar y fijar, igual que en ADR-0014.

## Consecuencias

- **Cambio incompatible del contrato (4.0.0):** aprobar ya no devuelve el
  objeto en "reclamado", aparecen dos estados y la búsqueda filtra por estado.
  La vitrina y la app se actualizaron en el mismo cambio.
- Las publicaciones aprobadas antes de este cambio quedaron en "reclamado" y se
  tratan como entregadas.
- El vencimiento corre dentro de la API: si hubiera varias réplicas, cada una
  lo ejecutaría (es idempotente: el `UPDATE` solo toca lo que sigue en
  "publicado"). Si falla, deja una advertencia y lo reintenta en la siguiente
  pasada.
- Aprobar y confirmar la entrega siguen escribiendo dos tablas sin
  transacción; es el pendiente de consistencia de la S12.

## Qué haría revisar esta decisión

- Objetos aprobados que nunca se confirman → un recordatorio a los N días o un
  cierre automático de "por entregar".
- Que 60 días resulten cortos para objetos de valor (documentos) → vigencia por
  categoría.
