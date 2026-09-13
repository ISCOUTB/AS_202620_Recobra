# Árbol de utilidad — Recobra

Seguimos la estructura clásica: **Utilidad → Atributo → Refinamiento → Escenario**, y priorizamos las hojas según qué tanto impacto tienen en el negocio y qué tan riesgosas son técnicamente. Los escenarios completos están en `escenarios_calidad.md`.

```text
UTILIDAD DE RECOBRA
Conectar a quienes pierden objetos con quienes los encuentran, dentro de un
espacio delimitado, facilitando la recuperación del objeto.
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

Seguridad queda primero porque una reclamación falsa golpea directamente la confianza que la gente le tiene a la plataforma. Rendimiento y notificaciones vienen justo después porque son el corazón de para qué sirve Recobra: que alguien encuentre su objeto rápido y se entere a tiempo. Disponibilidad, mantenibilidad y escalabilidad importan, pero de nada sirven si lo anterior no funciona.
