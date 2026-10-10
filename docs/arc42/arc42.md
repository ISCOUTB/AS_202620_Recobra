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

### Restricciones de despliegue (S8)

- **Sin tarjeta de crédito/débito disponible** para verificar cuentas de
  proveedores de nube — descarta cualquier plataforma que la exija para el
  nivel gratuito (ver [ADR-0005](../adr/0005-plataforma-despliegue-backend.md)).
- **Límite de costo: $0/mes** mientras el proyecto sea evidencia de curso;
  cualquier pieza que no quepa en una capa gratuita verificada queda fuera
  de alcance hasta que el equipo decida pagarla explícitamente.
- Ver [`docs/despliegue/costo-mensual.md`](../despliegue/costo-mensual.md)
  para la estimación y el punto de ruptura de la capa gratuita.

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

Vista estática del backend, actualizada para el segundo corte (diagramas en
[C4-C2](../c4/C4-C2.md) y [C4-C3](../c4/C4-C3.md)):

| Bloque | Responsabilidad | Ubicación |
|--------|-----------------|-----------|
| Dominio | Entidades `Publicacion` y `Coincidencia`, sus reglas, y el error `AlmacenamientoNoDisponibleError` | `src/domain/entities/`, `src/domain/errors/` |
| Puertos | `PublicacionRepository` (guardar, buscarPorId, listarPorTipo, buscar, verificarDisponibilidad) y `CoincidenciaRepository` | `src/domain/ports/` |
| Aplicación | Casos de uso crear, consultar y **buscar** publicaciones, y **buscar coincidencias** | `src/application/use-cases/` |
| Adaptadores de persistencia | `PostgresPublicacionRepository` (con `DATABASE_URL`) y `MemoriaPublicacionRepository` (sin ella); coincidencias solo en memoria | `src/infrastructure/persistence/` |
| Adaptadores HTTP | Controladores Nest, filtros de error (400 y 503) | `src/publicaciones/`, `src/emparejamiento/`, `src/salud/` |
| Observabilidad | Logs JSON, `GET /metrics` (S5 y S1), `GET /health` y `GET /health/ready` | `src/observabilidad/`, `src/salud/` |
| Composition root | Cableado de módulos Nest y selección del adaptador | `src/app.module.ts`, `src/publicaciones/publicaciones.module.ts` |
| Clientes | App Flutter y vitrina web | `mobile/`, `public/index.html` |

Relación con C4 nivel 2: el contenedor API agrupa dominio, aplicación y
adaptadores; la persistencia es un contenedor PostgreSQL aparte.

Propiedad de datos por módulo (regla de dueño único): ver
[`docs/modulo-datos.md`](../modulo-datos.md).

## 6. Vista de ejecución

Flujo **crear publicación**:

1. El usuario envía el formulario desde Flutter o desde la vitrina.
2. `PublicacionesController` recibe `POST /publicaciones` (con la medición de latencia, S5).
3. `CrearPublicacion` valida vía la entidad `Publicacion` y llama al puerto
   `PublicacionRepository`.
4. `PostgresPublicacionRepository` guarda la fila (en memoria si no hay `DATABASE_URL`).
5. La API responde `201` y emite el evento `publicacion.creada`.
6. **De forma asíncrona** (ADR-0004), `PublicacionCreadaListener` llama a
   `BuscarCoincidencias`, que lee candidatas a través del puerto y guarda las
   coincidencias; si eso falla, solo se registra una advertencia y no afecta a
   quien publicó.

Flujo **buscar** (escenario S1): `GET /publicaciones?tipo&categoria&ubicacion&limite`
→ `BuscarPublicaciones` (valida filtros y límite 1 a 50) → puerto `buscar` → consulta
parametrizada con `LIMIT`. La latencia se registra en `GET /metrics` (bloque `busqueda`).

Flujo **consultar**: `GET /publicaciones/:id` → `ConsultarPublicacion` → puerto →
`200` o `404`. Flujo **coincidencias**: `GET /coincidencias?publicacionId=`.

**Modos de fallo.**

| Situación | Qué ocurre |
|---|---|
| Dato inválido | `PublicacionInvalidaError` → filtro → `400` con `{ statusCode, message }` |
| La base no responde al arrancar | El proceso arranca igual, reintenta preparar el esquema cada 5 s y registra una advertencia |
| La base cae o el esquema no está preparado | El adaptador lanza `AlmacenamientoNoDisponibleError` → filtro → `503` con el mismo esquema de error y un mensaje sin detalles internos; la búsqueda fallida se cuenta en `/metrics` aparte de la latencia |
| Comprobación de salud | `GET /health` responde 200 si el proceso vive (no toca la base); `GET /health/ready` responde 200 solo si la base contesta **y** el esquema está preparado, y 503 si no |

