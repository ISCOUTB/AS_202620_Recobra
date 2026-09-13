# Mapa de contextos - Recobra

## Nivel de módulos

El sistema está compuesto por los siguientes módulos, cada uno con una responsabilidad:

| Módulo | Responsabilidad | Dependencias |
|--------|-----------------|--------------|
| **AppModule** | Módulo raíz. Orquesta los demás módulos y sirve archivos estáticos. | PublicacionesModule, SaludModule, ServeStaticModule |
| **PublicacionesModule** | Gestiona el ciclo de vida de las publicaciones (crear, consultar) | PublicacionRepository, CrearPublicacion, ConsultarPublicacion, PublicacionInvalidaFilter |
| **SaludModule** | Verifica el estado del servicio (health check). |  |

## Diagrama de contextos
[Cliente (Flutter Web/Android)]
↕ (HTTP + CORS)
[API REST - NestJS]
↕
┌─────────────────────────────────────────────────────────────────────────────┐
│ AppModule │
│ ┌─────────────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │
│ │ PublicacionesModule │ │ SaludModule │ │ ServeStaticModule │ │
│ │ │ │ │ │ (demo pública) │ │
│ │ ┌───────────────────┐ │ │ GET /health │ │ /public/index.html│ │
│ │ │ PublicacionesCtrl │ │ └──────────────────┘ └────────────────────┘ │
│ │ │ POST /publicaciones│ │ │
│ │ │ GET /:id │ │ │
│ │ └─────────┬─────────┘ │ │
│ │ ↓ │ │
│ │ ┌───────────────────┐ │ │
│ │ │ Casos de uso: │ │ │
│ │ │ - CrearPublicacion│ │ │
│ │ │ - ConsultarPublic.│ │ │
│ │ └─────────┬─────────┘ │ │
│ │ ↓ │ │
│ │ ┌───────────────────┐ │ │
│ │ │ Puerto: │ │ │
│ │ │ PublicacionRepo │ │ │
│ │ └─────────┬─────────┘ │ │
│ │ ↓ │ │
│ │ ┌───────────────────┐ │ │
│ │ │ Adaptador: │ │ │
│ │ │ MemoriaPublicacion│ │ │
│ │ │ Repository (Map) │ │ │
│ │ └───────────────────┘ │ │
│ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
↕
[Almacenamiento en memoria (Map) - volátil]

