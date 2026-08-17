# arc42 — Secciones 1 a 3 — Recobra

## Sección 1 — Introducción y objetivos

**Propósito:** centralizar la gestión de objetos perdidos y encontrados dentro de un espacio delimitado.

**Lo que buscamos:**

- Centralizar publicaciones.
- Facilitar búsquedas y coincidencias.
- Notificar coincidencias probables.
- Mantener trazabilidad.
- Reducir reclamaciones fraudulentas.

**Interesados principales:** usuarios que pierden objetos, usuarios que encuentran objetos, administradores, la organización que utiliza Recobra, el equipo de desarrollo y los responsables de seguridad. El detalle completo está en `ficha-problema.md`.

Los seis atributos de calidad y sus escenarios medibles están en `aspectos.md` y `escenarios_calidad.md`, y se conectan con las decisiones de arquitectura en la sección 10 de este mismo archivo.

## Sección 2 — Restricciones

Las restricciones principales son:

- El sistema debe funcionar dentro del alcance definido para el proyecto académico.
- Las acciones importantes deben estar asociadas a usuarios identificados.
- La información debe almacenarse de forma persistente.
- Los datos personales deben manejarse conforme a las obligaciones de privacidad aplicables.
- La solución debe poder ser mantenida por el equipo.
- El sistema debe permitir crecimiento progresivo (ver S7 en `escenarios_calidad.md`).

El detalle completo, con la justificación de cada restricción y el escenario que la verifica, está en `Restricciones_justificadas.md`.

## Sección 3 — Contexto

Recobra se ubica entre los usuarios y los servicios que permiten gestionar las publicaciones.

**Relaciones principales:**

- El usuario que perdió un objeto registra la publicación y consulta coincidencias.
- El usuario que encontró un objeto registra la información correspondiente.
- Recobra procesa las publicaciones y determina posibles coincidencias.
- Recobra notifica a los usuarios cuando encuentra una coincidencia.
- Los administradores supervisan las publicaciones y las acciones del sistema.

El diagrama de contexto de nivel 1 (C4), con personas, sistema y sistemas externos, está en `C4.md`. El contexto del problema y la tabla completa de interesados están en `ficha-problema.md`.

## Sección 10 — Relación entre escenarios y decisiones de arquitectura

Los escenarios de `escenarios_calidad.md` son la referencia que usamos para tomar decisiones durante el desarrollo. No elegimos tecnologías porque estén de moda, sino porque ayudan a cumplir los escenarios prioritarios definidos en `arbol_utilidad.md`.

- **S1 Rendimiento:** orienta las decisiones de indexación y almacenamiento para la búsqueda.
- **S2 Seguridad:** orienta autenticación, autorización y verificación de reclamaciones.
- **S3 Notificaciones:** orienta la comunicación entre el módulo de matching y el de notificaciones.
- **S4 / S4a / S4b Disponibilidad:** define los objetivos de operación, tolerancia a fallos de componentes secundarios y tiempo de recuperación.
- **S5 Mantenibilidad:** ayuda a evaluar si la estructura del código facilita los cambios.
- **S6 Trazabilidad:** orienta el diseño del historial de estados por publicación.
- **S7 Escalabilidad:** orienta las decisiones de escalado horizontal o vertical y particionamiento de datos.

Los escenarios funcionan, entonces, como evidencia para justificar decisiones de arquitectura, y más adelante pueden relacionarse con ADR y pruebas concretas.
