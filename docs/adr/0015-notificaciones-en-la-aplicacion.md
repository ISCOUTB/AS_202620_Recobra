# ADR-0015: Notificaciones dentro de la aplicación, alimentadas por eventos en proceso

## Estado

Aceptada — 2026-10-17. Implementa el contexto **Notificaciones** y responde al
escenario **S3** ([`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md#escenario-s3--notificación-de-coincidencia)).
Resuelve la consecuencia "sin notificaciones" de ADR-0014 sin modificarlo (regla
1 de ADR-0011). Usa la integración por eventos en proceso de ADR-0004.

## Contexto

S3 pide que el 95 % de las coincidencias que superen el umbral se notifique a
quien perdió el objeto en **60 segundos o menos**. Además, las reclamaciones
(ADR-0014) quedaban sin aviso: quien encontró el objeto tenía que entrar a
revisar si alguien lo reclamó, y quien reclamó, si ya le respondieron.

Hasta ahora el mapa de contextos y el C4-C1 dibujaban Notificaciones como un
**proveedor externo** de correo o push, sin código.

## Alternativas consideradas

### A. Correo electrónico (descartada por ahora)

- **A favor:** llega aunque la persona no abra Recobra.
- **En contra:** exige un proveedor de correo con dominio verificado; los planes
  gratuitos limitan el envío y piden configuración de DNS que el equipo no
  controla en el servidor del laboratorio. Sería el primer sistema externo con
  credenciales propias.

### B. Notificaciones push (descartada por ahora)

- **A favor:** aviso inmediato en el celular.
- **En contra:** exige Firebase Cloud Messaging, la cuenta del proyecto, el
  registro de cada dispositivo y permisos en la app; la vitrina web no lo
  recibiría.

### C. Bandeja de avisos dentro de Recobra (elegida)

Los eventos del dominio se convierten en avisos guardados por cuenta; la app y
la vitrina los consultan cada pocos segundos y los marcan como leídos.

- **A favor:** sin servicios externos ni costo; funciona igual en Flutter y en la
  vitrina; el aviso queda guardado aunque el usuario no esté conectado; se puede
  probar de extremo a extremo.
- **En contra:** la persona solo se entera cuando abre Recobra. La consulta
  periódica genera tráfico aunque no haya avisos.

## Decisión

Se adopta **C**, con estas reglas:

1. **Tres eventos en proceso** (`src/application/events/eventos-dominio.ts`):
   `coincidencia.detectada` (lo emite Emparejamiento por cada coincidencia nueva),
   `reclamacion.creada` y `reclamacion.resuelta` (los emite Reclamaciones).
   Notificaciones los consume con `NotificacionesListener`; ningún otro contexto
   lo llama directamente.
2. **A quién se avisa:** una coincidencia avisa a quien publicó el objeto
   **perdido**, con enlace a la publicación encontrada; una reclamación nueva, a
   quien publicó el objeto; una reclamación aprobada o rechazada, a quien
   reclamó (con el motivo si fue rechazada).
3. **Sin duplicados:** el id del aviso se deriva del evento
   (`coincidencia:<id>:<cuenta>`, `reclamacion-nueva:<id>`,
   `reclamacion-resuelta:<id>`) y se guarda con `ON CONFLICT (id) DO NOTHING`.
   Si el mismo evento llega dos veces, queda un solo aviso.
4. **Un fallo de Notificaciones no afecta a nadie más (S4a):** el manejador
   captura el error y solo registra una advertencia; publicar, emparejar y
   reclamar ya respondieron.
5. **Dueño único:** Notificaciones escribe solo su tabla `notificaciones` y lee
   publicaciones por el puerto `PublicacionRepository`.
6. **API:** `GET /notificaciones` (los 50 más recientes y el número de no
   leídos), `POST /notificaciones/{id}/leida` y `POST /notificaciones/leidas`,
   todos con sesión. Contrato 3.1.0, cambio compatible.
7. **Clientes:** campana con contador en la vitrina y en la app Flutter; ambas
   consultan la bandeja cada 20 s mientras hay sesión (la vitrina, solo con la
   pestaña visible) y al abrir la campana. Tocar un aviso lo marca como leído y
   abre la publicación (coincidencia) o "Mis cosas" (reclamación).

## Consecuencias

- **S3 se comprueba con una prueba:** `test/notificaciones.e2e-spec.ts` publica
  un objeto perdido y uno encontrado y mide cuánto tarda el aviso en aparecer en
  la bandeja (milisegundos en la prueba; el umbral es 60 s). El tiempo que ve la
  persona depende además del intervalo de consulta del cliente (20 s), que
  sigue por debajo del umbral.
- **Los avisos sobreviven a un reinicio** (tabla en PostgreSQL), aunque las
  coincidencias siguen en memoria. Un aviso puede apuntar a una coincidencia que
  ya no aparece en `GET /coincidencias` después de reiniciar; la publicación a la
  que enlaza sí existe.
- **Eventos perdidos:** igual que con Emparejamiento, si el proceso cae entre el
  cambio y la emisión del evento, el aviso no se genera. Se suma al pendiente de
  bandeja de salida de la S12.
- **Los eventos de reclamaciones llevan la publicación completa** que el caso de
  uso ya había leído, para no consultarla otra vez. Es una excepción declarada a
  la regla 4 de `docs/modulo-datos.md`, aceptable mientras el evento no salga
  del proceso; si se lleva a un broker, debe llevar solo ids.
- **C4 cambia:** Notificaciones deja de ser un sistema externo y pasa a ser un
  componente de la API. El proveedor externo de correo o push queda como
  extensión futura detrás de un puerto de salida.

## Qué haría revisar esta decisión

- Usuarios que no abren la app y pierden avisos importantes → agregar correo o
  push como un segundo canal detrás de un puerto `CanalDeAviso`, sin cambiar los
  eventos.
- Tráfico de la consulta periódica alto frente a la carga útil → cambiar a
  eventos enviados por el servidor (SSE) en la vitrina.