El contrato ejecutable de todas estas rutas, incluidas las respuestas `400`,
`404` y `503`, está versionado en
[`docs/contracts/openapi.yaml`](../contracts/openapi.yaml) (ADR-0004, ADR-0009)
y se prueba contra las respuestas reales en `test/contract.e2e-spec.ts` y
`test/almacenamiento-no-disponible.e2e-spec.ts`. El cliente Flutter
(`mobile/lib/api/recobra_api.dart`) consume esas mismas rutas.

## 7. Vista de despliegue

Una caja por pieza, con dónde se ejecuta hoy (ver
[ADR-0010](../adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md), que
reemplaza a ADR-0005 y, en lo del alojamiento, a ADR-0006):

| Pieza | Dónde se ejecuta | Cómo se recrea |
|---|---|---|
| API backend NestJS (y la vitrina web que sirve) | Contenedor Docker en **Dokploy**, servidor del laboratorio, a partir de [`Dockerfile`](../../Dockerfile) + [`deploy/compose.lab.yaml`](../../deploy/compose.lab.yaml); dominio `recobra.iscoutb.dev` | `docker build -t recobra-backend .` (mismo Dockerfile que valida el CI); en Dokploy, servicio Compose con la ruta `./deploy/compose.lab.yaml` |
| Cliente Flutter | Dispositivo/emulador del usuario (no es un servicio desplegado) | `cd mobile && flutter run` |
| Persistencia (`Publicacion`) | **PostgreSQL como servicio del mismo proyecto de Dokploy**, alcanzado por la red interna (`DATABASE_URL` en las variables del servicio; `DATABASE_SSL=false` porque la base interna no ofrece TLS) | `PostgresPublicacionRepository` crea su propia tabla al iniciar y reintenta en segundo plano si la base no responde; sin `DATABASE_URL` cae a memoria |
| Coincidencias | Memoria del proceso (`MemoriaCoincidenciaRepository`) | Se pierden al reiniciar; persistirlas está pendiente |

**URL pública:** https://recobra.iscoutb.dev. Comprobaciones:

| Ruta | Qué dice |
|---|---|
| `/health` | El proceso está vivo (no toca la base) |
| `/health/ready` | La base responde: `{"status":"ok","almacenamiento":"postgres"}`, o 503 si no |
| `/metrics` | Latencia de `POST` (S5) y de la búsqueda (S1), con sus errores |

Resultado del experimento sobre este entorno (escenario S1, 200 conexiones,
p97,5 = 157 ms): [`docs/medicion-s10.md`](../medicion-s10.md). Un redespliegue
deja el dominio sin servicio entre ~30 y ~50 s.

**Despliegue anterior (histórico, ADR-0005 y ADR-0006):** API en Render Free
(`recobra-backend.onrender.com`, [`render.yaml`](../../render.yaml)) y base en
Neon. Se abandonó porque, con 20 conexiones, la búsqueda superó los 1.100 ms
(umbral 400 ms) y el plan se duerme tras 15 minutos. Su verificación del
2026-09-26 está en el historial de este documento.

Estimación de costo y su punto de ruptura:
[`docs/despliegue/costo-mensual.md`](../despliegue/costo-mensual.md).
Observabilidad: `src/observabilidad/` — logs en JSON por línea, métrica en
`GET /metrics` por escenario.

## 8. Conceptos transversales

### Lenguaje ubicuo

- **Publicación**: registro de un objeto perdido o encontrado.
- **Reclamación**: solicitud de un usuario para recuperar un objeto publicado.
- **Coincidencia**: relación detectada entre una publicación "perdido" y una "encontrado".
- **Emparejamiento**: proceso que detecta coincidencias entre publicaciones.

Mapa de contextos completo: [`docs/context-map.md`](../context-map.md).

## 9. Decisiones de arquitectura

