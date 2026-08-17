# Escenarios de calidad — Recobra

Este archivo contiene el conjunto único y canónico de escenarios del proyecto. Reemplaza cualquier numeración S1-S5 usada previamente en el árbol de utilidad visual, que tenía escenarios distintos bajo los mismos nombres (ver nota al final).

## Escenario S1 — Rendimiento de búsqueda

- **Fuente:** Usuario que perdió o encontró un objeto.
- **Estímulo:** El usuario realiza una búsqueda aplicando filtros de categoría, ubicación y fecha.
- **Artefacto:** Módulo de búsqueda de Recobra.
- **Entorno:** Sistema funcionando con hasta 200 usuarios concurrentes.
- **Respuesta:** El sistema procesa la consulta y muestra los resultados correspondientes.
- **Medida:** Al menos el 95 % de las búsquedas debe completar su respuesta en un máximo de 400 ms, medido mediante el percentil p95.
- **Prioridad:** Alta.

## Escenario S2 — Seguridad en una reclamación

- **Fuente:** Usuario autenticado.
- **Estímulo:** El usuario intenta reclamar un objeto publicado como encontrado.
- **Artefacto:** Módulo de reclamaciones.
- **Entorno:** Sistema funcionando normalmente.
- **Respuesta:** El sistema solicita y valida la información necesaria para comprobar la posible propiedad del objeto antes de permitir que la reclamación avance.
- **Medida:** El sistema registra usuario, fecha y hora de cada intento de reclamación; ninguna reclamación pasa al estado "reclamado" sin completar previamente el mecanismo de verificación definido.
- **Prioridad:** Muy alta.

## Escenario S3 — Notificación de coincidencia

- **Fuente:** Sistema de matching.
- **Estímulo:** Se registra una publicación que presenta una coincidencia probable con un objeto perdido existente.
- **Artefacto:** Módulo de matching y notificaciones.
- **Entorno:** Sistema funcionando normalmente.
- **Respuesta:** Recobra identifica la coincidencia y genera una notificación para el usuario relacionado con el objeto perdido.
- **Medida:** Al menos el 95 % de las coincidencias que superen el umbral definido debe generar la notificación correspondiente en un máximo de 60 segundos después de identificarse la coincidencia.
- **Prioridad:** Alta.

## Escenario S4 — Disponibilidad

- **Fuente:** Usuario de Recobra.
- **Estímulo:** Intenta consultar o publicar información sobre un objeto.
- **Artefacto:** Plataforma Recobra.
- **Entorno:** Operación normal durante el periodo de uso definido para el sistema.
- **Respuesta:** El sistema permite realizar la operación solicitada y, si ocurre una interrupción, recupera el servicio.
- **Medida:** Recobra debe mantener una disponibilidad mínima del 99 % mensual, excluyendo mantenimientos programados previamente informados.
- **Prioridad:** Alta.

### Escenario S4a — Fallo del servicio de notificaciones (sub-escenario de S4)

- **Fuente:** Servicio de notificaciones.
- **Estímulo:** El servicio de notificaciones deja de funcionar.
- **Artefacto:** Plataforma Recobra.
- **Entorno:** Sistema en operación normal.
- **Respuesta:** Los usuarios pueden continuar publicando y buscando objetos aunque un componente secundario, como el servicio de notificaciones, falle.
- **Medida:** El 100 % de las operaciones críticas de publicación y búsqueda deben completarse exitosamente durante la falla.
- **Prioridad:** Alta.

### Escenario S4b — Recuperación del sistema (sub-escenario de S4)

- **Fuente:** Fallo del sistema.
- **Estímulo:** Se produce una caída que interrumpe temporalmente el servicio.
- **Artefacto:** Plataforma Recobra.
- **Entorno:** Sistema fuera de servicio.
- **Respuesta:** El servicio vuelve a estar disponible y permite nuevamente publicar y buscar objetos.
- **Medida:** Tiempo de recuperación (RTO) ≤ 5 minutos.
- **Prioridad:** Alta.

## Escenario S5 — Mantenibilidad

- **Fuente:** Equipo de desarrollo.
- **Estímulo:** Se requiere modificar una funcionalidad existente, como agregar un nuevo filtro de búsqueda.
- **Artefacto:** Módulo de búsqueda.
- **Entorno:** Entorno de desarrollo y pruebas.
- **Respuesta:** El equipo realiza el cambio sin modificar innecesariamente otros módulos del sistema.
- **Medida:** Un cambio de este tipo debe poder implementarse en un máximo de 2 días de trabajo y las pruebas existentes deben continuar ejecutándose correctamente.
- **Prioridad:** Media.

## Escenario S6 — Trazabilidad del ciclo de vida

- **Fuente:** Usuario o sistema.
- **Estímulo:** Se modifica el estado de una publicación (publicado, en verificación, reclamado, cerrado).
- **Artefacto:** Registro del objeto en Recobra.
- **Entorno:** Objeto publicado durante su ciclo de vida.
- **Respuesta:** El sistema registra el nuevo estado junto con la información necesaria para identificar el cambio.
- **Medida:** El 100 % de los cambios de estado deben quedar registrados correctamente con fecha, hora y usuario responsable.
- **Prioridad:** Media.

## Escenario S7 — Escalabilidad

- **Fuente:** Equipo de desarrollo / crecimiento de la organización.
- **Estímulo:** Aumenta el número de usuarios activos y de publicaciones registradas en la plataforma.
- **Artefacto:** Plataforma Recobra (backend y capa de datos).
- **Entorno:** Operación normal, con crecimiento gradual del campus u organización.
- **Respuesta:** El sistema mantiene el nivel de servicio de búsqueda y disponibilidad sin requerir un rediseño arquitectónico.
- **Medida:** El sistema debe soportar un incremento de hasta 5x en usuarios concurrentes (de 200 a 1000) y duplicar el volumen de publicaciones, manteniendo el tiempo de búsqueda p95 ≤ 400 ms mediante escalado horizontal/vertical de recursos, sin cambios estructurales en la arquitectura.
- **Prioridad:** Media.

---

**Nota de consolidación:** una versión anterior del árbol de utilidad usaba una numeración S1-S5 distinta (fallo de notificaciones, recuperación del sistema, consulta de publicaciones, detección de coincidencia, registro de cambios de estado) con medidas que contradecían las de este archivo (por ejemplo, 2 s p95 en vez de 400 ms para búsqueda). Ese contenido no se descartó: quedó incorporado aquí como S4a y S4b, y las demás ideas quedaron representadas en S1, S3 y S6. A partir de esta versión, S1-S7 es el único conjunto de referencia para todo el proyecto.
