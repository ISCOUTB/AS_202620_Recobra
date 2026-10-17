# ADR-0013: Cuentas propias con correo institucional y sesiones con token opaco

## Estado

Aceptada — 2026-10-17. Implementa el contexto **Identidad**, que el mapa de
contextos ([`docs/context-map.md`](../context-map.md)) tenía como "planeado,
sistema externo". Es requisito del escenario S2 (reclamación con
verificación). No modifica ningún ADR anterior.

## Contexto

Para reclamar un objeto con verificación (S2) hace falta saber **quién**
publica y **quién** reclama. El escenario fija el mecanismo: código
estudiantil o **correo institucional**. Hasta ahora la API no tenía usuarios:
cualquiera publicaba sin identificarse.

El equipo decidió que **publicar y reclamar exigen cuenta**; buscar y
consultar siguen libres. Las restricciones son las de siempre: $0/mes, sin
tarjeta, todo en el servidor del laboratorio (ADR-0010).

## Alternativas consideradas

### A. Inicio de sesión con el proveedor institucional (Microsoft/Google de la UTB) (descartada por ahora)

- **A favor:** la identidad la verifica la universidad; nadie gestiona
  contraseñas en Recobra.
- **En contra:** exige registrar la aplicación en el directorio de la UTB,
  algo que el equipo no puede hacer por su cuenta. Sin ese acceso, no hay
  forma de probarlo.

### B. Cuentas propias con correo `@utb.edu.co` y token JWT firmado (descartada)

- **A favor:** el servidor no necesita guardar sesiones.
- **En contra:** un JWT no se puede revocar antes de que venza sin una lista
  de revocación, que es justo una tabla de sesiones; además exige gestionar y
  rotar una clave de firma (un secreto más en el despliegue) y una dependencia
  nueva.

### C. Cuentas propias con correo `@utb.edu.co` y token opaco con sesión en la base (elegida)

- **A favor:** cerrar sesión invalida el token de inmediato; el token es un
  valor aleatorio de 256 bits sin información dentro; de la base solo se guarda
  su **hash**, así que leer la tabla no permite usar las sesiones. No requiere
  dependencias nuevas: `scrypt`, `randomBytes` y `sha256` vienen en Node.
- **En contra:** cada petición protegida consulta la tabla de sesiones; la
  verificación del correo es solo de **dominio**, no de propiedad (ver
  consecuencias).

## Decisión

Se adopta **C**:

- **Registro** (`POST /cuentas`): correo obligatoriamente `@utb.edu.co`,
  normalizado a minúsculas y único (la unicidad la asegura la base, de forma
  atómica); nombre de 2 a 80 caracteres; contraseña de 8 a 128.
- **Contraseñas:** `scrypt` con sal aleatoria de 16 bytes por contraseña y
  comparación de tiempo constante (`src/infrastructure/seguridad/`), detrás
  del puerto `HashContrasenas`.
- **Sesiones** (`POST /sesiones`): token aleatorio de 32 bytes, entregado una
  sola vez; se guarda su SHA-256 con vencimiento a **7 días**. Se envía como
  `Authorization: Bearer <token>`. `DELETE /sesiones` lo invalida.
- **Mensajes de error:** el mismo para "correo no registrado" y "contraseña
  incorrecta", y en ambos casos se calcula un hash, para no revelar qué correos
  tienen cuenta ni por el texto ni por el tiempo de respuesta.
- **Protección de rutas:** `AutenticacionGuard`; sin sesión válida, 401 con
  `WWW-Authenticate: Bearer`.

## Consecuencias

- **Cambio incompatible en el contrato:** `POST /publicaciones` exige sesión,
  así que el contrato pasa a 3.0.0. La vitrina ya inicia sesión. **La app
  Flutter aún no:** puede buscar y consultar, pero al publicar recibe 401.
  Adaptarla está pendiente.
- **El correo no se verifica por propiedad:** se exige el dominio
  institucional, pero no se envía un código al correo porque no hay proveedor
  de correo sin costo. Alguien podría registrar un correo `@utb.edu.co` ajeno.
  Lo mitiga que la entrega del objeto la aprueba una persona (ADR-0014). Se
  revisa cuando haya proveedor de correo o acceso al directorio de la UTB.
- **Pendientes de seguridad** (para el modelado de amenazas de la S13): límite
  de intentos de inicio de sesión, recuperación de contraseña y limpieza
  periódica de sesiones vencidas (hoy se borran al intentar usarlas).
- El token vive en `localStorage` de la vitrina: un XSS podría leerlo. La
  vitrina pinta todo con `textContent` y nunca con `innerHTML`, pero es un
  riesgo declarado.

## Qué haría revisar esta decisión

- Acceso al directorio de la UTB → alternativa A, con un adaptador nuevo detrás
  de los mismos puertos.
- Tener un proveedor de correo sin costo → verificar la propiedad del correo
  con un código.
- Que la consulta de sesión por petición se note en la latencia (S1): hoy es
  una búsqueda por clave primaria.
