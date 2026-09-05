# arc42 — Recobra

## 1. Introducción y objetivos

**Propósito:** centralizar la gestión de objetos perdidos y encontrados dentro de un espacio delimitado.

**Objetivos:**

- Centralizar publicaciones.
- Facilitar búsquedas y coincidencias.
- Notificar coincidencias probables.
- Mantener trazabilidad del ciclo de vida.
- Reducir reclamaciones fraudulentas.

**Interesados principales:** usuarios que pierden/encuentran objetos, administradores, la organización anfitriona, el equipo de desarrollo y responsables de seguridad.

Los atributos de calidad y escenarios medibles están en
[`docs/escenarios_calidad.md`](escenarios_calidad.md) y se enlazan con decisiones
en la [sección 10](#10-requisitos-de-calidad) y en [`docs/aspectos.md`](aspectos.md).

## 2. Restricciones

Además de las restricciones propias del proyecto
([`Restricciones_justificadas.md`](Restricciones_justificadas.md)), el curso fija:

- Backend en **NestJS** o **FastAPI**.
- Frontend en **Flutter** o **NextJS**.

La respuesta a esa restricción está en
[ADR-0002](adr/0002-arquitectura-y-stack.md) y
[ADR-0003](adr/0003-reto-corte1-stack-obligatorio.md).

## 3. Contexto

Recobra se ubica entre los usuarios del campus y los servicios que permiten
gestionar publicaciones, coincidencias y (a futuro) notificaciones e identidad
institucional.

El diagrama de contexto (C4 nivel 1) está en [`docs/c4/README.md`](c4/README.md).

## 4. Estrategia de solución

Ver el detalle completo en
[`docs/arc42/04-estrategia-solucion.md`](arc42/04-estrategia-solucion.md).

Resumen: arquitectura **hexagonal** implementada con **NestJS** (backend) y
**Flutter** (cliente).

## 5. Bloques de construcción

Vista estática del backend del corte 1:

| Bloque | Responsabilidad | Ubicación |
|--------|-----------------|-----------|
| Dominio | Entidad `Publicacion` y reglas de validación | `src/domain/entities/` |
| Puertos | Contrato `PublicacionRepository` | `src/domain/ports/` |
| Aplicación | Casos de uso crear/consultar | `src/application/use-cases/` |
| Adaptador de persistencia | Memoria (reemplazable por PostgreSQL) | `src/infrastructure/persistence/` |
| Adaptador HTTP | Controladores Nest + filtro de errores de dominio | `src/publicaciones/`, `src/salud/` |
| Composition root | Cableado de módulos Nest | `src/app.module.ts`, `src/main.ts` |
| Cliente | UI Flutter del corte | `mobile/` |

Relación con C4 nivel 2: el contenedor API agrupa dominio + aplicación +
adaptadores; el contenedor Flutter es `mobile/`.

## 6. Vista de ejecución

Flujo del corte vertical **crear publicación**:

1. El usuario envía el formulario desde Flutter (`mobile/`) o desde la vitrina
   `public/index.html`.
2. `PublicacionesController` recibe `POST /publicaciones`.
3. `CrearPublicacion` valida vía la entidad `Publicacion` y llama al puerto
   `PublicacionRepository`.
4. `MemoriaPublicacionRepository` persiste en memoria y devuelve la entidad.
5. La API responde `201` con el JSON de la publicación.

Flujo **consultar**: `GET /publicaciones/:id` → `ConsultarPublicacion` → puerto →
`200` o `404`.

Si la entidad lanza `PublicacionInvalidaError`, el filtro Nest responde `400`
sin filtrar la regla de negocio hacia el controlador.

## 9. Decisiones de arquitectura

| ADR | Tema | Estado |
|-----|------|--------|
| [ADR-0001](adr/0001-estilo-arquitectonico.md) | Estilo hexagonal (Express histórico) | Reemplazada por ADR-0002 |
| [ADR-0002](adr/0002-arquitectura-y-stack.md) | Hexagonal + NestJS + Flutter | Aceptada |
| [ADR-0003](adr/0003-reto-corte1-stack-obligatorio.md) | Reto corte 1 / stack obligatorio | Aceptada |

## 10. Requisitos de calidad

Los escenarios de [`escenarios_calidad.md`](escenarios_calidad.md) guían las
decisiones:

- **S1 Rendimiento:** indexación/almacenamiento de búsqueda (futuro).
- **S2 Seguridad:** verificación de reclamaciones (futuro; aspecto A3).
- **S3 Notificaciones:** matching + push (futuro).
- **S4 / S4a / S4b Disponibilidad:** aislar fallos de infraestructura del
  dominio (aspecto A1; hexagonal).
- **S5 Mantenibilidad:** ancla del reto de corte 1 (aspecto A2; ADR-0003).
- **S6 Trazabilidad:** historial de estados (futuro).
- **S7 Escalabilidad:** crecimiento de usuarios/publicaciones (futuro).
