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
| **Publicaciones** (`src/domain/entities/publicacion.ts`, `src/publicaciones/`) | `Publicacion` — id, tipo (perdido/encontrado), descripción, categoría, ubicación (lugar del campus), detalle de ubicación (piso, salón o referencia), estado, motivo y fecha de cierre (ADR-0017), custodia y punto de custodia de los encontrados (ADR-0019), creadoEn, autorId. También el **catálogo de lugares** con sus pisos (`src/domain/lugares/catalogo-lugares.ts`, `GET /lugares`) | Emparejamiento, Reclamaciones | Lectura por el puerto `PublicacionRepository` (`buscarPorId`, `listarPorTipo`); evento `publicacion.creada`. **Escritura del estado solo por `CambiarEstadoPublicacion`**, el caso de uso de Publicaciones que Reclamaciones invoca (ADR-0014) |
| **Emparejamiento** (implementado — `src/emparejamiento/`) | `Coincidencia` — id, publicación origen referenciada, publicación coincidente referenciada, score, estado, creadoEn | Notificaciones | Puerto `CoincidenciaRepository`; endpoint de solo lectura `GET /coincidencias?publicacionId=` (ver `docs/contracts/openapi.yaml`); evento `coincidencia.detectada` hacia Notificaciones (ADR-0015) |
| **Notificaciones** (implementado, `src/notificaciones/`, ADR-0015) | `Notificacion` — cuenta destinataria, tipo, título, mensaje, publicación referenciada, leída, fecha | — (hoja del grafo de dependencias; nadie más necesita este dato) | Solo la propia cuenta, por `GET /notificaciones`; lee publicaciones por el puerto `PublicacionRepository` |
| **Identidad** (implementado, `src/identidad/`, ADR-0013) | `Cuenta` — id, correo institucional, nombre, hash de la contraseña; `Sesion` — hash del token, cuenta, vencimiento | Publicaciones (autor), Reclamaciones (reclamante y contacto) | Ambos guardan solo el id de la cuenta; Reclamaciones lee nombre y correo por el puerto `CuentaRepository`, nunca el hash |
| **Reclamaciones** (implementado, `src/reclamaciones/`, ADR-0014) | `Reclamacion` — publicación referenciada, cuenta reclamante, prueba, estado, fecha, resolución, motivo y fecha de entrega confirmada (ADR-0017) | — | Puerto `ReclamacionRepository`; rutas de lectura solo para el autor del objeto y para el propio reclamante |
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

A la fecha, `Publicacion` y `Coincidencia` están materializadas en código:
[`memoria-publicacion.repository.ts`](../src/infrastructure/persistence/memoria-publicacion.repository.ts)
(o su adaptador PostgreSQL, ver ADR-0006) y
[`memoria-coincidencia.repository.ts`](../src/infrastructure/persistence/memoria-coincidencia.repository.ts).
Desde 2026-10-17 también están en código `Cuenta`, `Sesion` y `Reclamacion`,
cada una con su tabla propia y sin claves foráneas hacia tablas de otros
contextos (la referencia es por id). También `Notificacion` (tabla
`notificaciones`, ADR-0015). Los eventos de reclamaciones llevan la publicación
ya leída, una excepción declarada a la regla 4 mientras no salgan del proceso.
