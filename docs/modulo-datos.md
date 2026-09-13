# Módulo → Datos, con dueño único

Tabla de propiedad de datos exigida junto con el [mapa de contextos](context-map.md):
cada dato del sistema tiene **un único módulo dueño**, que es el único que
puede escribirlo. Cualquier otro módulo que lo necesite lo consulta por
referencia (id) o por un puerto/evento expuesto por el dueño — nunca copia ni
reescribe el dato original. Esto evita que dos módulos terminen siendo dueños
de la misma tabla, que es la no conformidad más común en un mapa de contextos.

## Tabla de propiedad

| Módulo (contexto) | Dato del que es dueño único | Otros módulos que lo consultan | Cómo lo consultan (sin duplicar) |
|---|---|---|---|
| **Publicaciones** (`src/domain/entities/publicacion.ts`, `src/publicaciones/`) | `Publicacion` — id, tipo (perdido/encontrado), descripción, categoría, ubicación, estado, creadoEn | Emparejamiento, Reclamaciones | Puerto `PublicacionRepository.buscarPorId(id)` (ya implementado); a futuro, evento `PublicacionCreada` |
| **Emparejamiento** (planeado) | `Coincidencia` — publicación "perdido" referenciada, publicación "encontrado" referenciada, score, estado de la coincidencia | Notificaciones | Evento `CoincidenciaDetectada` publicado por Emparejamiento; Notificaciones no lee la tabla de coincidencias directamente |
| **Notificaciones** (planeado, sistema externo) | `Notificacion` — destinatario, canal (correo/push), contenido, estado de envío | — (hoja del grafo de dependencias; nadie más necesita este dato) | No aplica |
| **Identidad / Autenticación** (planeado, sistema externo) | `Usuario` — id, credenciales, rol | Publicaciones (autor), Reclamaciones (reclamante) | Ambos guardan solo el `usuarioId` devuelto por Identidad, nunca las credenciales ni el resto del perfil |
| **Reclamaciones** (planeado) | `Reclamacion` — publicación referenciada, usuario reclamante, evidencia de verificación, estado, fecha | — | Expondría un puerto de solo lectura si otro contexto futuro necesitara el estado de una reclamación |
| **Salud** (`src/salud/`) | Ninguno — expone únicamente `GET /health` como verificación de proceso vivo | — | No aplica |

## Reglas derivadas

1. **Un dato, un dueño.** Si una tabla o entidad aparece en la columna
   "dueño" de más de un módulo, es una no conformidad del mapa y debe
   corregirse antes de implementar el módulo que la duplica.
2. **Las referencias cruzan por id, no por copia.** `Reclamacion` guarda
   `publicacionId`, no una copia de `descripcion`/`categoria`/`ubicacion` de
   la publicación. Si se necesitan esos campos para mostrarlos, se piden en el
   momento al módulo Publicaciones (o se cachea explícitamente, documentando
   que es una copia de lectura, no una segunda fuente de verdad).
3. **Los sistemas externos (Identidad, Notificaciones) nunca reciben
   escritura directa desde el dominio de Recobra.** Solo se les llama a
   través de un puerto de salida (mismo patrón que
   `PublicacionRepository` en `src/domain/ports/`), consistente con
   [ADR-0002](adr/0002-arquitectura-y-stack.md).
4. **Los eventos entre contextos llevan solo el id y los campos mínimos
   necesarios** (por ejemplo, `CoincidenciaDetectada` lleva los dos ids de
   publicación, no las publicaciones completas), para que cada módulo pueda
   evolucionar su propio modelo sin romper a los demás.

## Estado actual vs. objetivo

Hoy, en el corte 1, el único dato realmente materializado en código es
`Publicacion`, en el adaptador de memoria
[`src/infrastructure/persistence/memoria-publicacion.repository.ts`](../src/infrastructure/persistence/memoria-publicacion.repository.ts).
Las filas de `Coincidencia`, `Notificacion`, `Usuario` y `Reclamacion` son el
diseño de propiedad de datos que guiará su implementación en los próximos
cortes, evitando que se decidan de forma improvisada cuando ya haya código
escrito.
