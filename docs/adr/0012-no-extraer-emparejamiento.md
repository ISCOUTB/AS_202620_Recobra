# ADR-0012: No extraer Emparejamiento como servicio aparte (por ahora), con criterios para revisarlo

## Estado

Aceptada — 2026-10-16. Evidencia S11. Complementa
[ADR-0004](0004-integracion-sincrona-vs-asincrona.md) (integración por evento
en proceso) y se apoya en el análisis de fallos de
[`docs/modos-de-fallo.md`](../modos-de-fallo.md). No modifica ningún ADR
anterior.

## Contexto

Recobra es un solo proceso NestJS con dos contextos con código:
**Publicaciones** (núcleo) y **Emparejamiento** (soporte), según
[`docs/context-map.md`](../context-map.md). Notificaciones, Reclamaciones e
Identidad aún no tienen código, así que el único candidato real a extraer es
Emparejamiento.

Hoy Emparejamiento ya está separado **lógicamente**: tiene su propio módulo
(`src/emparejamiento/`), su caso de uso (`BuscarCoincidencias`), su entidad y
su puerto de persistencia (`CoincidenciaRepository`). Lee publicaciones solo
a través del puerto `PublicacionRepository` y nunca las escribe. Recibe el
evento `publicacion.creada` en proceso y de forma asíncrona.

La pregunta es si conviene que además esté separado **físicamente**: otro
proceso, otro contenedor y su propia base.

## Criterios de decisión

| Criterio | Qué tendría que pasar para extraer | Situación medida hoy |
|---|---|---|
| Carga y escala | Que Emparejamiento consuma recursos que degraden a Publicaciones o necesite escalar por separado | El cálculo tarda ~2 ms ([`docs/medicion-emparejamiento.md`](../medicion-emparejamiento.md)). Con 200 conexiones la búsqueda cumple S1 (p97,5 = 157 ms, [`docs/medicion-s10.md`](../medicion-s10.md)) |
| Aislamiento de fallos | Que un fallo de Emparejamiento pueda tumbar la publicación | Ya está aislado: el evento es asíncrono y el manejador captura sus errores (prueba en `publicacion-creada.listener.spec.ts`) |
| Ritmo de cambio y equipos | Que otro equipo lo mantenga o lo despliegue con otra cadencia | Un solo equipo de cuatro, un solo despliegue |
| Datos | Que necesite un almacén propio con otro modelo o escala | Sus datos caben en memoria; persistirlos es trabajo pendiente, pero no exige otra base |
| Tecnología | Que necesite otro lenguaje o componente (p. ej. un modelo generativo) | Heurística determinista; [ADR-0007](0007-no-incorporar-componente-generativo.md) descarta un LLM por ahora |
| Costo | Que el beneficio pague otro servicio y otra base | Hoy todo corre gratis en un servidor del laboratorio (ADR-0010); otro servicio usa más recursos compartidos sin beneficio medido |

## Alternativas consideradas

### A. No extraer: mantener Emparejamiento como módulo del mismo proceso (elegida)

- **A favor:** no añade llamadas por red, así que no aparecen los tres modos de
  fallo nuevos (no responde, tarde, dos veces) entre los dos contextos. La
  comunicación por evento y puertos ya da la separación que importa. Un solo
  despliegue y sin costo adicional.
- **En contra:** comparten proceso, memoria y CPU; un cálculo muy costoso
  competiría con las búsquedas. Si el proceso cae, se pierden los eventos en
  curso, igual que hoy.
- **Por qué no es "no decidir":** se evaluaron los seis criterios de arriba y
  ninguno se cumple con los datos medidos. La separación lógica existente
  permite extraer más adelante sin reescribir el dominio.

### B. Extraer como servicio HTTP llamado por Publicaciones (descartada)

- **A favor:** despliegue y escala independientes.
- **En contra:** convierte una llamada en proceso en una llamada por red y obliga
  a resolver sus tres modos de fallo con tiempos límite, reintentos e
  idempotencia. Si Publicaciones esperara la respuesta, rompería la regla de
  no bloquear de ADR-0004 y el escenario S3; si no la esperara, haría falta
  un mecanismo de entrega confiable, que es la alternativa C. Emparejamiento
  además necesitaría leer publicaciones por HTTP o con una copia propia.

### C. Extraer como servicio que consume eventos de un broker (descartada por ahora)

- **A favor:** desacopla en el tiempo, permite reintentar y reprocesar eventos,
  y resolvería el pendiente de eventos perdidos.
- **En contra:** añade un broker y un segundo servicio que operar en un
  servidor compartido, con un beneficio que hoy no se mide. La mensajería es el
  tema de la semana 12: si allí se adopta un broker o una bandeja de salida,
  esta alternativa se vuelve a evaluar con esos datos.

## Decisión

Se adopta **A: no extraer**. Emparejamiento sigue como módulo del mismo
proceso, separado por su puerto, su entidad y el evento `publicacion.creada`,
con los modos de fallo de esa integración mitigados y probados
([`docs/modos-de-fallo.md`](../modos-de-fallo.md), integración I3).

## Consecuencias

- No aparecen modos de fallo de red entre Publicaciones y Emparejamiento.
- Siguen abiertos dos pendientes que no dependen de extraer: eventos perdidos
  si el proceso cae, y coincidencias solo en memoria.
- La frontera queda lista para extraer: el caso de uso solo depende de
  puertos, así que mudarlo implica nuevos adaptadores, no un dominio nuevo.

## Qué haría revisar esta decisión

Cualquiera de estos, medido y no supuesto:

1. El cálculo de coincidencias supera los **100 ms** por publicación, o su
   costo empeora el p95 de la búsqueda (S1) por encima de 400 ms.
2. Se incorpora un componente que exige otra tecnología o hardware (revisión
   de ADR-0007).
3. Otro equipo pasa a mantener Emparejamiento o necesita desplegarlo por
   separado.
4. Se adopta un broker en la semana 12 por otra necesidad: con la
   infraestructura ya puesta, la alternativa C cuesta menos.

**Costo de revertir:** moderado. El código ya está separado por puertos y
evento; extraer implica crear el proceso, su almacén y el adaptador de
mensajería o HTTP, sin tocar el dominio.