| ADR | Tema | Estado |
|-----|------|--------|
| [ADR-0001](../adr/0001-estilo-arquitectonico.md) | Estilo hexagonal (Express histórico) | Reemplazada por ADR-0002 |
| [ADR-0002](../adr/0002-arquitectura-y-stack.md) | Hexagonal + NestJS + Flutter | Aceptada |
| [ADR-0003](../adr/0003-reto-corte1-stack-obligatorio.md) | Reto corte 1 / stack obligatorio | Aceptada |
| [ADR-0004](../adr/0004-integracion-sincrona-vs-asincrona.md) | Integración síncrona (corte vertical) / asíncrona (entre contextos) | Aceptada; parcialmente reemplazada por ADR-0009 |
| [ADR-0005](../adr/0005-plataforma-despliegue-backend.md) | Plataforma de despliegue del backend (Render.com) | Reemplazada por ADR-0010 |
| [ADR-0006](../adr/0006-plataforma-persistencia-postgresql.md) | Plataforma de persistencia (Neon PostgreSQL) | Aceptada; el alojamiento fue reemplazado por ADR-0010 |
| [ADR-0007](../adr/0007-no-incorporar-componente-generativo.md) | No incorporar un LLM en tiempo de ejecución (por ahora) | Aceptada |
| [ADR-0008](../adr/0008-busqueda-con-filtros-en-el-repositorio.md) | Búsqueda con filtros resuelta en el repositorio, con límite acotado | Aceptada |
| [ADR-0009](../adr/0009-versionado-del-contrato-y-error-unico.md) | Versionado del contrato y esquema de error único (sucesor de lo que ADR-0004 no cubría) | Aceptada |
| [ADR-0010](../adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md) | Despliegue en Dokploy (servidor del laboratorio) en lugar de Render y Neon | Aceptada |
| [ADR-0011](../adr/0011-registro-de-enmiendas-a-adrs-aceptados.md) | Registro de enmiendas a ADR aceptados y regla de inmutabilidad | Aceptada |


## 10. Requisitos de calidad

Los escenarios de [`escenarios_calidad.md`](../calidad/escenarios_calidad.md) guían las
decisiones:

- **S1 Rendimiento:** búsqueda con filtros implementada y medida (aspecto A6; ADR-0008; `docs/medicion-busqueda.md`). La búsqueda de texto libre sigue fuera de alcance.
- **S2 Seguridad:** verificación de reclamaciones (futuro; aspecto A3).
- **S3 Notificaciones:** matching + push (futuro).
- **S4 / S4a / S4b Disponibilidad:** aislar fallos de infraestructura del
  dominio (aspecto A1; hexagonal).
- **S5 Mantenibilidad:** ancla del reto de corte 1 (aspecto A2; ADR-0003).
- **S6 Trazabilidad:** historial de estados (futuro).
- **S7 Escalabilidad:** crecimiento de usuarios/publicaciones (futuro).
 

## 11. Riesgos y deuda técnica

- Persistencia en PostgreSQL ya implementada; hoy corre en Dokploy (ADR-0010). El adaptador en memoria queda para pruebas locales sin `DATABASE_URL`. Las coincidencias aún están solo en memoria.
- Notificaciones, Reclamaciones e Identidad son solo diseño, sin código todavía (Emparejamiento ya se implementó, ver aspecto A5).
- Participación desigual del equipo en el historial de commits (ver `docs/no-conformidades.md`).
- **Transporte hacia la base:** con `DATABASE_SSL=false` (base interna de Dokploy) no hay TLS; con TLS activo el adaptador usa `rejectUnauthorized: false`, así que cifra pero **no valida** el certificado del servidor y no debe describirse como verificación de identidad de la base. No se verificó el aislamiento de la red interna.
- **La plataforma es el servidor del laboratorio (Dokploy), no del equipo:** si deja de estar disponible o cambia su política, hay que redesplegar en otro lado (el `Dockerfile` se reutiliza; ver el costo de revertir en ADR-0010). Un redespliegue deja el dominio sin servicio ~30-50 s. Las copias de seguridad de la base en Dokploy no están configuradas. Lo ya mitigado: los redespliegues de código no requieren cuentas (cada commit a `master` redespliega solo).

## 12. Glosario

Ver [`docs/glosarios.md`](../glosarios.md) para el glosario completo de términos del dominio (Publicación, Coincidencia, Reclamación, Notificación, Contexto Delimitado, Puerto, Adaptador, etc.).

## Documentos relacionados

- [`docs/aspectos.md`](../aspectos.md) — trazabilidad de 8 columnas.
- [`docs/c4/`](../c4/) — diagramas C4 (C4-C1 contexto, C4-C2 contenedores, C4-C3 componentes).
- [`docs/context-map.md`](../context-map.md) — contextos delimitados.
- [`docs/modulo-datos.md`](../modulo-datos.md) — propiedad de datos por módulo.
- [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml) — contrato ejecutable de la API (ADR-0004).
