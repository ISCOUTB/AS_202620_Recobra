# Estimación de costo mensual — backend en Render.com + base de datos en Neon

Ver [ADR-0005](../adr/0005-plataforma-despliegue-backend.md) (backend) y
[ADR-0006](../adr/0006-plataforma-persistencia-postgresql.md) (base de
datos) para las decisiones de plataforma. Esta estimación sale del volumen
del escenario de Recobra, no del catálogo genérico del proveedor.

## Supuestos de volumen (del escenario de calidad, no inventados)

- Base: escenario S1 de
  [`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md) —
  **hasta 200 usuarios concurrentes** en el entorno objetivo.
- Supuesto de actividad: cada usuario concurrente genera en promedio 1
  petición cada 30 s durante su sesión activa (crear o consultar
  publicaciones) → ~200 × 2 = 400 peticiones/min en el pico de 200
  concurrentes.
- Supuesto de uso real (no todo el día a pico): el tráfico de un sistema de
  campus se concentra en horario de clases (~10 h/día), con el resto del día
  por debajo del umbral que mantiene el servicio despierto (Render Free
  duerme tras 15 min sin tráfico) → el servicio no corre 24/7 a plena carga,
  se estima uso efectivo de cómputo de **~10-12 h/día**, no 24 h/día.

## Capa gratuita de Render (verificada, plan Free)

| Recurso | Límite Free | Uso estimado de Recobra |
|---|---|---|
| Horas de cómputo compartidas por cuenta | 750 h/mes | ~300-370 h/mes (10-12 h/día × 30 días), con un solo servicio |
| Ancho de banda saliente | 100 GB/mes | Tráfico JSON de publicaciones es de bytes, no de archivos — muy por debajo incluso a 1000 usuarios concurrentes (escenario S7) |
| Tarjeta requerida | No | Verificado en esta entrega |

## Capa gratuita de Neon (base de datos, plan Free)

| Recurso | Límite Free | Uso estimado de Recobra |
|---|---|---|
| Almacenamiento | 0.5 GB | Cada publicación son unos pocos cientos de bytes; a 1000 usuarios concurrentes (escenario S7) esto tardaría años en llenarse |
| Tarjeta requerida | No | — |

**Costo actual: $0/mes** (backend + base de datos).

## Punto en que se rompe la capa gratuita

No es el volumen de peticiones (JSON pequeño, lejos del límite de ancho de
banda) — son dos disparadores distintos:

1. **Horas de cómputo compartidas agotadas:** si se agrega un segundo
   servicio Free (p. ej. cuando Notificaciones se implemente como sistema
   externo real, ver [`docs/context-map.md`](../context-map.md) —
   Emparejamiento ya corre dentro del mismo proceso de la API, no suma un
   servicio aparte) y la suma de horas supera 750 h/mes. Con el uso
   estimado de arriba (~300-370 h/mes de uno solo), hay margen para un
   segundo servicio de tamaño similar antes de romper el límite.
2. **Necesidad de "siempre despierto":** el plan Free duerme el servicio
   tras 15 min sin tráfico sin importar cuántas horas queden disponibles. Si
   el escenario de disponibilidad exige cero arranques en frío (p. ej. un
   SLA formal), hay que migrar al plan **Starter de Render, USD 7/mes por
   servicio**, independientemente del volumen de peticiones.
3. **Almacenamiento de Neon agotado:** a 0.5 GB, con filas de unos pocos
   cientos de bytes, se necesitarían millones de publicaciones — no es un
   riesgo real en el horizonte de este curso, pero si se llega ahí, el
   siguiente escalón de Neon es de pago por uso, no un salto a un plan fijo.

## Procedimiento de reversión

Si el costo o el rendimiento en Render deja de ser aceptable: el
`Dockerfile` no cambia; solo se reemplaza `render.yaml` por el manifiesto
del nuevo proveedor y se apunta el DNS/URL nueva. Costo de reversión medio
(ver ADR-0005, sección "Qué revisaría esta decisión").
