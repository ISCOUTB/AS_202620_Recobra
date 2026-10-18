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
   puertos, nunca de adaptadores concretos. **Precisión (S10):** no está libre
   de framework: importa `@Injectable()` de `@nestjs/common` (metadato de
   inyección) y, en `CrearPublicacion`, `EventEmitter2` de
   `@nestjs/event-emitter` para emitir `publicacion.creada`, un acoplamiento
   que ADR-0004 adopta a propósito. Lo que sí se mantiene es que no conoce HTTP
   ni la base de datos.
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
| Dominio | Entidades `Publicacion` (con su ciclo de vida), `Coincidencia`, `Cuenta`, `Reclamacion` y `Notificacion`; errores de dominio | `src/domain/entities/`, `src/domain/errors/` |
| Puertos | `PublicacionRepository` (guardar, guardarSiNoExiste, buscarPorId, listarPorTipo, buscar, cambiarEstado, listarPorAutor, verificarDisponibilidad), `CoincidenciaRepository`, `CuentaRepository`, `SesionRepository`, `ReclamacionRepository`, `NotificacionRepository`, `HashContrasenas` | `src/domain/ports/` |
| Aplicación | Publicaciones (crear, crear idempotente, consultar, buscar, cambiar estado, listar las propias), Emparejamiento, Identidad (registrar, iniciar y cerrar sesión, resolver sesión) Reclamaciones (crear, aprobar, rechazar, consultar) y Notificaciones (notificar, consultar, marcar leídas) | `src/application/use-cases/` |
| Adaptadores de persistencia | `PostgresPublicacionRepository` (con `DATABASE_URL`) y `MemoriaPublicacionRepository` (sin ella); lo mismo para cuentas, sesiones, reclamaciones, avisos y coincidencias (ADR-0018) | `src/infrastructure/persistence/` |
| Adaptadores HTTP | Controladores Nest, `AutenticacionGuard`, filtros de error (400, 401, 403, 404, 409, 422 y 503) | `src/publicaciones/`, `src/emparejamiento/`, `src/identidad/`, `src/reclamaciones/`, `src/notificaciones/`, `src/salud/` |
| Observabilidad | Logs JSON, `GET /metrics` (S5 y S1), `GET /health` y `GET /health/ready` | `src/observabilidad/`, `src/salud/` |
| Composition root | Cableado de módulos Nest y selección del adaptador | `src/app.module.ts`, `src/publicaciones/publicaciones.module.ts` |
| Clientes | App Flutter (estilo de la app UTB, `docs/diseno-ui.md`) y vitrina web; ambos con cuentas, reclamaciones y campana de avisos | `mobile/`, `public/index.html` |

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

Flujo **reclamar** (escenario S2, ADR-0014): con sesión, `POST /publicaciones/:id/reclamaciones`
→ `CrearReclamacion` comprueba que es un objeto encontrado, con autor, ajeno y sin
otra pendiente de la misma cuenta → guarda la reclamación → pide a
`CambiarEstadoPublicacion` (Publicaciones) pasar de `publicado` a `en_verificacion`.
Quien publicó la aprueba (`ResolverReclamacion.aprobar` → `en_verificacion` a
`por_entregar`, solo si sigue en verificación; las demás pendientes se rechazan) o la
rechaza con motivo (si no quedan pendientes, vuelve a `publicado`). La entrega la
confirma cualquiera de los dos (`ConfirmarEntrega` → `por_entregar` a `reclamado`,
ADR-0017).

Flujo **lo tengo yo** (ADR-0019): sobre un perdido ajeno, `ReportarHallazgo`
(Emparejamiento) crea el encontrado de quien lo tiene con `CrearPublicacion`
(Publicaciones), guarda una coincidencia explícita entre los dos y emite
`coincidencia.detectada`; el dueño recibe el aviso y lo reclama con su prueba.
Quien encontró un objeto indica dónde está (custodia) al publicar o después con
`CambiarCustodia`.

Flujo **cerrar y vencer** (ADR-0017): su autor cierra una publicación sin
reclamaciones (`CerrarPublicacion`: recuperado o retirado) y `ArchivadorVencidas`
cierra como vencido lo que lleva más de 60 días en `publicado`. Lo cerrado sale de
la búsqueda y del emparejamiento.

