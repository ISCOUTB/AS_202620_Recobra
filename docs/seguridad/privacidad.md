# Privacidad: datos personales que trata Recobra y con qué base

Evidencia de la semana 13. Es la vista de seguridad de una decisión que ya existe
([ADR-0021](../adr/0021-privacidad-y-datos-personales.md): aviso, consentimiento, descarga,
eliminación y retención) y de las fotos ([ADR-0023](../adr/0023-fotos-con-privacidad.md)); aquí se
contrasta con el **modelo de datos real**. El aviso que ve la gente (`GET /privacidad`, versión
`2026-10-19`) sale de una sola fuente: `src/domain/privacidad/aviso-privacidad.ts`.

> Borrador del equipo (proyecto académico de la UTB). **No es asesoría legal**; antes de un uso
> institucional lo debe revisar quien corresponda en la universidad.

## 1. Qué datos personales trata (contrastado con las tablas)

Recobra **sí trata datos personales**: un correo y un nombre ya lo son. Se comprobó con la búsqueda
que pide la ficha sobre el código (`git grep` de `correo|email|telefono|cedula|documento|direccion|nombre_completo`):
aparecen el correo y el nombre de la cuenta; **no existe ninguna columna ni campo** de teléfono, cédula,
documento ni dirección (las apariciones de «documentos» son la categoría de objeto perdido y una
advertencia al usuario de no escribirlos).

| Dato | Dónde vive (tabla · campo) | Qué es | ¿Lo ve alguien más? |
|---|---|---|---|
| **Correo institucional** | `cuentas.correo` | Dato personal que identifica | Solo la otra parte de una entrega, **después** de que se aprueba la reclamación; y los administradores no lo ven en pantalla |
| **Nombre** | `cuentas.nombre` | Dato personal | Igual que el correo; en las listas solo se ve el nombre de quien reclama a quien publicó |
| **Contraseña** | `cuentas.hash_contrasena` | Nunca se guarda: solo su resumen con `scrypt` | Nadie, ni los administradores |
| **Sesión** | `sesiones.token_hash` y fechas | Resumen del token (el token no se guarda) | Nadie |
| **Aceptación del aviso** | `cuentas.privacidad_aceptada_en`, `privacidad_version` | Constancia de la autorización | La propia persona (descarga de datos) |
| **Textos escritos por la persona** | `publicaciones.descripcion` y `detalle_ubicacion`, `reclamaciones.prueba`, `reportes.detalle` | Texto libre: puede contener datos personales sin querer | La descripción: **todo el mundo**. La prueba: solo quien publicó el objeto. El detalle de un reporte: administradores |
| **Fotos** | `fotos.completa`, `fotos.miniatura` (`BYTEA`) | Imágenes del objeto; podrían mostrar personas o documentos | Miniatura de 24 px: pública. Completa: ver ADR-0023 (perdidos públicos; encontrados, solo su autor y quien tiene la reclamación aprobada). Sin EXIF ni ubicación |
| **Avisos** | `notificaciones.titulo`, `mensaje` | Textos con la descripción de un objeto | Solo su destinatario |
| **Eventos fallidos** | `eventos_fallidos.carga` | Ids y la descripción pública; **no** la prueba ni correos (lo verifica `eventos-contrato.spec.ts`) | Quien opera la base |
| **Origen de la conexión (dirección IP)** | Solo en la **memoria** del proceso, para los límites de uso | Dato personal transitorio | Nadie: no se guarda en la base y en el registro queda solo una huella de 8 caracteres |

Lo que **no** se trata (no existe donde guardarlo): ubicación del dispositivo, contactos, teléfono, cédula y datos
bancarios. Tampoco se piden datos sensibles ni de menores, aunque el texto libre de una descripción podría
contener alguno por descuido (riesgo aceptado, §6). La app no usa la ubicación ni los sensores (`Permissions-Policy` los
bloquea en la web).

## 2. Base y finalidad del tratamiento

