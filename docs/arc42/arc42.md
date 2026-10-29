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

### 8.1 Lenguaje ubicuo

- **Publicación**: registro de un objeto perdido o encontrado.
- **Reclamación**: solicitud de un usuario para recuperar un objeto publicado.
- **Coincidencia**: relación detectada entre una publicación "perdido" y una "encontrado".
- **Emparejamiento**: proceso que detecta coincidencias entre publicaciones.
- **Aviso**: notificación dentro de la aplicación para una cuenta (ADR-0015).
- **Evento**: mensaje en proceso entre contextos, con sobre e identificador de correlación (ADR-0026).

Mapa de contextos completo: [`docs/context-map.md`](../context-map.md).

### 8.2 Estrategia de consistencia

**Principio.** Cada contexto es dueño único de sus tablas y **no hay transacciones
entre contextos** (`git grep` de `BEGIN|COMMIT|transaction` sobre `src/` no
encuentra nada). La consistencia **fuerte** se limita a lo que una sola sentencia
atómica de PostgreSQL puede garantizar; entre contextos la consistencia es
**eventual con desfase acotado y un mecanismo que lo repara**. Razones y
alternativa descartada (una transacción entre tablas de contextos distintos):
[ADR-0020](../adr/0020-consistencia-entre-publicaciones-y-reclamaciones.md).

Garantías con nombre que se usan abajo:

- **Fuerte:** el resultado es visible y definitivo al responder; una sola
  sentencia atómica (`INSERT … ON CONFLICT`, `UPDATE … WHERE estado = …`).
- **Eventual retomable:** varias escrituras en tablas distintas; si se interrumpe
  entre ellas, repetir la operación la termina y un reconciliador repara lo que
  nadie reintentó (saga con recuperación hacia adelante, sin deshacer).
- **Eventual por evento (al menos una vez):** el efecto llega después, por un
  evento en proceso con reintentos, cola de fallidos y conciliación (ADR-0026).

