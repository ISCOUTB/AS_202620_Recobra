# ADR-0014: Reclamación con prueba del reclamante y aprobación de quien encontró el objeto

## Estado

Aceptada — 2026-10-17. Implementa el contexto **Reclamaciones** y responde al
escenario **S2** ([`docs/calidad/escenarios_calidad.md`](../calidad/escenarios_calidad.md#escenario-s2--seguridad-en-una-reclamación)).
Depende de ADR-0013 (cuentas). No modifica ningún ADR anterior.

## Contexto

S2 exige que el **100 %** de los intentos de reclamación quede registrado con
usuario, fecha y hora, y que el **0 %** llegue a "reclamado" sin completar la
verificación. La pregunta es cómo verificar que quien reclama es el dueño.

## Alternativas consideradas

### A. Pregunta secreta de quien publicó (descartada)

Quien publica el objeto encontrado deja una pregunta con su respuesta y el
sistema compara la respuesta del reclamante.

- **A favor:** automática, sin esperar a nadie.
- **En contra:** la comparación de texto libre es frágil ("azul oscuro" frente a
  "azul"), y quien encontró el objeto tendría que adivinar qué preguntar sin
  saber nada del dueño.

### B. Código enviado al correo del reclamante (descartada)

- **En contra:** solo probaría que el reclamante controla su correo, no que el
  objeto es suyo; y exige un proveedor de correo, que no hay sin costo.

### C. Prueba del reclamante y aprobación de quien encontró el objeto (elegida)

El reclamante, con sesión de correo institucional, describe algo que solo el
dueño sabría (contenido, marcas, señas). Quien publicó el objeto lo lee junto a
la publicación y **aprueba o rechaza** con un motivo.

- **A favor:** la decide quien tiene el objeto en la mano y puede comprobar la
  descripción; queda registro de quién reclamó, qué dijo y quién aprobó.
- **En contra:** depende de que quien encontró el objeto responda; no hay plazo
  ni aviso automático (las notificaciones están pendientes).

## Decisión

Se adopta **C**, con estas reglas (en `src/application/use-cases/reclamaciones.ts`):

1. Solo se reclaman publicaciones de tipo **encontrado**, con autor, que no
   estén ya entregadas; nadie reclama su propia publicación; una cuenta no puede
   tener dos reclamaciones pendientes del mismo objeto.
2. Cada intento crea una `Reclamacion` **pendiente** con reclamante, prueba
   (20 a 1000 caracteres) y fecha. La publicación pasa a **en verificación**.
3. **Solo quien publicó** el objeto ve las pruebas y resuelve (403 para los
   demás).
4. **Aprobar** es la única forma de llevar la publicación a **reclamado**; las
   demás reclamaciones pendientes del mismo objeto se rechazan solas.
   **Rechazar** exige un motivo y, si no quedan pendientes, la publicación
   vuelve a **publicado**.
5. **El contacto se comparte solo al aprobar:** antes, quien encontró el objeto
   ve el nombre y la prueba, pero no el correo del reclamante; después, cada uno
   ve el correo del otro para coordinar la entrega.
6. **Dueño único de los datos:** Reclamaciones escribe solo su tabla. Para
   cambiar el estado de una publicación llama a `CambiarEstadoPublicacion`, del
   contexto Publicaciones, que valida la transición del ciclo de vida y la
   aplica solo si el estado sigue siendo el esperado. Así, dos aprobaciones
   simultáneas no pueden dejar el objeto entregado a dos personas.

## Consecuencias

- **S2 se puede comprobar con pruebas:** `reclamaciones.spec.ts` y
  `test/reclamaciones.e2e-spec.ts` cubren que no se llega a "reclamado" sin
  aprobación, que solo el autor resuelve, que el intento queda registrado y que
  dos aprobaciones simultáneas dejan una sola ganadora.
- **Trazabilidad del ciclo de vida (S6):** la publicación ya cambia de estado
  (`publicado → en_verificacion → reclamado`, o de vuelta a `publicado`), pero
  aún no se guarda el historial de cada cambio, solo el estado actual y las
  reclamaciones.
- **Consistencia entre dos tablas:** aprobar cambia la publicación y luego la
  reclamación. Si la segunda escritura fallara, la publicación quedaría
  entregada con la reclamación pendiente. Es justo el problema de la semana 12
  (mensajería y consistencia, posible saga o bandeja de salida); hoy queda
  declarado en [`docs/modos-de-fallo.md`](../modos-de-fallo.md).
- **Sin notificaciones:** quien encontró el objeto tiene que entrar a ver si lo
  reclamaron.

## Qué haría revisar esta decisión

- Muchas reclamaciones sin respuesta → plazo de vencimiento o moderación por
  administradores.
- Reclamaciones falsas aprobadas → exigir una segunda señal, como una
  verificación presencial al entregar.
