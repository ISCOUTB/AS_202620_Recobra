# Ficha del problema

## Nombre del proyecto

Recobra

## Problema

No existe un canal centralizado, buscable y con notificaciones que conecte de
forma eficiente a quien pierde un objeto con quien lo encuentra dentro de un
espacio delimitado (campus universitario, empresa, edificio de apartamentos,
etc.). Esto genera:

- Objetos que nunca son reclamados por falta de visibilidad.
- Tiempo perdido preguntando en múltiples canales no oficiales.
- Falta de trazabilidad sobre quién encontró qué y cuándo.
- Riesgo de fraude o falsas reclamaciones sin ningún mecanismo de verificación.

## Usuarios objetivo

Usuarios del campus (o espacio delimitado equivalente) que pierden o
encuentran objetos y necesitan un canal común para publicarlos y buscarlos, y
administradores que moderan publicaciones y resuelven reclamaciones.

## Propuesta de solución

Recobra es una plataforma con backend **NestJS** (TypeScript, arquitectura
hexagonal) y cliente **Flutter**, según
[ADR-0002](adr/0002-arquitectura-y-stack.md). Los usuarios publican objetos
como "perdido" o "encontrado"; el sistema centraliza esas publicaciones,
las hace buscables y, en su alcance objetivo (no del corte 1), las empareja
automáticamente y notifica al usuario ante una coincidencia probable, dando
trazabilidad al ciclo de vida del objeto hasta su reclamación o cierre.

## Funcionalidades iniciales

1. Centralizar publicaciones de objetos perdidos y encontrados en un solo
   lugar buscable.
2. Facilitar el emparejamiento (matching) entre publicaciones de "perdido" y
   "encontrado" mediante descripción, categoría, ubicación y fecha.
3. Notificar a los usuarios cuando exista una coincidencia probable con su
   publicación.
4. Dar trazabilidad al ciclo de vida de un objeto (publicado → en contacto →
   reclamado/cerrado).

## Alcance del MVP

El corte 1 implementa el corte vertical **crear y consultar una
publicación** (`POST/GET /publicaciones`), atravesando HTTP → caso de uso →
dominio → puerto de persistencia, con cliente Flutter consumiendo la API.
Sirve de base ejecutable para el resto de funcionalidades. En cortes
posteriores se incorporan los contextos de Emparejamiento, Notificaciones,
Reclamaciones e Identidad/Autenticación, ya delimitados en
[`docs/context-map.md`](context-map.md) y [`docs/modulo-datos.md`](modulo-datos.md).

## Tensiones de calidad

### Seguridad vs. Usabilidad en la reclamación

Exigir un mecanismo de verificación (código estudiantil o correo
institucional) antes de marcar un objeto como "reclamado" agrega pasos y
fricción al flujo del usuario que solo quiere recuperar lo suyo. Recobra
prioriza la seguridad: el escenario [S2](calidad/escenarios_calidad.md#escenario-s2--seguridad-en-una-reclamación)
exige que el 0 % de las reclamaciones llegue a "reclamado" sin completar la
verificación, aceptando el costo de usabilidad porque una reclamación falsa
compromete la confianza en toda la plataforma (ver también
[restricciones legales](calidad/restricciones_justificadas.md)).

### Disponibilidad vs. Completitud de las notificaciones

Acoplar el flujo de publicación al envío de notificaciones haría que un
fallo del proveedor de notificaciones tumbara también la publicación y la
búsqueda, que son la operación crítica del sistema. Recobra prioriza la
disponibilidad de publicar/buscar: el escenario
[S4a](calidad/escenarios_calidad.md#escenario-s4a--fallo-del-servicio-de-notificaciones-sub-escenario-de-s4)
exige que el 100 % de esas operaciones críticas se complete aunque el
servicio de notificaciones falle, aceptando que una notificación pueda
perderse o llegar tarde en ese escenario. La arquitectura hexagonal
(ADR-0002) es la táctica que aísla ese fallo del dominio.