| Operación (ruta o caso de uso) | Escrituras | Garantía | Dónde se acepta el desfase y qué lo repara | Código |
|---|---|---|---|---|
| Registrar cuenta (`POST /cuentas`) | 1: `cuentas` | **Fuerte**: correo único por inserción condicional | — | `identidad.ts`, `postgres-cuenta.repository.ts` |
| Iniciar y cerrar sesión (`/sesiones`) | 1: `sesiones` | **Fuerte** | — | `identidad.ts` |
| Crear publicación (`POST /publicaciones`) | 1: `publicaciones` | **Fuerte e idempotente**: `ON CONFLICT (id) DO NOTHING` con `Idempotency-Key`; un reintento responde 200 con la original | — | `crear-publicacion.ts`, `postgres-publicacion.repository.ts` |
| Calcular coincidencias de una publicación nueva | 1: `coincidencias` (+ aviso) | **Eventual por evento**: ocurre tras responder; id de coincidencia determinista por par, así que repetir no duplica | Si el proceso cae entre guardar la publicación y calcular, **esas coincidencias no se recalculan** (riesgo vigente, §11.2) | `publicacion-creada.listener.ts`, `buscar-coincidencias.ts` |
| Reclamar (`POST /publicaciones/{id}/reclamaciones`) | 2: `reclamaciones`, luego estado de la publicación `publicado → en_verificacion` | **Eventual retomable** | Entre el paso 1 y el 2 hay un desfase de hasta 5 min; reintentar retoma y `ReconciliarReclamaciones` lo repara | `reclamaciones.ts` (`CrearReclamacion.ejecutar`, l. 39), `reconciliar-reclamaciones.ts` |
| Rechazar una reclamación | 2: `reclamaciones`, luego (si no quedan pendientes) estado `en_verificacion → publicado` | **Eventual retomable** | Igual | `reclamaciones.ts` (`ResolverReclamacion.rechazar`, l. 136) |
| Aprobar una reclamación | Estado `en_verificacion → por_entregar` **y** `reclamacion_aprobada_id` en **una** sentencia atómica; luego reclamación aprobada y rechazo de las demás | **Fuerte** para el cambio de estado (comparar y fijar, impide dos aprobaciones); **eventual retomable** para el resto | Un objeto "por entregar" con la reclamación todavía pendiente dura hasta 5 min; el reintento lee `reclamacion_aprobada_id` y la termina; el reconciliador también | `reclamaciones.ts` (`aprobar` l. 91, `completarAprobacion` l. 121), `postgres-publicacion.repository.ts` (`cambiarEstado`) |
| Confirmar la entrega | Estado `por_entregar → reclamado`, luego fecha de entrega en la reclamación | **Eventual retomable** | Igual | `reclamaciones.ts` (`ConfirmarEntrega.ejecutar`, l. 176) |
| Cerrar una publicación (retirar, recuperar) y vencimiento automático | 1: `publicaciones` | **Fuerte por fila**: `UPDATE … WHERE estado = 'publicado'`. El vencimiento corre cada 6 h | Lo que vence puede tardar hasta 6 h en cerrarse (es una regla de negocio, no una inconsistencia) | `ciclo-de-vida.ts`, `archivador-vencidas.ts` |
| Reportar una publicación | 1: `reportes` | **Fuerte**: índice único (cuenta, publicación) | — | `moderacion.ts`, `postgres-reporte.repository.ts` |
| Ocultar por moderación | Cierre `moderado` (atómico), borrar foto, evento de aviso, resolver los reportes | **Fuerte** para el cierre; el resto, **eventual retomable** | Si falla tras el cierre, el administrador repite: el cierre ya hecho se salta y se completa lo demás; la foto la borra de todos modos el barrido diario de publicaciones cerradas y el aviso lo recrea la conciliación | `moderacion.ts` (`ResolverReporte.ocultar`) |
| Subir o quitar la foto | 2: `fotos` y la marca `tiene_foto` en `publicaciones` | **Eventual retomable** | Si falla entre ambas, la foto existe pero la publicación no la anuncia hasta repetir la subida (idempotente: reemplaza) | `fotos.ts` (`SubirFoto.ejecutar`) |
| Eliminar la cuenta | Varias: publicaciones propias, pruebas, reportes, fotos, avisos, sesiones y, al final, la cuenta | **Eventual retomable**: cada paso es idempotente y la cuenta se anonimiza al final | Si falla a medias, la persona repite y continúa; mientras no termine, la cuenta sigue existiendo | `privacidad.ts` (`EliminarCuenta`) |
| Aviso a la persona (reclamación, resolución, coincidencia, ocultamiento) | 1: `notificaciones` | **Eventual por evento, al menos una vez**: id del aviso derivado del dato, `ON CONFLICT DO NOTHING` | Reintentos (segundos), cola de fallidos (hasta 7 días) y conciliación por estado (3 días); detalle en §8.4 | `entrega-de-eventos.ts`, `conciliar-avisos.ts` |
| Lecturas (búsqueda, detalle, "mis cosas") | 0 | **Fuerte sobre una tabla** (lee del único PostgreSQL, ve lo que ya se escribió); **sin garantía entre tablas**: una lista que combina publicación y reclamación puede verse a medias durante el desfase de arriba | Hasta 5 min en los casos de reclamar, aprobar y entregar | `buscar-publicaciones.ts`, `reclamaciones.ts` |

**Dos operaciones contrastadas con el código** (como pide el criterio de
verificación):

- *Aprobar* promete **fuerte** para el estado: `cambiarEstado(id, de, a,
  reclamacionAprobadaId)` es un único `UPDATE publicaciones SET estado = …,
  reclamacion_aprobada_id = … WHERE id = $1 AND estado = $2`, y dice si cambió
  una fila. Dos aprobaciones simultáneas: solo una cambia la fila. Y promete
  **eventual retomable** para guardar la reclamación aprobada: el desfase se acepta
  en `ResolverReclamacion.aprobar` (el paso 2 puede fallar y sube la excepción) y lo
  repara `completarAprobacion` al reintentar y `ReconciliarReclamaciones` cada 5
  minutos. Probado con caídas simuladas en `consistencia-reclamaciones.spec.ts`.
- *Crear publicación* promete **fuerte e idempotente**: `guardarSiNoExiste` usa
  `INSERT … ON CONFLICT (id) DO NOTHING` y devuelve si insertó; si el reintento
  llega con la misma clave, responde la original. Probado en
  `crear-publicacion-idempotente.spec.ts` y `test/idempotencia.e2e-spec.ts`.

### 8.3 Estrategia de caché

