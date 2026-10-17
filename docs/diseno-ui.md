# Diseño de la interfaz: alineado con la app UTB

La interfaz de Recobra sigue el estilo de la **app institucional de la UTB**,
para que a un estudiante le resulte familiar. La referencia fue un video de la
app actual compartido por el equipo; de él se tomaron solo colores, formas y
patrones de navegación, nunca datos personales.

## Paleta (medida en la app UTB)

| Rol | Color | Uso |
|---|---|---|
| Fondo | `#05060B` | Fondo de todas las pantallas (tema oscuro) |
| Superficie | `#17181B` | Tarjetas |
| Superficie alta | `#22242A` | Campos de texto, bloques dentro de tarjetas |
| Borde | `#2C2E35` | Bordes y separadores |
| Azul UTB | `#0A39D0` → `#0C288D` → `#081A5E` | Degradado del encabezado, botón principal, pestaña activa |
| Azul claro | `#7B9BFF` | Texto e íconos activos sobre fondo oscuro |
| Naranja | `#F28C28` | Objeto **perdido**; estado "en verificación" |
| Verde | `#3CCB6E` | Objeto **encontrado**; estado "entregado"; reclamación aprobada |
| Rojo | `#FF6B6B` | Errores, rechazar, cerrar sesión |

## Patrones de la app UTB que se reutilizan

- **Encabezado** con degradado azul, esquinas inferiores redondeadas, fecha en
  mayúsculas y título grande ("SÁBADO, 17 DE OCTUBRE" / "Buenas tardes, Ana").
- **Tarjetas oscuras** redondeadas (20 px) con una barra de color a la
  izquierda, como la tarjeta "Próxima clase".
- **Etiquetas** pequeñas en mayúsculas ("ENCONTRADO", "EN VERIFICACIÓN"), como
  "IMPORTANTE" en la app UTB.
- **Control segmentado** con la opción activa en azul ("Todos / Perdidos /
  Encontrados", como "Horario / Eventos").
- **Barra de navegación flotante** en forma de píldora con cuatro secciones:
  Inicio, Publicar, Mis cosas y Perfil.
- **Perfil** con avatar, nombre, correo y una etiqueta de tipo de cuenta.
- **Campana de avisos** (ADR-0015) en el encabezado, con un contador naranja de
  no leídos; los avisos se muestran como tarjetas con barra de color (azul:
  coincidencia, naranja: reclamación nueva, verde: aprobada, rojo: rechazada) y
  una etiqueta en mayúsculas con el tipo y la fecha.

## Dónde está

- App Flutter: `mobile/lib/tema/tema_utb.dart` (paleta y tema),
  `mobile/lib/widgets/comunes.dart` (encabezado, tarjetas, etiquetas, barra),
  `mobile/lib/pantallas/` (Inicio, Publicar, Mis cosas, Perfil, Acceso y la
  campana con la hoja de avisos en `avisos.dart`).
- Vitrina web (`public/index.html`): mismo tema oscuro con variables CSS
  (`--fondo`, `--superficie`, `--azul`…), encabezado con fecha y saludo,
  tarjetas con barra de color por tipo y control segmentado en "Iniciar
  sesión / Crear cuenta", y la campana con su bandeja desplegable (en
  pantallas angostas se ancla al ancho del encabezado).

## Accesibilidad

- El estado nunca se comunica solo con color: cada etiqueta lleva su texto.
- Texto principal `#F5F6F8` sobre `#05060B` y `#17181B` (contraste alto).
- La barra de navegación marca la pestaña activa con fondo, color y peso de
  letra, y declara su estado para lectores de pantalla (`Semantics`).
- La campana anuncia el número de avisos ("Avisos, 2 sin leer"); en la vitrina
  la bandeja se cierra con Escape y devuelve el foco a la campana.