Flujo **avisar** (escenario S3, ADR-0015): `BuscarCoincidencias` emite
`coincidencia.detectada` por cada coincidencia nueva; `CrearReclamacion` y
`ResolverReclamacion` emiten `reclamacion.creada` y `reclamacion.resuelta`.
`NotificacionesListener` los recibe de forma asíncrona y `Notificar` guarda un
aviso para la cuenta que corresponde (quien perdió el objeto, quien lo publicó o
quien reclamó) con un id derivado del evento, así que un evento repetido no
duplica. Los clientes consultan `GET /notificaciones` y marcan como leído.

Flujo **identidad** (ADR-0013): `POST /cuentas` (correo `@utb.edu.co`, contraseña con
scrypt) → `POST /sesiones` devuelve un token opaco → las rutas protegidas lo reciben
como `Authorization: Bearer` y `AutenticacionGuard` lo resuelve; sin sesión, 401.

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
| [ADR-0012](../adr/0012-no-extraer-emparejamiento.md) | No extraer Emparejamiento como servicio aparte (por ahora), con criterios para revisarlo | Aceptada |
| [ADR-0013](../adr/0013-cuentas-con-correo-institucional-y-sesiones-opacas.md) | Cuentas propias con correo institucional y sesiones con token opaco | Aceptada |
| [ADR-0014](../adr/0014-reclamacion-con-prueba-y-aprobacion.md) | Reclamación con prueba del reclamante y aprobación de quien encontró el objeto | Aceptada |
| [ADR-0015](../adr/0015-notificaciones-en-la-aplicacion.md) | Notificaciones dentro de la aplicación, alimentadas por eventos en proceso | Aceptada |
| [ADR-0016](../adr/0016-recobra-semiindependiente-de-la-app-utb.md) | Recobra semiindependiente de la app UTB, con la integración como objetivo potencial | Aceptada |
| [ADR-0017](../adr/0017-ciclo-de-vida-completo-cierre-vencimiento-y-entrega.md) | Ciclo de vida completo: cierre, vencimiento y entrega confirmada | Aceptada |
| [ADR-0018](../adr/0018-coincidencias-persistidas-y-parecido-ponderado.md) | Coincidencias persistidas y parecido ponderado (lugar, palabras y fecha) | Aceptada |
| [ADR-0019](../adr/0019-donde-esta-el-objeto-y-lo-tengo-yo.md) | Dónde está el objeto y "Lo tengo yo" | Aceptada |
| [ADR-0020](../adr/0020-consistencia-entre-publicaciones-y-reclamaciones.md) | Consistencia entre Publicaciones y Reclamaciones: pasos retomables y reconciliación | Aceptada |
| [ADR-0021](../adr/0021-privacidad-y-datos-personales.md) | Privacidad y datos personales: consentimiento, acceso, supresión y retención | Aceptada |
| [ADR-0022](../adr/0022-moderacion-minima-reportes-y-ocultar.md) | Moderación mínima: reportar una publicación y ocultarla | Aceptada |
| [ADR-0023](../adr/0023-fotos-con-privacidad.md) | Fotos de las publicaciones con privacidad | Aceptada |


## 10. Requisitos de calidad

Los escenarios de [`escenarios_calidad.md`](../calidad/escenarios_calidad.md) guían las
decisiones:

- **S1 Rendimiento:** búsqueda con filtros implementada y medida (aspecto A6; ADR-0008; `docs/medicion-busqueda.md`). La búsqueda de texto libre sigue fuera de alcance.
- **S2 Seguridad:** reclamación con prueba y aprobación (aspecto A3; ADR-0014).
- **S3 Notificaciones:** coincidencia y bandeja de avisos en la app (aspectos A5 y A9; ADR-0015); correo o push, futuro.
- **S4 / S4a / S4b Disponibilidad:** aislar fallos de infraestructura del
  dominio (aspecto A1; hexagonal).
- **S5 Mantenibilidad:** ancla del reto de corte 1 (aspecto A2; ADR-0003).
- **S6 Trazabilidad:** ciclo de vida completo con cierre, vencimiento y entrega confirmada (ADR-0017); el historial con fecha de cada cambio sigue pendiente.
- **S7 Escalabilidad:** crecimiento de usuarios/publicaciones (futuro).
 

## 11. Riesgos y deuda técnica

### 11.1 Modos de fallo de las integraciones (S11)

Detalle completo, con código y pruebas de cada fila, en
[`docs/modos-de-fallo.md`](../modos-de-fallo.md). Resumen:

| Integración | No responde | Responde tarde | Responde dos veces |
|---|---|---|---|
| API → PostgreSQL (principal) | Conexión con límite de 3 s → 503; arranque tolerante; `/health/ready` en 503. **Probado** | `statement_timeout` 2 s y `query_timeout` 2,5 s → 503. **Probado con dobles** | Inserción atómica `ON CONFLICT (id) DO NOTHING` para reintentos. **Probado** |
| Cliente → API | Reintentos de `/health` y límite de 10 s al crear. **Implementado, sin prueba automática** | El reintento conserva la clave de idempotencia. **Probado en el servidor** | `Idempotency-Key`: 200 con la original o 422 si los datos cambian. **Probado** |
| Publicaciones → Emparejamiento | El manejador captura el error; la publicación no se afecta. **Probado** | Evento asíncrono, no bloquea. **Probado** | Id determinista por par: no duplica. **Probado** |
| Emparejamiento y Reclamaciones → Notificaciones | El manejador captura el error; publicar y reclamar no se afectan. **Implementado** | Evento asíncrono, no bloquea. **Probado** | Id del aviso derivado del evento: no duplica. **Probado** |

### 11.2 Riesgos y deuda

- **Eventos de Emparejamiento y Notificaciones perdidos:** si el proceso cae entre guardar la publicación y emitir el evento, o si el cálculo falla, esas coincidencias no se recalculan. Plan: bandeja de salida o broker en la S12.
- **Sin circuit breaker hacia la base:** con una caída larga, cada petición espera hasta 3 s antes del 503. Plan: agregarlo en el adaptador si una caída real lo justifica.
- **Vitrina sin pruebas automáticas:** sus reintentos, límites de tiempo y el bloqueo del botón están implementados pero no tienen prueba.
- **Idempotencia:** la clave ya se compara junto con el autor (una misma clave con otra cuenta responde 422), pero no se acota por cuenta; ver los límites en `docs/modos-de-fallo.md`.
- **Datos personales ([ADR-0021](../adr/0021-privacidad-y-datos-personales.md)):** hay aviso, consentimiento, descarga, eliminación (anonimizando) y retención de sesiones y avisos. Pendientes: revisión del texto por la universidad, plazo de las publicaciones cerradas, copias de seguridad y limpieza de datos personales que alguien escriba en una descripción.
- **Correo sin verificar por propiedad:** se exige `@utb.edu.co`, pero no hay código por correo (sin proveedor gratuito); lo mitiga que la entrega la aprueba una persona (ADR-0013, ADR-0014).
- **Moderación ([ADR-0022](../adr/0022-moderacion-minima-reportes-y-ocultar.md)):** cualquier cuenta reporta y los administradores (`ADMIN_CORREOS`) ocultan o descartan; no hay roles en base de datos, alertas ni apelación desde la aplicación. Una publicación oculta no se reabre. Pendiente: que la universidad defina un procedimiento propio.
- **Fotos ([ADR-0023](../adr/0023-fotos-con-privacidad.md)):** la foto completa de un encontrado solo la ven su autor y quien tiene la reclamación aprobada; el público ve una miniatura de 24 px, y el servidor quita el EXIF. Se guardan en PostgreSQL (hasta 1 MB cada una); no se revisa qué hay en la imagen y todavía no hay copias de seguridad que respeten la retención.
- **Seguridad de la cuenta pendiente:** hay límite de intentos de inicio de sesión (5 por correo en 15 minutos, en memoria del proceso, ADR-0021) pero no recuperación de contraseña; el token vive en `localStorage` de la vitrina y en las preferencias del dispositivo en la app (riesgo ante XSS o ante alguien con el dispositivo desbloqueado; el token vence a los 7 días y se revoca al cerrar sesión). Para el modelado de amenazas de la S13.
- **Consistencia al aprobar o entregar:** se escriben dos tablas sin transacción; resuelto con pasos retomables y un reconciliador ([ADR-0020](../adr/0020-consistencia-entre-publicaciones-y-reclamaciones.md)). Queda un margen de minutos de consistencia eventual y los avisos perdidos no se reenvían (haría falta una bandeja de salida).


- Persistencia en PostgreSQL ya implementada; hoy corre en Dokploy (ADR-0010). El adaptador en memoria queda para pruebas locales sin `DATABASE_URL`. Las coincidencias también se guardan en PostgreSQL desde ADR-0018.
- Todos los contextos del mapa tienen código (Notificaciones desde ADR-0015). Lo que sigue siendo diseño es el canal de correo o push y el administrador.
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
