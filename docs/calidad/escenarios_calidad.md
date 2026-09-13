# Escenarios de calidad — Recobra

Este es el conjunto de escenarios de referencia del proyecto. Para el **corte 1**
el equipo prioriza **S5** (ancla del reto de stack), **S4/S4a** (disponibilidad /
aislamiento) y **S2** (seguridad de reclamación, decisión documentada).
S1, S3, S6 y S7 siguen vigentes para cortes posteriores; no se borran para no
perder trazabilidad.

Cada escenario tiene fuente, estímulo, artefacto, entorno, respuesta y medida.

## Escenario S1 — Rendimiento de búsqueda

- **Fuente:** Usuario que perdió o encontró un objeto.
- **Estímulo:** El usuario realiza una búsqueda aplicando filtros de categoría, ubicación y fecha.
- **Artefacto:** Módulo de búsqueda de Recobra.
- **Entorno:** Sistema funcionando con hasta 200 usuarios concurrentes.
- **Respuesta:** El sistema procesa la consulta y muestra los resultados correspondientes.
- **Medida:** Al menos el 95 % de las búsquedas debe completar su respuesta en un máximo de 400 ms, medido con el percentil p95.
- **Prioridad:** Alta.

## Escenario S2 — Seguridad en una reclamación

- **Fuente:** Usuario autenticado.
- **Estímulo:** El usuario intenta reclamar un objeto publicado como encontrado.
- **Artefacto:** Módulo de reclamaciones.
- **Entorno:** Sistema funcionando normalmente.
- **Respuesta:** El sistema solicita y valida la información necesaria para comprobar la posible propiedad del objeto antes de permitir que la reclamación avance.
- **Medida:** El 100 % de los intentos de reclamación quedan registrados con usuario, fecha y hora; el 0 % de las reclamaciones llega al estado "reclamado" sin completar antes el mecanismo de verificación definido (código estudiantil o correo institucional).
- **Prioridad:** Muy alta.

## Escenario S3 — Notificación de coincidencia

- **Fuente:** Sistema de matching.
- **Estímulo:** Se registra una publicación que presenta una coincidencia probable con un objeto perdido existente.
- **Artefacto:** Módulo de matching y notificaciones.
- **Entorno:** Sistema funcionando normalmente.
- **Respuesta:** Recobra identifica la coincidencia y genera una notificación para el usuario relacionado con el objeto perdido.
- **Medida:** Al menos el 95 % de las coincidencias que superen el umbral definido debe notificarse en un máximo de 60 segundos después de identificarse.
- **Prioridad:** Alta.

## Escenario S4 — Disponibilidad

- **Fuente:** Usuario de Recobra.
- **Estímulo:** Intenta consultar o publicar información sobre un objeto.
- **Artefacto:** Plataforma Recobra.
- **Entorno:** Operación normal durante el periodo de uso definido para el sistema.
- **Respuesta:** El sistema permite realizar la operación solicitada y, si ocurre una interrupción, recupera el servicio.
- **Medida:** Recobra debe mantener una disponibilidad mínima del 99 % mensual, sin contar mantenimientos programados e informados con anticipación.
- **Prioridad:** Alta.

### Escenario S4a — Fallo del servicio de notificaciones (sub-escenario de S4)

- **Fuente:** Servicio de notificaciones.
- **Estímulo:** El servicio de notificaciones deja de funcionar.
- **Artefacto:** Plataforma Recobra.
- **Entorno:** Sistema en operación normal.
- **Respuesta:** Los usuarios pueden seguir publicando y buscando objetos aunque un componente secundario, como el servicio de notificaciones, falle.
- **Medida:** El 100 % de las operaciones críticas de publicación y búsqueda deben completarse exitosamente durante la falla.
- **Prioridad:** Alta.

### Escenario S4b — Recuperación del sistema (sub-escenario de S4)

- **Fuente:** Fallo del sistema.
- **Estímulo:** Se produce una caída que interrumpe temporalmente el servicio.
- **Artefacto:** Plataforma Recobra.
- **Entorno:** Sistema fuera de servicio.
- **Respuesta:** El servicio vuelve a estar disponible y permite nuevamente publicar y buscar objetos.
- **Medida:** Tiempo de recuperación (RTO) de 5 minutos o menos.
- **Prioridad:** Alta.

## Escenario S5 — Mantenibilidad

- **Fuente:** Equipo de desarrollo.
- **Estímulo:** Se requiere modificar una funcionalidad existente, como agregar un nuevo filtro de búsqueda.
- **Artefacto:** Módulo de búsqueda.
- **Entorno:** Entorno de desarrollo y pruebas.
- **Respuesta:** El equipo realiza el cambio sin modificar innecesariamente otros módulos del sistema.
- **Medida:** El cambio se implementa en un máximo de 2 días de trabajo y las pruebas existentes siguen ejecutándose correctamente.
- **Prioridad:** Media.

## Escenario S6 — Trazabilidad del ciclo de vida

- **Fuente:** Usuario o sistema.
- **Estímulo:** Se modifica el estado de una publicación (publicado, en verificación, reclamado, cerrado).
- **Artefacto:** Registro del objeto en Recobra.
- **Entorno:** Objeto publicado durante su ciclo de vida.
- **Respuesta:** El sistema registra el nuevo estado junto con la información necesaria para identificar el cambio.
- **Medida:** El 100 % de los cambios de estado quedan registrados con fecha, hora y usuario responsable.
- **Prioridad:** Media.

## Escenario S7 — Escalabilidad

- **Fuente:** Equipo de desarrollo / crecimiento de la organización.
- **Estímulo:** Aumenta el número de usuarios activos y de publicaciones registradas en la plataforma.
- **Artefacto:** Plataforma Recobra (backend y capa de datos).
- **Entorno:** Operación normal, con crecimiento gradual del campus u organización.
- **Respuesta:** El sistema mantiene el nivel de servicio de búsqueda y disponibilidad sin necesitar un rediseño arquitectónico.
- **Medida:** El sistema soporta hasta 5 veces más usuarios concurrentes (de 200 a 1000) y el doble de publicaciones, manteniendo la búsqueda en 400 ms p95 mediante escalado horizontal o vertical de recursos, sin cambios estructurales en la arquitectura.
- **Prioridad:** Media.
