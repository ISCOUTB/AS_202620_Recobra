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

# Sección 4 — Estrategia de solución

## Estrategia general

Recobra adopta una arquitectura inspirada en **Hexagonal (Ports & Adapters)** organizada como un **monolito modular**.

La lógica del dominio permanece aislada de la base de datos, la interfaz y los servicios externos, permitiendo modificar la infraestructura sin afectar las reglas del negocio.

## Capas

### Dominio
Contiene las entidades y reglas de negocio relacionadas con objetos perdidos, reclamaciones y trazabilidad.

### Aplicación
Implementa los casos de uso, coordinando las operaciones entre el dominio y los puertos.

### Infraestructura
Incluye adaptadores para persistencia, autenticación y notificaciones.

### Interfaces
Expone la aplicación mediante API REST o interfaz web.

## Beneficios

- Bajo acoplamiento.
- Mayor mantenibilidad.
- Facilita pruebas automatizadas.
- Permite reemplazar servicios externos sin modificar el dominio.
  
## Sección 5 — Requisitos de calidad

Los requisitos de calidad prioritarios para Recobra se definen en el árbol de utilidad y se verifican mediante escenarios medibles (ver `escenarios_calidad.md`). Los atributos clave son:

- **Rendimiento (S1)**: Las búsquedas y coincidencias deben ser rápidas para una experiencia de usuario fluida.
- **Seguridad (S2)**: La autenticación y verificación de reclamaciones deben proteger los datos y prevenir fraudes.
- **Disponibilidad (S4)**: El sistema debe estar operativo en horarios definidos, con tolerancia a fallos de componentes no críticos.
- **Mantenibilidad (S5)**: La arquitectura hexagonal facilita la evolución y el mantenimiento del código.
- **Trazabilidad (S6)**: Cada publicación debe tener un historial claro de estados (publicado → en contacto → reclamado/cerrado).
- **Escalabilidad (S7)**: El sistema debe permitir crecimiento progresivo en usuarios y publicaciones.

Estos atributos se priorizaron con los interesados y guían las decisiones técnicas documentadas en la Sección 10 y en los ADR.

## Sección 6 — Construcción y despliegue

### Construcción
El proyecto se construye con Node.js y npm. Los pasos para construir y ejecutar el sistema son:

1. Clonar el repositorio.
2. Ejecutar `npm install` para instalar dependencias.
3. Ejecutar `npm start` para levantar el servidor.
4. Ejecutar `npm test` para correr las pruebas automatizadas.

El sistema utiliza variables de entorno (ver `.env.example`) para configuración sensible.

### Despliegue
El despliegue inicial está pensado para un entorno de desarrollo local. Para un entorno de producción, se consideran:
- Contenedorización con Docker (futuro).
- Despliegue en un servidor con Node.js y PM2 o similar.
- Uso de variables de entorno para configurar puerto, base de datos y claves.

El diagrama de despliegue se detalla en la Sección 10 y en la documentación C4.
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
