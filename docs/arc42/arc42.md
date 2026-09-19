# arc42 — Recobra

Documentación de arquitectura siguiendo la plantilla arc42, en un solo
archivo (antes estaba dividida en `docs/arc42.md` + `docs/arc42/`, y luego en
varios archivos por sección dentro de `docs/arc42/`; se unificó aquí, con el
mismo nombre de archivo que usan otros equipos del curso, para no tener la
documentación fragmentada).

## 1. Introducción y objetivos

**Propósito:** centralizar la gestión de objetos perdidos y encontrados dentro de un espacio delimitado.

**Objetivos:**

- Centralizar publicaciones.
- Facilitar búsquedas y coincidencias.
- Notificar coincidencias probables.
- Mantener trazabilidad del ciclo de vida.
- Reducir reclamaciones fraudulentas.

**Interesados principales:** usuarios que pierden/encuentran objetos, administradores, la organización anfitriona, el equipo de desarrollo y responsables de seguridad.

Ficha completa del problema, usuarios objetivo, propuesta de solución y
tensiones de calidad en [`docs/ficha_problema.md`](../ficha_problema.md).

Los atributos de calidad y escenarios medibles están en
[`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md) y se enlazan con decisiones
en la [sección 10](#10-requisitos-de-calidad) y en [`docs/aspectos.md`](../aspectos.md).

## 2. Restricciones

Además de las restricciones propias del proyecto
([`restricciones_justificadas.md`](../calidad/restricciones_justificadas.md)), el curso fija:

- Backend en **NestJS** o **FastAPI**.
- Frontend en **Flutter** o **NextJS**.

La respuesta a esa restricción está en
[ADR-0002](../adr/0002-arquitectura-y-stack.md) y
[ADR-0003](../adr/0003-reto-corte1-stack-obligatorio.md).

## 3. Contexto

Recobra se ubica entre los usuarios del campus y los servicios que permiten
gestionar publicaciones, coincidencias y (a futuro) notificaciones e identidad
institucional.

El diagrama de contexto (C4 nivel 1) está en [`docs/c4/C4-C1.md`](../c4/C4-C1.md).
Los contextos delimitados (bounded contexts) y sus fronteras de datos están en
[`docs/context-map.md`](../context-map.md).

## 4. Estrategia de solución

### 4.1 Contexto y restricciones que condicionan la decisión

La elección del estilo arquitectónico de Recobra parte de tres insumos ya
producidos en S1/S2 y no de una preferencia estética:

- **Atributo de calidad prioritario:** disponibilidad (definido en S1 como el
  primero de la lista), seguido de seguridad (escenario S2) y usabilidad del
  flujo de emparejamiento.
- **Restricciones organizativas:** equipo de 4 personas, sin experiencia previa
  en el dominio de arquitectura hexagonal como tal, con calendario de curso
  fijo (Corte 1 en la semana 4).
- **Restricciones técnicas ya adoptadas:** stack obligatorio del curso
  (NestJS|FastAPI + Flutter|NextJS). Decisión del equipo: NestJS + Flutter,
  con PostgreSQL como persistencia objetivo. Ver ADR-0002 y ADR-0003.

De aquí se deriva el criterio de selección: el estilo debe (a) permitir probar
las reglas de emparejamiento y notificación sin levantar base de datos ni HTTP
real (soporta disponibilidad y facilita pruebas automatizadas), y (b) mantener
una curva de aprendizaje razonable para un equipo junior en un semestre.

### 4.2 Matriz comparativa de estilos arquitectónicos

Se evaluaron tres estilos candidatos: **arquitectura en capas** (layered),
**arquitectura hexagonal** (puertos y adaptadores) y **monolito modular**
(módulos por dominio dentro de un único desplegable, sin capas transversales
obligatorias). Escala de 1 (bajo) a 5 (alto) para cada criterio; el peso
refleja la prioridad del proyecto según los atributos de calidad de S2.

| Criterio (peso) | Capas | Hexagonal | Monolito modular |
|---|---|---|---|
| Testabilidad del dominio sin infraestructura (peso 3) | 2 — las capas superiores suelen depender de las inferiores concretas | 5 — el dominio solo depende de puertos (interfaces) | 3 — depende de qué tan disciplinado sea el aislamiento por módulo |
| Aislamiento del framework/HTTP/DB (peso 3) | 2 — el acoplamiento a Nest/PG suele filtrarse hacia arriba si no hay puertos | 5 — adaptadores son intercambiables sin tocar el dominio | 3 — aislado por módulo, pero no hay frontera formal de puertos |

| Curva de aprendizaje para el equipo (peso 2) | 5 — es el estilo que ya conocen de otros cursos | 2 — requiere entender puertos/adaptadores e inversión de dependencias | 4 — es capas + separación por carpetas de dominio, más intuitivo |
| Velocidad para llegar al Corte 1 con esqueleto ejecutable (peso 2) | 4 — rápido de montar | 3 — requiere definir puertos desde el inicio | 4 — rápido, cercano a lo que ya tenían |
| Soporte a disponibilidad (aislar fallos de notificación/DB) (peso 3) | 2 — un fallo en la capa de datos tiende a propagarse | 5 — el puerto de notificación puede fallar/mockearse sin tumbar el caso de uso | 3 — se puede lograr, pero no es el foco del estilo |
| Facilidad de mantenimiento a mediano plazo (semanas 5-16) (peso 2) | 3 | 4 | 4 |
| **Total ponderado** | **2.7** | **4.1** | **3.5** |

Cálculo: `(criterio × peso)` sumado y dividido entre la suma de pesos (15).

### 4.3 Decisión

Se selecciona **arquitectura hexagonal (puertos y adaptadores)** para el
backend de Recobra, implementada con **NestJS** y cliente **Flutter**.
El detalle está en
[`docs/adr/0002-arquitectura-y-stack.md`](../adr/0002-arquitectura-y-stack.md)
y el marco del reto de corte 1 en
[`docs/adr/0003-reto-corte1-stack-obligatorio.md`](../adr/0003-reto-corte1-stack-obligatorio.md).
ADR-0001 queda como histórico reemplazado.

### 4.4 Principios de diseño derivados de la decisión

1. El paquete `domain/` no importa nada de `infrastructure/` ni de Nest HTTP.
   Solo define entidades y puertos.
2. `application/use-cases/` orquesta el dominio y depende únicamente de
   puertos, nunca de adaptadores concretos. `@Injectable()` es metadato de DI,
   no acoplamiento a transporte.
3. Los adaptadores viven fuera del dominio: `src/publicaciones/` (entrada HTTP
   Nest) y `src/infrastructure/persistence/` (salida de datos). Ambos son
   reemplazables sin tocar el dominio.
4. Toda prueba automatizada del dominio y de los casos de uso debe poder
   correr sin base de datos real ni servidor HTTP levantado.
5. El composition root (`src/app.module.ts` / `src/main.ts`) es el único lugar
   que conoce qué adaptador concreto implementa cada puerto.

### 4.5 Consecuencias operativas para la Semana 4

- La semana 4 empieza implementando entidades y puertos del dominio
  (publicación, emparejamiento, notificación), no montaje de proyecto.
- Cada nuevo caso de uso se prueba primero contra los puertos (con dobles de
  prueba/mocks), y solo después se conecta al adaptador real de PostgreSQL.
- Cualquier cambio de proveedor de notificaciones (correo, push, etc.) se
  resuelve agregando un adaptador nuevo, sin modificar `domain/` ni
  `application/`.

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

Propiedad de datos por módulo (regla de dueño único): ver
[`docs/modulo-datos.md`](../modulo-datos.md).

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
| [ADR-0001](../adr/0001-estilo-arquitectonico.md) | Estilo hexagonal (Express histórico) | Reemplazada por ADR-0002 |
| [ADR-0002](../adr/0002-arquitectura-y-stack.md) | Hexagonal + NestJS + Flutter | Aceptada |
| [ADR-0003](../adr/0003-reto-corte1-stack-obligatorio.md) | Reto corte 1 / stack obligatorio | Aceptada |
| [ADR-0004](../adr/0004-integracion-sincrona-vs-asincrona.md) | Integración síncrona (corte vertical) / asíncrona (entre contextos) | Aceptada |

## 10. Requisitos de calidad

Los escenarios de [`escenarios_calidad.md`](../calidad/escenarios_calidad.md) guían las
decisiones:

- **S1 Rendimiento:** indexación/almacenamiento de búsqueda (futuro).
- **S2 Seguridad:** verificación de reclamaciones (futuro; aspecto A3).
- **S3 Notificaciones:** matching + push (futuro).
- **S4 / S4a / S4b Disponibilidad:** aislar fallos de infraestructura del
  dominio (aspecto A1; hexagonal).
- **S5 Mantenibilidad:** ancla del reto de corte 1 (aspecto A2; ADR-0003).
- **S6 Trazabilidad:** historial de estados (futuro).
- **S7 Escalabilidad:** crecimiento de usuarios/publicaciones (futuro).

## Documentos relacionados

- [`docs/aspectos.md`](../aspectos.md) — trazabilidad de 8 columnas.
- [`docs/c4/`](../c4/) — diagramas C4 (C4-C1 contexto, C4-C2 contenedores, C4-C3 componentes).
- [`docs/context-map.md`](../context-map.md) — contextos delimitados.
- [`docs/modulo-datos.md`](../modulo-datos.md) — propiedad de datos por módulo.
- [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml) — contrato ejecutable de la API (ADR-0004).