| Pregunta | Respuesta |
|---|---|
| **Base** | La **autorización previa, expresa e informada** de la persona (Ley 1581 de 2012 y Decreto 1377 de 2013): crear una cuenta exige marcar `aceptoPrivacidad: true` tras poder leer el aviso, y se guarda cuándo y con qué versión (`POST /cuentas`; sin eso, 400) |
| **Finalidad** | Solo que el servicio funcione: publicar, buscar, comparar lo perdido con lo encontrado, verificar quién reclama un objeto y avisar. No se venden, no se usan para publicidad y no se comparten con terceros |
| **Principios** | *Finalidad* (solo lo anterior), *libertad* (consentimiento al registrarse), *veracidad* (la persona corrige sus datos), *transparencia* (aviso y descarga de datos), *acceso restringido* (cada dato lo ve quien debe, tabla anterior), *seguridad* y *confidencialidad* (§4) |
| **Responsable** | El equipo del proyecto; el contacto sale de `CONTACTO_PRIVACIDAD` |
| **Encargados y transferencias** | La base está en el servidor del laboratorio (Dokploy). **Cloudflare intermedia todo el tráfico del dominio** `recobra.iscoutb.dev` (proxy y CDN, delante de Traefik): termina el HTTPS, así que ve las direcciones IP y el contenido de las peticiones en tránsito; es un encargado a declarar, y su configuración es del laboratorio. Cloudflare además inyecta en las páginas un script de analítica propio (*Web Analytics*), que la CSP **bloquea** en el navegador (se comprobó en producción). Fuera de eso, la aplicación no envía nada a terceros: la tipografía, que antes se pedía a Google en cada arranque, ahora va empaquetada (T27). GitHub y SonarCloud ven el código, no datos de personas |

## 3. Derechos y cómo se atienden

| Derecho | Cómo |
|---|---|
| **Conocer** | `GET /cuentas/yo/datos` («Descargar mis datos»): cuenta, publicaciones, reclamaciones con la prueba, avisos y reportes |
| **Actualizar y rectificar** | Escribir al contacto del aviso (aún no hay pantalla para editar el nombre) |
| **Suprimir** | `DELETE /cuentas/yo` con la contraseña: se **anonimiza** (nombre «Cuenta eliminada», correo y contraseña quitados), se borran avisos, sesiones y fotos y se reemplaza el texto de pruebas y reportes. No se hace si hay una reclamación o entrega en curso, para no dejar a otra persona esperando |
| **Revocar** | Es lo mismo que suprimir la cuenta |

## 4. Medidas de seguridad sobre estos datos

Contraseñas con `scrypt`, sal propia y comparación de tiempo constante; sesiones opacas de 256 bits de las
que solo se guarda el resumen, con vencimiento a los 7 días; HTTPS con HSTS; CSP y demás cabeceras
(ADR-0029); límites de uso (ADR-0028); consultas parametrizadas; fotos sin metadatos; registros sin
correos ni textos; el aviso de privacidad se versiona y cada cuenta guarda la versión aceptada.

## 5. Retención

| Dato | Cuánto se guarda |
|---|---|
| Cuenta | Mientras exista; al eliminarla, se anonimiza |
| Sesiones | 7 días; las vencidas se borran a diario |
| Avisos | 90 días |
| Publicaciones | Se cierran a los 60 días sin movimiento; las cerradas se conservan **sin datos personales** (solo para el historial) |
| Fotos | Hasta que la publicación se cierra, se entrega o se oculta, o se elimina la cuenta |
| Eventos fallidos | 7 días |
| Origen de la conexión | Segundos a horas, solo en memoria (duración de la ventana del límite) |
| **Respaldos de la base** | **Pendiente**: aún no hay respaldo programado; cuando lo haya, conservará hasta 7–14 días lo que la aplicación ya borró (T26), y habrá que decidir con la UTB si el aviso lo menciona |

## 6. Pendientes

- Revisión del aviso por la universidad (responsable, plazos y canal propios).
- Mencionar a Cloudflare como intermediario en el aviso de privacidad (hoy el aviso no lo nombra) y decidir con quien administra el dominio si se desactiva su analítica.
- Mención de los respaldos en el aviso, cuando existan.
- Una pantalla para rectificar el nombre (hoy es por el contacto).
- Limpieza de datos personales que alguien escriba en una descripción (riesgo aceptado, arc42 §11.2).
