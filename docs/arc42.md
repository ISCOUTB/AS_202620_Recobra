# arc42 — Secciones 1 a 3 — Recobra

## Sección 1 — Introducción y objetivos

**Propósito:** centralizar la gestión de objetos perdidos y encontrados dentro de un espacio delimitado.

**Objetivos principales:**

- Centralizar publicaciones.
- Facilitar búsquedas y coincidencias.
- Notificar coincidencias probables.
- Mantener trazabilidad.
- Reducir reclamaciones fraudulentas.

**Interesados principales:** usuarios que pierden objetos, usuarios que encuentran objetos, administradores, la organización que utiliza Recobra, el equipo de desarrollo y los responsables de seguridad. Detalle completo en `ficha-problema.md`.

**Requisitos de calidad:** los seis atributos y sus escenarios medibles se detallan en `aspectos.md` y `escenarios_calidad.md`, y se relacionan con las decisiones arquitectónicas en la sección 10 de este archivo.

## Sección 2 — Restricciones

Las restricciones principales son:

- El sistema debe funcionar dentro del alcance definido para el proyecto académico.
- Las acciones importantes deben estar asociadas a usuarios identificados.
- La información debe almacenarse de forma persistente.
- Los datos personales deben manejarse de acuerdo con las obligaciones de privacidad aplicables.
- La solución debe poder ser mantenida por el equipo.
- El sistema debe permitir crecimiento progresivo (ver S7 en `escenarios_calidad.md`).

El detalle completo, con la justificación de cada restricción y el escenario que la verifica, está en `Restricciones_justificadas.md`.

## Sección 3 — Contexto

Recobra se encuentra entre los usuarios y los servicios que permiten gestionar las publicaciones.

**Relaciones principales:**

- El usuario que perdió un objeto registra la publicación y consulta coincidencias.
- El usuario que encontró un objeto registra la información correspondiente.
- Recobra procesa las publicaciones y determina posibles coincidencias.
- Recobra notifica a los usuarios cuando encuentra una coincidencia.
- Los administradores supervisan las publicaciones y acciones del sistema.

El diagrama de contexto (nivel 1 de C4), con personas, sistema y sistemas externos, está en `C4.md`. El contexto del problema y la tabla de interesados completa están en `ficha-problema.md`.

## Sección 10 — Relación entre escenarios y decisiones arquitectónicas

Los escenarios de `escenarios_calidad.md` sirven como referencia para tomar decisiones durante el desarrollo. La arquitectura no debe seleccionar tecnologías solamente porque sean populares, sino porque ayudan a cumplir los escenarios prioritarios definidos en `arbol_utilidad.md`.

- **S1 Rendimiento:** orienta las decisiones de indexación y almacenamiento para búsqueda.
- **S2 Seguridad:** orienta las decisiones de autenticación, autorización y verificación de reclamaciones.
- **S3 Notificaciones:** orienta la comunicación entre el procesamiento de coincidencias y el sistema de notificaciones.
- **S4 / S4a / S4b Disponibilidad:** permite establecer objetivos de operación, tolerancia a fallos de componentes secundarios y tiempo de recuperación.
- **S5 Mantenibilidad:** ayuda a evaluar si la estructura del código facilita los cambios.
- **S6 Trazabilidad:** orienta el diseño del historial de estados por publicación.
- **S7 Escalabilidad:** orienta decisiones de escalado horizontal/vertical y particionamiento de datos.

De esta manera, los escenarios funcionan como evidencia para justificar las decisiones arquitectónicas y pueden relacionarse posteriormente con ADR y pruebas.
