# Glosario de términos - Recobra

| Término | Definición |
|---------|------------|
| **Objeto perdido** | Cualquier artículo que un usuario reporta como extraviado dentro del espacio delimitado (campus, edificio, etc.). |
| **Objeto encontrado** | Cualquier artículo que un usuario reporta como hallado para ponerlo a disposición de su dueño. |
| **Reclamación** | Proceso mediante el cual un usuario solicita la devolución de un objeto perdido, verificando su identidad. |
| **Matching / Coincidencia** | Proceso automático que compara publicaciones de "perdido" y "encontrado" para encontrar las posibles coincidencias. |
| **Trazabilidad** | Capacidad de seguir el ciclo de vida de una publicación (creada, en contacto, reclamada, cerrada). |
| **Puertos y Adaptadores (Hexagonal)** | Patrón de arquitectura que aísla la lógica de negocio de los detalles externos (API, BD, etc.). |
| **Corte vertical** | Funcionalidad mínima ejecutable que demuestra el flujo completo desde la interfaz hasta la persistencia: crear y consultar una publicación (`POST/GET /publicaciones`) a través de HTTP → caso de uso → dominio → puerto de persistencia. `/health` solo confirma que el proceso arrancó. |
| **NestJS** | Framework TypeScript del backend elegido (ADR-0002), con módulos e inyección de dependencias. |
| **Flutter** | Framework del cliente móvil/web elegido (ADR-0002) para publicar y consultar objetos. |

