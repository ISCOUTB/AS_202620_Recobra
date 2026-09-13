# Mapa de contextos - Recobra

## Nivel de módulos

El sistema está compuesto por los siguientes módulos, cada uno con una responsabilidad:

| Módulo | Responsabilidad | Dependencias |
|--------|-----------------|--------------|
| **AppModule** | Módulo raíz. Orquesta los demás módulos y sirve archivos estáticos. | PublicacionesModule, SaludModule, ServeStaticModule |
| **PublicacionesModule** | Gestiona el ciclo de vida de las publicaciones (crear, consultar) | PublicacionRepository, CrearPublicacion, ConsultarPublicacion, PublicacionInvalidaFilter |
| **SaludModule** | Verifica el estado del servicio (health check). |  |

## Diagrama de contextos
---
config:
  layout: fixed
---
flowchart TB
 subgraph PublicacionesModule["PublicacionesModule"]
        Ctrl["PublicacionesController<br>POST /publicaciones<br>GET /publicaciones/:id"]
        UC["Casos de uso<br>CrearPublicacion<br>ConsultarPublicacion"]
        Puerto["Puerto<br>PublicacionRepository"]
        Adapter["Adaptador<br>MemoriaPublicacionRepository"]
  end
 subgraph SaludModule["SaludModule"]
        Salud["GET /health"]
  end
 subgraph ServeStaticModule["ServeStaticModule"]
        Static[/"public/index.html"\]
  end
 subgraph AppModule["AppModule"]
        PublicacionesModule
        SaludModule
        ServeStaticModule
  end
    Cliente["Cliente Flutter"] -- HTTP + CORS --> API["API REST - NestJS"]
    Ctrl --> UC
    UC --> Puerto
    Puerto -. implementa .-> Adapter
    API --> Ctrl & Salud & Static
    Adapter --> DB[("Map en memoria")]

     Ctrl:::controlador
     UC:::useCases
     Puerto:::puerto
     Adapter:::adaptador
     Cliente:::cliente
     API:::api
     DB:::database
    classDef cliente stroke:#38bdf8,fill:#f0f9ff
    classDef api stroke:#a78bfa,fill:#f5f3ff
    classDef controlador stroke:#4ade80,fill:#f0fdf4
    classDef useCases stroke:#facc15,fill:#fefce8
    classDef puerto stroke:#fb923c,fill:#fff7ed
    classDef adaptador stroke:#f87171,fill:#fef2f2
    classDef database stroke:#2dd4bf,fill:#f0fdfa
