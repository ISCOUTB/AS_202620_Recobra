# Mapa de contextos - Recobra

## Nivel de módulos

El sistema está compuesto por los siguientes módulos, cada uno con una responsabilidad:

| Módulo | Responsabilidad | Dependencias |
|--------|-----------------|--------------|
| **AppModule** | Módulo raíz. Orquesta los demás módulos y sirve archivos estáticos. | PublicacionesModule, SaludModule, ServeStaticModule |
| **PublicacionesModule** | Gestiona el ciclo de vida de las publicaciones (crear, consultar) | PublicacionRepository, CrearPublicacion, ConsultarPublicacion, PublicacionInvalidaFilter |
| **SaludModule** | Verifica el estado del servicio (health check). |  |

## Diagrama de contextos
## Diagrama de contextos

```mermaid
graph TD
    Cliente[Cliente Flutter] -->|HTTP + CORS| API[API REST - NestJS]
    
    subgraph AppModule
        subgraph PublicacionesModule
            Ctrl[PublicacionesController<br/>POST /publicaciones<br/>GET /publicaciones/:id]
            UC[Casos de uso<br/>CrearPublicacion<br/>ConsultarPublicacion]
            Puerto[Puerto<br/>PublicacionRepository]
            Adapter[Adaptador<br/>MemoriaPublicacionRepository]
            
            Ctrl --> UC
            UC --> Puerto
            Puerto -.implementa.-> Adapter
        end
        
        subgraph SaludModule
            Salud[GET /health]
        end
        
        subgraph ServeStaticModule
            Static[/public/index.html]
        end
    end
    
    API --> Ctrl
    API --> Salud
    API --> Static
    Adapter --> DB[(Map en memoria)]
```

