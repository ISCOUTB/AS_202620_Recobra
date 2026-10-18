# ADR-0021: Privacidad y datos personales: consentimiento, acceso, supresión y retención

## Estado

Aceptada — 2026-10-18. Responde a un hallazgo de la evaluación del planteamiento
(faltaban reglas de datos personales) y a la deuda de seguridad de la cuenta de
ADR-0013. Contrato 5.0.0 (cambio incompatible: registrarse exige aceptar el
aviso). Borrador del equipo: antes de un uso institucional lo debe revisar quien
corresponda en la UTB.

## Contexto

Recobra guarda datos personales de la comunidad UTB: correo institucional,
nombre, lo que cada persona publica y las pruebas que escribe al reclamar. La
Ley 1581 de 2012 (y el Decreto 1377 de 2013) piden, en lo que aplica a este
proyecto: **autorización informada** al recoger los datos, **derecho a
conocerlos, corregirlos y suprimirlos**, **finalidad clara** y **no guardarlos
más de lo necesario**. Hasta ahora no había aviso, ni forma de descargar o borrar
los datos, y las sesiones y avisos viejos se acumulaban.

## Alternativas consideradas

### A. Borrar físicamente la cuenta y todo lo relacionado (descartada)

- **En contra:** rompe el historial de reclamaciones que exige el escenario S2
  ("el 100 % de los intentos queda registrado") y deja huecos en publicaciones
  ya entregadas.

### B. Anonimizar: quitar los datos personales y conservar el historial (elegida)

## Decisión

1. **Aviso de privacidad versionado**, con una sola fuente
   (`src/domain/privacidad/aviso-privacidad.ts`) que la API sirve en
   `GET /privacidad` y que la vitrina y la app muestran: qué datos, para qué,
   quién ve qué, cuánto tiempo, derechos, protección. El contacto sale de
   `CONTACTO_PRIVACIDAD` (por omisión, las solicitudes del repositorio).
2. **Consentimiento al registrarse:** `POST /cuentas` exige
   `aceptoPrivacidad: true`; la cuenta guarda cuándo y con qué versión del aviso
   se aceptó. Las cuentas anteriores a este cambio no tienen esa constancia.
3. **Derecho de acceso:** `GET /cuentas/yo/datos` devuelve la cuenta, las
   publicaciones propias, las reclamaciones propias (con la prueba escrita) y los
   avisos; nunca la contraseña ni datos de otras personas.
4. **Derecho de supresión:** `DELETE /cuentas/yo` pide la contraseña y
   **anonimiza** la cuenta (nombre "Cuenta eliminada", correo
   `eliminada-<id>@eliminada.invalid`, contraseña vacía, `eliminada_en`). Antes:
   - **No se puede mientras haya algo en curso con otra persona** (reclamación
     pendiente o aprobada sin entrega, u objeto propio en verificación o por
     entregar): responde 409 con lo que falta resolver.
   - Retira las publicaciones propias que siguen "publicado" (cierre
     `retirado`), borra los avisos y las sesiones, y reemplaza el texto de las
     pruebas escritas.
   El correo original queda libre para volver a registrarse. Lo ya registrado
   (publicaciones cerradas o entregadas, reclamaciones) sigue apuntando a una
   cuenta anónima.
5. **Retención:** una pasada diaria borra las sesiones vencidas y los avisos de
   más de 90 días. Las publicaciones sin movimiento se cierran a los 60 días
   (ADR-0017).
6. **Límite de intentos de inicio de sesión:** 5 fallos por correo en 15 minutos
   y luego 429 con `Retry-After`. Cuenta también los correos inexistentes para no
   revelar cuáles tienen cuenta.
7. **Dónde vive:** un módulo `Privacidad` que reúne lo que atraviesa contextos
   (descargar y eliminar) usando solo los puertos que cada contexto exporta; los
   contextos no dependen de él.

## Consecuencias

- Cambio incompatible: los clientes que crean cuentas tienen que enviar
  `aceptoPrivacidad: true` (la vitrina y la app ya lo hacen).
- Quien tenga una reclamación en curso no puede eliminar su cuenta hasta
  resolverla: es una decisión de producto (no dejar a otra persona esperando) que
  puede frustrar a alguien con prisa; el mensaje dice qué falta.
- La descripción que una persona escribió en una publicación ya cerrada se
  conserva (sin su nombre ni correo, pero con el texto que escribió). Si esa
  descripción contuviera datos personales, no se limpia sola.
- El límite de intentos vive en la memoria del proceso (un reinicio lo borra) y
  permite que alguien bloquee 15 minutos el acceso a un correo ajeno, sin poder
  entrar. Aceptable en este alcance.
- Quedan pendientes: revisión del texto por la universidad, retención de las
  publicaciones cerradas (hoy se conservan sin plazo), copias de seguridad de la
  base (no configuradas) y reportes de abuso (moderación).

## Qué haría revisar esta decisión

- Que la UTB indique un responsable o un procedimiento propios: se cambia el
  contacto y el aviso.
- Que se agreguen fotos o ubicación: hay que actualizar el aviso, el
  consentimiento y la retención antes de guardarlas.