Resumen; decisión completa, alternativas y qué se rompería con una caché por
tiempo: [ADR-0025](../adr/0025-diseno-de-cache-y-politica-de-invalidacion.md).

**No hay caché de datos en el servidor** (ni en memoria ni Redis), y está
argumentado: con 200 conexiones en Dokploy la búsqueda tuvo p97,5 de 157 ms
contra el objetivo de 400 ms de S1 y p95 interno de 12,8 ms
([`docs/medicion-s10.md`](../medicion-s10.md)); no hay necesidad que una caché
resuelva, y una caché por tiempo rompería operaciones reales (aprobar, cerrar,
ocultar). Lo que sí hay es **caché HTTP**, con esta política:

| Qué | Dónde | Cuánto | Qué lo invalida |
|---|---|---|---|
| Búsqueda y detalle de publicaciones | Navegador o intermediario | **0 s**: `no-cache`, se revalida en cada uso con **ETag** (304 si no cambió) | Automática: toda escritura cambia el contenido y su ETag. Probado en `test/cache.e2e-spec.ts` (consulta condicional 304 → escritura → ya no 304) |
| Lo de una persona (sus publicaciones, avisos, reclamaciones, cuenta, datos) | — | **No se guarda**: `private, no-store` | — |
| Catálogo de lugares | Navegador y proxies | **1 hora**: `public, max-age=3600` | **Solo el tiempo**: cambia únicamente al desplegar, pero un despliegue no invalida la copia de un navegador; un lugar nuevo puede tardar hasta 1 hora en verse (aceptado: el lugar viaja como texto libre y no se valida contra el catálogo) |
| Miniatura de una foto | Navegador y proxies | **60 s**: `public, max-age=60` | Por tiempo; es el único caso en que algo ya quitado puede seguir visible, hasta 60 s |
| Foto completa | — | **No se guarda**: `private, no-store` | — |
| Vitrina y app web | Navegador | Express: se revalida con ETag y `Last-Modified` | Un despliegue |

La política por omisión (`no-cache`, o `private, no-store` con sesión) está en
`src/observabilidad/politica-de-cache.middleware.ts`; cada excepción es explícita
en su controlador. **Se reconsideraría** si el p95 interno sostenido supera 200 ms
o si se agrega una segunda instancia (una caché en el proceso divergiría).

### 8.4 Eventos entre contextos: garantías

Decisión, alternativa síncrona descartada y límites del experimento:
[ADR-0026](../adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md).
Contrato de los mensajes y criterio de compatibilidad:
[`docs/contracts/eventos.md`](../contracts/eventos.md).

