# ADR-0028: Límites de uso por cuenta y por origen

## Estado

Aceptada — 2026-10-28. Mitigación estructural de las amenazas **T05** (abuso por volumen de una
cuenta) y **T06** (registro masivo) del [modelo de amenazas](../seguridad/modelo-de-amenazas.md).
Contrato 5.3.0 (cambio compatible: respuestas `429` nuevas).

## Contexto

Hasta ahora el único límite era el de intentos fallidos de inicio de sesión (5 por correo en 15
minutos, ADR-0021). Cualquier otra operación se podía repetir sin tope: una cuenta podía crear miles
de publicaciones, subir fotos de 1 MB (que van a la base compartida del laboratorio, ADR-0023),
inundar de reportes a los administradores o de reclamaciones a quien publicó un objeto. Es la
amenaza de mayor riesgo del lado de la aplicación que no era un secreto filtrado (riesgo 12, alta).

## Alternativas consideradas

### A. Límite en el proxy (Traefik) o en un API gateway (descartada)

- **A favor:** no toca el código; protege todo.
- **En contra:** el servidor del laboratorio no es nuestro (ADR-0010), no controlamos la configuración
  de Traefik ni podemos probarla en el flujo; y un proxy ve direcciones, no cuentas: no puede decir
  «esta cuenta ya publicó 20 veces esta hora», que es lo que importa y no se ve afectado por quién
  comparte el Wi-Fi.

### B. Contador compartido en Redis o en PostgreSQL (descartada)

- **A favor:** sobrevive a reinicios y funciona con varias instancias.
- **En contra:** un componente más que operar (Redis) o una escritura en la base por cada petición (la
  misma base que se quiere proteger), sin necesidad con una sola instancia (ADR-0010). Se reconsidera si hay
  más de una instancia.

### C. Contador por ventana fija en la memoria del proceso, aplicado con un guardia (elegida)

## Decisión

1. **Reglas** en un solo lugar (`REGLAS_DE_LIMITE`, `src/seguridad/limite-de-uso.ts`):

   | Regla | Máximo | Ventana | Se cuenta por | Operaciones |
   |---|:-:|---|---|---|
   | `publicar` | 20 | 1 hora | cuenta | `POST /publicaciones`, `POST /publicaciones/{id}/lo-tengo` |
   | `reclamar` | 10 | 1 hora | cuenta | `POST /publicaciones/{id}/reclamaciones` |
   | `reportar` | 20 | 1 día | cuenta | `POST /publicaciones/{id}/reportar` |
   | `foto` | 30 | 1 hora | cuenta | `PUT` y `DELETE /publicaciones/{id}/foto` |
   | `cuentaNueva` | 60 | 1 hora | origen | `POST /cuentas` |
   | `sesion` | 300 | 15 min | origen | `POST /sesiones` (se suma al límite de 5 fallos por correo) |

2. **Por cuenta cuando hay sesión; por origen cuando no.** El guardia `LimiteGuard` va **después** del
   de autenticación, que es el que deja la cuenta en la petición. El origen es `req.ip`, que detrás del proxy
   de confianza (un salto, `PROXY_CONFIABLES`, ADR-0029) es la dirección real del cliente.
3. **Los límites por origen son holgados a propósito.** Detrás de la red del campus muchas personas salen
   por la misma dirección: 60 cuentas nuevas por hora desde una dirección frena un guion automatizado
   (1.440 al día) sin impedir que un grupo se registre a la vez. Los estrictos son los **por cuenta**, que
   no dependen del Wi-Fi.
4. **Se cuenta la petición, no el éxito.** Una petición inválida o a un objeto que no existe también gasta
   cupo: lo que se frena es el volumen.
5. **Respuesta:** `429` con el mismo formato de error de siempre y la cabecera `Retry-After` (segundos
   hasta que termine la ventana), documentadas en el contrato 5.3.0. «Lo tengo yo» cuenta como publicar
   porque crea una publicación.
6. **Lo que queda en el registro:** `seguridad.limite_excedido` con la regla y una **huella de 8 caracteres**
   del origen, nunca la dirección ni el id en claro (la dirección es un dato personal, ADR-0021); `GET /metrics`
   cuenta cuántas veces se pasó cada regla (`seguridad.limitesExcedidos`).

## Consecuencias

- Una cuenta abusiva queda acotada: como mucho 20 publicaciones y 30 fotos por hora (≈ 30 MB por hora, no
  ilimitado).
- **Límites que se conocen y se aceptan:**
  - Los contadores viven en la memoria del proceso: un reinicio los pone en cero y, con **más de una instancia**,
    cada una contaría por su lado (se reconsidera si se escala).
  - **Ventana fija:** en el borde de la ventana alguien puede hacer hasta el doble en un instante.
  - Quien comparte dirección con alguien que abusa podría toparse con el límite por origen (por eso son
    holgados); los de cuenta no tienen ese problema.
  - Un atacante con muchas cuentas multiplica su cupo; las cuentas necesitan un correo `@utb.edu.co` sin
    verificar (T02), así que el límite por origen de la creación de cuentas es el freno de ese camino.
  - No hay un límite global de escrituras a la base ni de tamaño total: sigue la vigilancia del volumen.
- La memoria está acotada: pasadas 20.000 claves se podan las ventanas ya vencidas.
- Las pruebas de otras funciones usan límites holgados (las suites publican muchas veces con la misma
  cuenta); solo `test/limites.e2e-spec.ts` usa los valores reales.

## Qué haría revisar esta decisión

- Más de una instancia del backend: pasar el contador a PostgreSQL o a Redis.
- Falsos positivos de usuarios reales (quejas de 429): subir el máximo de la regla.
- Aparecer un proveedor de correo y la verificación de cuentas: cambiaría el peso de `cuentaNueva`.
