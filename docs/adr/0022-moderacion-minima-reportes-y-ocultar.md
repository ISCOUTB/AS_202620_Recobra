# ADR-0022: Moderación mínima: reportar una publicación y ocultarla

## Estado

Aceptada — 2026-10-18. Cierra el pendiente de "reportes de abuso (moderación)"
que dejó [ADR-0021](0021-privacidad-y-datos-personales.md). Contrato 5.1.0
(cambio compatible: rutas y campos nuevos).

## Contexto

Cualquier cuenta con correo `@utb.edu.co` puede publicar texto libre que ven
todos los visitantes. Sin un mecanismo para señalar abusos (publicaciones falsas,
spam, contenido ofensivo, datos personales de un tercero), lo único posible era
que el autor la retirara. Recobra no tiene hoy un equipo de moderación ni un
sistema de roles; hace falta algo proporcional al alcance.

## Alternativas consideradas

### A. Sin moderación, que decida el autor (descartada)

- **En contra:** un abuso solo desaparece si su autor quiere; no cubre datos
  personales de un tercero publicados por otra persona.

### B. Roles completos y panel de administración (descartada)

- **En contra:** es mucho más que lo que el proyecto puede sostener y revisar;
  añade tablas, permisos y pantallas para un volumen que hoy no existe.

### C. Reportes de la comunidad y administradores definidos por configuración (elegida)

## Decisión

1. **Reportar:** `POST /publicaciones/{id}/reportar` con `motivo` (`falso`,
   `spam`, `inapropiado`, `datos_personales`, `otro`) y `detalle` opcional (hasta
   300 caracteres; obligatorio con `otro`). Exige sesión: un reporte anónimo no
   tendría responsable ni freno. Una cuenta reporta una publicación **una sola
   vez**, no puede reportar la propia ni una ya cerrada.
2. **Administradores por configuración:** son las cuentas cuyo correo está en la
   variable `ADMIN_CORREOS` (separado por comas). No hay tabla de roles ni forma de
   hacerse administrador desde la API. Las respuestas de `POST /sesiones` y
   `GET /cuentas/yo` traen `esAdministrador` para que la vitrina muestre el panel;
   la autorización real está en el servidor (`AdministradorGuard`, 403).
3. **Resolver:** `GET /moderacion/reportes` (abiertos, los más antiguos primero,
   con un resumen de la publicación y cuántos reportes tiene) y
   `POST /moderacion/reportes/{id}/resolver` con `decision`:
   - `descartar`: el reporte no procedía; la publicación queda como estaba.
   - `ocultar`: cierra la publicación con motivo `moderado` (sale de la búsqueda y
     del emparejamiento), resuelve de paso los demás reportes abiertos de esa
     publicación y avisa a su autor (`publicacion_ocultada`, ya con la regla de no
     fallar si Notificaciones falla, ADR-0015).
   Cada resolución guarda quién, cuándo y con qué nota.
4. **No se oculta lo que tiene a otra persona esperando:** solo se puede ocultar
   una publicación en estado `publicado`; con una reclamación o una entrega en
   curso responde 409 hasta que eso se resuelva, para no dejar sin salida a quien
   reclamó (coherente con ADR-0020).
5. **Datos personales:** el detalle de un reporte forma parte de la descarga de
   datos de su autor y se reemplaza al eliminar la cuenta (ADR-0021).
6. **Dónde vive:** un contexto `Moderación` (`src/moderacion/`) con su entidad
   `Reporte`, su puerto y su tabla `reportes` sin claves foráneas hacia otros
   contextos; se comunica con Publicaciones por su puerto y con Notificaciones
   por un evento.

## Consecuencias

- Hay un camino para retirar abusos sin tocar la base de datos a mano, con
  trazabilidad de quién lo decidió.
- Un administrador es una persona con acceso a la configuración del despliegue;
  quitar o añadir uno exige cambiar la variable y reiniciar.
- La decisión no se puede apelar desde la aplicación: el aviso a la persona dice
  que escriba al equipo si cree que fue un error.
- Una publicación oculta no se puede reabrir (el cierre es definitivo, ADR-0017).
- Los reportes abiertos se revisan a mano; no hay alertas ni umbral automático.
  Un grupo de cuentas podría reportar en masa una publicación legítima, pero
  como nada se oculta sin que un administrador lo decida, el efecto es acumular
  trabajo de revisión, no censura.
- Una cuenta eliminada conserva sus reportes con el detalle borrado.

## Qué haría revisar esta decisión

- Que el volumen de reportes obligue a priorizar o a tener varios moderadores con
  permisos distintos: habría que pasar a roles en base de datos.
- Que la universidad defina un procedimiento de moderación propio.
- Que se agreguen fotos: habría que decidir cómo se reportan y se ocultan.
