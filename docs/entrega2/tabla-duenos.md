# Tabla de dueños de datos - Recobra

Cada conjunto de datos tiene un único módulo responsable de su creación, modificación y eliminación.

| Módulo/Dueño | Datos que posee (crea, modifica, elimina) | Datos que solo consulta | Persistencia |
|--------------|--------------------------------------------|--------------------------|--------------|
| **PublicacionesModule** | `Publicacion` (id, tipo, descripción, categoria, ubicación, creadoEn, estado) | - | `MemoriaPublicacionRepository` (Map en memoria) |
| **SaludModule** | - | - | - |
| **AppModule** | - | - | - |

## Observaciones

- **Único dueño actual**: `PublicacionesModule` es el único dueño de datos de negocio en el sistema.
- **Persistencia volátil**: El adaptador `MemoriaPublicacionRepository` guarda en un `Map`, por lo que los datos se pierden al reiniciar el servidor.
- **Falta de dueño para usuarios**: No existe un módulo de autenticación/usuarios, por lo que los datos de identidad no tienen dueño asignado (violación detectada).
- **Puerto bien definido**: `PublicacionRepository` actúa como contrato, y el adaptador concreto se inyecta en `PublicacionesModule` mediante la línea:
  `{ provide: PublicacionRepository, useClass: MemoriaPublicacionRepository }`
- **Generación de identidad**: El `id` de cada `Publicacion` se genera con `randomUUID()` en el caso de uso `CrearPublicacion`, y la fecha con `new Date().toISOString()`.
