# Árbol de utilidad — Recobra

Estructura: **Utilidad → Atributo → Refinamiento → Escenario**, priorizando las hojas según impacto en el negocio y riesgo técnico. Los escenarios referenciados están definidos completos en `escenarios_calidad.md`.

```text
UTILIDAD DE RECOBRA
Facilitar la recuperación de objetos perdidos dentro de un espacio delimitado,
conectando a quienes pierden objetos con quienes los encuentran.
│
├── Seguridad — Prioridad 1
│   ├── Protección contra reclamaciones falsas
│   │   └── S2 — Verificación de reclamaciones
│   │      Impacto: Muy alto | Riesgo: Alto
│   │
│   └── Trazabilidad de reclamaciones
│       └── S6 — Registro de cambios de estado
│          Impacto: Alto | Riesgo: Medio
│
├── Rendimiento — Prioridad 2
│   └── Búsqueda eficiente
│       └── S1 — Búsqueda ≤ 400 ms p95
│          Impacto: Alto | Riesgo: Medio
│
├── Notificaciones — Prioridad 3
│   └── Coincidencia perdido-encontrado
│       └── S3 — Notificación ≤ 60 s
│          Impacto: Alto | Riesgo: Medio
│
├── Disponibilidad — Prioridad 4
│   ├── Acceso continuo
│   │   └── S4 — Disponibilidad ≥ 99 % mensual
│   │      Impacto: Alto | Riesgo: Medio
│   │
│   ├── Continuidad ante falla de un componente secundario
│   │   └── S4a — Fallo del servicio de notificaciones
│   │      Impacto: Alto | Riesgo: Medio
│   │
│   └── Recuperación ante fallos del sistema
│       └── S4b — RTO ≤ 5 minutos
│          Impacto: Alto | Riesgo: Medio
│
├── Mantenibilidad — Prioridad 5
│   └── Facilidad para realizar cambios
│       └── S5 — Cambio en búsqueda ≤ 2 días
│          Impacto: Medio | Riesgo: Medio
│
└── Escalabilidad — Prioridad 6
    └── Crecimiento de usuarios y publicaciones
        └── S7 — Soporte de 5x usuarios concurrentes
           Impacto: Medio | Riesgo: Medio
```

## Priorización

| Escenario | Impacto | Riesgo técnico | Prioridad |
|---|---|---|---|
| S2 — Seguridad / reclamaciones | Muy alto | Alto | **1** |
| S1 — Búsqueda | Alto | Medio | **2** |
| S3 — Notificaciones | Alto | Medio | **3** |
| S4 / S4a / S4b — Disponibilidad | Alto | Medio | **4** |
| S5 — Mantenibilidad | Medio | Medio | **5** |
| S7 — Escalabilidad | Medio | Medio | **6** |
| S6 — Trazabilidad | Alto | Medio | Transversal a S2 |

La seguridad ocupa el primer lugar porque una falsa reclamación afecta directamente la confianza en Recobra. El rendimiento y las notificaciones son igualmente relevantes porque forman parte del propósito principal de la plataforma: que quien perdió un objeto encuentre información útil rápidamente. La escalabilidad se agrega en esta versión con prioridad y escenario propio (S7), antes ausente.

## Nota de corrección respecto a versiones previas

Una versión anterior de este árbol usaba escenarios S1-S5 distintos a los de `escenarios_calidad.md` (bajo los mismos nombres), no incluía una rama de Seguridad pese a ser la prioridad más alta del proyecto, y no tenía ningún escenario para Escalabilidad. Esta versión corrige los tres problemas y queda alineada 1:1 con `escenarios_calidad.md` y `aspectos.md`.