- **Garantía elegida: al menos una vez, con consumidor idempotente.** Mientras el
  proceso vive, un evento se entrega hasta 3 veces (espera de 200 ms y 800 ms
  con ±20 % de variación) y, si sigue fallando, pasa a la **cola de fallidos**
  (`eventos_fallidos`), que se reprocesa cada 5 minutos y se limpia a los 7 días.
  Si el proceso muere con el evento en memoria, se pierde ("como máximo una
  vez" en ese caso) y lo recupera la **conciliación por estado**
  ([ADR-0024](../adr/0024-conciliacion-de-avisos.md)) durante 3 días.
- **Lo que se asume:** el consumidor tiene que ser idempotente y no se garantiza
  el orden entre eventos. La idempotencia se apoya en un id de aviso derivado
  del dato que lo origina, con `ON CONFLICT DO NOTHING`.
- **Trazabilidad y alerta:** el identificador de correlación del sobre aparece en
  el registro de quien emite y de quien procesa; los contadores (emitidos,
  procesados, reintentos, en cola de fallidos, reprocesados) salen en
  `GET /metrics`. Con 5 o más eventos esperando en la cola se escribe una línea de
  error (`alerta.cola_de_fallidos`) y `alertaCola` pasa a verdadero; no notifica a
  nadie por sí sola.
- **Lo que no se promete:** no es un broker durable ni exactamente una vez; una
  caída del proceso en el momento equivocado puede perder un evento que la
  conciliación solo recupera si se puede rehacer desde el dato.

### 8.5 Datos y costo de revertir decisiones

La decisión de datos más costosa de revertir es **PostgreSQL como único almacén,
con la consistencia apoyada en escrituras atómicas de una sola sentencia**, por
alcance (9 de 9 adaptadores y tablas), datos (todos los reales), error en
silencio (duplicados o estados incoherentes). Su verificación está cubierta en
parte: una suite de contrato (los 9 adaptadores) y un ensayo de respaldo y
restauración corren contra PostgreSQL real en CI; falta el respaldo programado de
producción y las pruebas e2e completas sobre PostgreSQL. Comparación con las demás
y estimación:
[ADR-0027](../adr/0027-la-decision-de-datos-mas-costosa-de-revertir.md).

### 8.6 Arquitectura de seguridad

Las amenazas, su prioridad y el estado de cada mitigación están en
[`docs/seguridad/modelo-de-amenazas.md`](../seguridad/modelo-de-amenazas.md) (26 amenazas
ancladas en el C4, con tres fronteras de confianza). Aquí está **cómo se ve la seguridad
en el sistema**: qué mecanismo hay en cada capa y dónde vive en el código.

| Capa | Mecanismo | Dónde | Amenazas |
|---|---|---|---|
| **Borde** (Cloudflare → Traefik → API) | HTTPS en el proxy; `trust proxy` de un salto (`PROXY_CONFIABLES`); la dirección real del cliente sale de `CF-Connecting-IP` solo si la conexión vino de un rango de Cloudflare; HSTS de 6 meses; `GET /metrics` muestra la huella del origen que el servidor ve, para comprobarlo | `configurar-seguridad.ts`, `origen-del-cliente.ts` | T04, T24 |
| **Cabeceras** | CSP por superficie (la vitrina permite solo su script y su estilo **por hash**, calculado al arrancar; `/app/` sin scripts en línea; la API `default-src 'none'`), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP | `cabeceras-de-seguridad.ts`, [ADR-0029](../adr/0029-cabeceras-de-seguridad-csp-y-cors.md) | T03, T22, T27 |
| **CORS** | Lista blanca (`CORS_ORIGENES`); `localhost` solo fuera de producción | `cors.ts` | T21 |
| **Cuerpo de la petición** | Se rechaza todo `Content-Encoding` distinto de `identity` (415); tope de tamaño; el único endpoint binario recibe `image/jpeg` crudo | `configurar-seguridad.ts`, `FotosController` | T07, T25 |
| **Límites de uso** | Ventanas fijas por cuenta o por origen, con 429 y `Retry-After`; huella del origen en el registro | `limite-de-uso.ts`, [ADR-0028](../adr/0028-limites-de-uso-por-cuenta-y-por-origen.md) | T05, T06, T08 |
| **Autenticación** | Cuenta con correo `@utb.edu.co`; contraseña con `scrypt` y sal propia; sesión opaca de 256 bits de la que solo se guarda el resumen; vence a los 7 días; 5 fallos por correo en 15 min | Contexto Identidad, [ADR-0013](../adr/0013-cuentas-con-correo-institucional-y-sesiones-opacas.md), [ADR-0021](../adr/0021-privacidad-y-datos-personales.md) | T02, T08 |
| **Autorización** | La cuenta sale siempre del token, nunca del cuerpo; cada caso de uso comprueba autoría o rol; los administradores (`ADMIN_CORREOS`) moderan, con registro de auditoría; la foto completa de un encontrado solo la ven su autor y quien tiene la reclamación aprobada | Guardias y casos de uso, [ADR-0014](../adr/0014-reclamacion-con-prueba-y-aprobacion.md), [ADR-0022](../adr/0022-moderacion-minima-reportes-y-ocultar.md), [ADR-0023](../adr/0023-fotos-con-privacidad.md) | T01, T09, T12, T13 |
| **Validación de entradas** | Los DTO validan forma y longitud en el borde; el dominio vuelve a validar sus invariantes; las fotos se revisan sin decodificarlas y se les quita el EXIF | `src/application`, `src/domain/fotos/jpeg.ts` | T10, T11, T25 |
| **Datos** | Solo consultas parametrizadas (con una prueba de entradas hostiles contra PostgreSQL real); lo personal mínimo; eliminación que anonimiza | Adaptadores de persistencia, [`privacidad.md`](../seguridad/privacidad.md) | T11, T14, T26 |
| **Registros y métricas** | Ids y huellas, nunca correos ni textos; `GET /metrics` expone `seguridad.limitesExcedidos` y `administradoresSinCuenta`; alerta a los administradores cuando la cola de fallidos llega a 5 | `src/observabilidad`, [ADR-0026](../adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md) | T18, T23 |
| **Cadena de suministro** | Análisis de dependencias de producción y de la app contra un registro de hallazgos **revisados y con vencimiento**; barrido de secretos de todo el historial; Dependabot; permisos mínimos del flujo; acciones fijadas por SHA | `scripts/`, `.github/`, [ADR-0030](../adr/0030-seguridad-en-el-pipeline-dependencias-secretos-y-permisos.md) | T15, T16, T17 |

Principios que sostienen la tabla: (1) toda entrada se trata como hostil en las fronteras
TB1 y TB2; (2) se prefiere un control que **falle en el flujo** a una guía que alguien deba
recordar; (3) lo que no se puede arreglar se **acepta por escrito, con motivo y fecha**
(§11.2) en vez de callarse.

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
| [ADR-0024](../adr/0024-conciliacion-de-avisos.md) | Conciliación de avisos en lugar de una tabla de eventos pendientes | Aceptada |
| [ADR-0025](../adr/0025-diseno-de-cache-y-politica-de-invalidacion.md) | Diseño de caché y política de invalidación | Aceptada |
| [ADR-0026](../adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md) | Entrega de avisos con eventos, reintentos y cola de fallidos, frente a una llamada síncrona | Aceptada |
| [ADR-0027](../adr/0027-la-decision-de-datos-mas-costosa-de-revertir.md) | La decisión de datos más costosa de revertir | Aceptada |
| [ADR-0028](../adr/0028-limites-de-uso-por-cuenta-y-por-origen.md) | Límites de uso por cuenta y por origen | Aceptada |
| [ADR-0029](../adr/0029-cabeceras-de-seguridad-csp-y-cors.md) | Cabeceras de seguridad, CSP y CORS con lista blanca | Aceptada |
| [ADR-0030](../adr/0030-seguridad-en-el-pipeline-dependencias-secretos-y-permisos.md) | Seguridad en el pipeline: dependencias, secretos y permisos | Aceptada |


## 10. Requisitos de calidad

Los escenarios de [`escenarios_calidad.md`](../calidad/escenarios_calidad.md) guían las
decisiones:

- **S1 Rendimiento:** búsqueda con filtros implementada y medida (aspecto A6; ADR-0008; `docs/medicion-busqueda.md`). La búsqueda de texto libre sigue fuera de alcance.
- **S2 Seguridad:** reclamación con prueba y aprobación (aspecto A3; ADR-0014); modelo de amenazas, límites de uso, cabeceras y control de dependencias y secretos en el flujo (S13; §8.6, ADR-0028 a 0030).
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
| Emparejamiento, Reclamaciones y Moderación → Notificaciones | Reintenta 3 veces con espera creciente y, si sigue fallando, guarda el evento en la cola de fallidos y lo reprocesa cada 5 min; publicar y reclamar no se afectan ([ADR-0026](../adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md)). **Probado** | Evento asíncrono, no bloquea. **Probado** | Id del aviso derivado del dato: no duplica, ni por entrega repetida ni por reproceso. **Probado** |

### 11.2 Riesgos y deuda

- **Eventos perdidos:** los avisos que se pierdan se recrean solos (cada 5 minutos, últimos 3 días; [ADR-0024](../adr/0024-conciliacion-de-avisos.md)). Lo que sigue sin repararse: si el proceso cae entre guardar la publicación y calcular sus coincidencias, esas coincidencias no se recalculan.
- **Sin circuit breaker hacia la base:** con una caída larga, cada petición espera hasta 3 s antes del 503. Plan: agregarlo en el adaptador si una caída real lo justifica.
- **Vitrina sin pruebas automáticas:** sus reintentos, límites de tiempo y el bloqueo del botón están implementados pero no tienen prueba.
- **Idempotencia:** la clave ya se compara junto con el autor (una misma clave con otra cuenta responde 422), pero no se acota por cuenta; ver los límites en `docs/modos-de-fallo.md`.
- **Datos personales ([ADR-0021](../adr/0021-privacidad-y-datos-personales.md)):** hay aviso, consentimiento, descarga, eliminación (anonimizando) y retención de sesiones y avisos. Pendientes: revisión del texto por la universidad, plazo de las publicaciones cerradas, copias de seguridad y limpieza de datos personales que alguien escriba en una descripción.
- **Correo sin verificar por propiedad (T01, T02):** se exige `@utb.edu.co`, pero no hay código por correo (sin proveedor gratuito); lo mitiga que la entrega la aprueba una persona (ADR-0013, ADR-0014). Para los administradores se agregó detección: aviso al arrancar y cada 6 h por cada correo de `ADMIN_CORREOS` sin cuenta, y métrica. Ver §11.3.
- **Moderación ([ADR-0022](../adr/0022-moderacion-minima-reportes-y-ocultar.md)):** cualquier cuenta reporta y los administradores (`ADMIN_CORREOS`) ocultan o descartan, con una línea de auditoría en el registro; no hay roles en base de datos ni apelación desde la aplicación. Una publicación oculta no se reabre. Pendiente: que la universidad defina un procedimiento propio.
- **Fotos ([ADR-0023](../adr/0023-fotos-con-privacidad.md)):** la foto completa de un encontrado solo la ven su autor y quien tiene la reclamación aprobada; el público ve una miniatura de 24 px, y el servidor quita el EXIF. Se guardan en PostgreSQL (hasta 1 MB cada una); no se revisa qué hay en la imagen y todavía no hay copias de seguridad que respeten la retención.
- **Seguridad de la cuenta:** hay límite de intentos de inicio de sesión (5 por correo en 15 minutos, en memoria del proceso, ADR-0021) pero no recuperación de contraseña. El token vive en `localStorage` de la vitrina (la CSP de ADR-0029 impide que un script ajeno lo lea o lo envíe fuera, T03) y en las preferencias del dispositivo en la app (T19, §11.3).
- **Límites de uso en memoria (ADR-0028):** se reinician con el proceso y, con más de una instancia, cada una contaría por su lado; la ventana es fija (en su borde se puede hacer hasta el doble). No hay un tope global de escrituras a la base.
- **Credencial filtrada fuera del repositorio (T15, riesgo 25):** la contraseña de la base y la URL del webhook de despliegue aparecieron en capturas de pantalla. El repositorio está limpio (barrido de 180 commits), pero **hasta que se rote la contraseña, se cierre el puerto externo y se regenere el webhook, el riesgo sigue abierto**. Es una acción de quien administra el panel de Dokploy.
- **Dependencias con avisos (T16):** 7 paquetes de producción con 13 avisos, todos por NestJS 10, revisados uno por uno (la función afectada no se usa; lo vigila `alcance-de-dependencias.spec.ts`). Las decisiones **vencen el 15-dic-2026**; el plan es migrar a NestJS 11 o 12 antes (ADR-0030).
- **Consistencia al aprobar o entregar:** se escriben dos tablas sin transacción; resuelto con pasos retomables y un reconciliador ([ADR-0020](../adr/0020-consistencia-entre-publicaciones-y-reclamaciones.md)). Queda un margen de minutos de consistencia eventual; los avisos perdidos los recrea la conciliación (ADR-0024).


- Persistencia en PostgreSQL ya implementada; hoy corre en Dokploy (ADR-0010). El adaptador en memoria queda para pruebas locales sin `DATABASE_URL`. Las coincidencias también se guardan en PostgreSQL desde ADR-0018.
- Todos los contextos del mapa tienen código (Notificaciones desde ADR-0015). Lo que sigue siendo diseño es el canal de correo o push.
- Participación desigual del equipo en el historial de commits (ver `docs/no-conformidades.md`).
- **Transporte hacia la base:** con `DATABASE_SSL=false` (base interna de Dokploy) no hay TLS; con TLS activo el adaptador usa `rejectUnauthorized: false`, así que cifra pero **no valida** el certificado del servidor y no debe describirse como verificación de identidad de la base. No se verificó el aislamiento de la red interna.
- **La plataforma es el servidor del laboratorio (Dokploy), no del equipo:** si deja de estar disponible o cambia su política, hay que redesplegar en otro lado (el `Dockerfile` se reutiliza; ver el costo de revertir en ADR-0010). Un redespliegue deja el dominio sin servicio ~30-50 s. El **respaldo programado de la base en Dokploy no está configurado** (acción del equipo): el procedimiento de respaldo y restauración sí está verificado en CI, pero no se ha restaurado nunca un respaldo de producción (`docs/despliegue/respaldos.md`). Lo ya mitigado: los redespliegues de código no requieren cuentas (cada commit a `master` redespliega solo).

### 11.3 Amenazas aceptadas y por qué (S13)

Las amenazas que el equipo **decidió no mitigar del todo**, con su motivo. Cualquier otra del
[modelo de amenazas](../seguridad/modelo-de-amenazas.md) está mitigada o figura como pendiente
(T15, T26, T16) con su dueño.

| ID | Riesgo | Por qué se acepta | Qué lo haría revisar |
|---|:-:|---|---|
| **T02** (y el residuo de T01) | 9 | Verificar la propiedad del correo exige un proveedor de correo que el proyecto no tiene (ADR-0013). Lo contiene que la entrega la **aprueba una persona**, que el contacto solo se revela tras aprobar y que borrar la cuenta pide la contraseña. Para los administradores hay detección, no prevención | Conseguir un proveedor de correo gratuito; o que la UTB ofrezca inicio de sesión institucional |
| **T19** | 6 | El token de la app queda en las preferencias del dispositivo sin cifrar: leerlo exige acceso físico o malware, y el token **vence a los 7 días y se revoca al cerrar sesión**. El almacenamiento seguro del sistema agrega una dependencia nativa y es una mejora, no un hueco explotable a distancia | Que la app maneje datos más sensibles, o un incidente |
| **T14** | 4 | El mensaje de registro revela que un correo institucional ya tiene cuenta. Los correos `@utb.edu.co` no son secretos y ocultarlo empeoraría el registro; el inicio de sesión no lo revela | Que se admitan correos que no sean públicos |
| **T08** (residuo) | 6 | Quien falla a propósito puede bloquear 15 min el inicio de sesión de un correo ajeno. Es el costo de limitar los intentos por correo; el bloqueo es corto y no revela nada | Quejas reales, o un segundo factor |
| **T24** (residuo) | 6 | Si el servicio se expusiera **sin** el proxy, un cliente podría falsificar `X-Forwarded-For`. En el despliegue real todo pasa por Traefik; el salto de confianza es configurable | Cambiar de plataforma o de topología de red |
| **T16** (avisos de NestJS 10) | 12 → menor | 13 avisos que no se pueden quitar sin migrar a Express 5. Cada uno se probó **no alcanzable** (la función afectada no se usa) y la decisión **vence el 15-dic-2026** | El vencimiento, o cualquier uso nuevo de las funciones afectadas (la prueba de alcance lo avisa) |

Una amenaza **aceptada** tiene dueño y fecha de revisión; una **pendiente** (T15, T26) es una
mitigación que sí se quiere y falta, y no se acepta aunque dependa de otra persona.

## 12. Glosario

Ver [`docs/glosarios.md`](../glosarios.md) para el glosario completo de términos del dominio (Publicación, Coincidencia, Reclamación, Notificación, Contexto Delimitado, Puerto, Adaptador, etc.).

## Documentos relacionados

- [`docs/aspectos.md`](../aspectos.md) — trazabilidad de 8 columnas.
- [`docs/c4/`](../c4/) — diagramas C4 (C4-C1 contexto, C4-C2 contenedores, C4-C3 componentes).
- [`docs/context-map.md`](../context-map.md) — contextos delimitados.
- [`docs/modulo-datos.md`](../modulo-datos.md) — propiedad de datos por módulo.
- [`docs/contracts/openapi.yaml`](../contracts/openapi.yaml) — contrato ejecutable de la API (ADR-0004).
- [`docs/contracts/eventos.md`](../contracts/eventos.md) — contrato de los eventos entre contextos y criterio de compatibilidad (ADR-0026).
- [`docs/taller-mensajes.md`](../taller-mensajes.md) — evidencia del taller de mensajes y consistencia (S12).
- [`docs/seguridad/modelo-de-amenazas.md`](../seguridad/modelo-de-amenazas.md) — modelo de amenazas, prioridad y plan de mitigación (S13).
- [`docs/seguridad/analisis-de-dependencias.md`](../seguridad/analisis-de-dependencias.md), [`barrido-de-secretos.md`](../seguridad/barrido-de-secretos.md), [`privacidad.md`](../seguridad/privacidad.md) — evidencia de la S13.
