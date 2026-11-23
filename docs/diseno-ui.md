# Diseño de la interfaz: alineado con la app UTB

La interfaz de Recobra sigue el estilo de la **app institucional de la UTB**,
para que a un estudiante le resulte familiar. La referencia fue un video de la
app actual compartido por el equipo; de él se tomaron solo colores, formas y
patrones de navegación, nunca datos personales. No se usa el logo ni marcas
oficiales de la UTB: la marca es "Recobra".

Desde el 2026-10-17 la interfaz aplica una **propuesta de UI/UX hecha con
Claude Design** a partir de un brief del equipo (contexto, lenguaje visual de
la app UTB, pantallas, estados y problemas de UX por resolver). La propuesta
incluía sistema de diseño, componentes, un flujo anotado en siete pasos,
estados y la vitrina; abajo se resume lo que se implementó y lo que quedó como
propuesta.

## Sistema de diseño de Recobra (desde el 2026-11-23)

La app aplica el **sistema de diseño de Recobra**: el mismo lenguaje de la app
UTB (encabezado azul, superficies limpias, una sola acción azul por pantalla),
ahora con **modo claro y oscuro**. Los colores viven en
`mobile/lib/tema/tema_utb.dart` como `ColoresRecobra.claro` y
`ColoresRecobra.oscuro` (una `ThemeExtension` con los nombres de los
tokens), y el tema usa `ColorScheme.fromSeed(seedColor: azulUtb)` con
`primary: azulUtb`. Las pantallas siguen leyendo `ColoresUtb`, que ahora
resuelve cada nombre contra el juego de colores en uso.

**Apariencia:** Sistema, Claro u Oscuro desde Perfil; se recuerda en el
dispositivo. El cambio es inmediato (sin animación del tema, para que ningún
texto quede a medio camino entre los dos modos).

### Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `fondo` | `#F2F3F7` | `#010208` | Detrás de todo, debajo del encabezado |
| `tarjeta` | `#FFFFFF` | `#19181B` | Listas agrupadas, tarjetas, hojas |
| `tarjetaAlta` | `#EEF0F5` | `#2C2B30` | Campos en oscuro, botón secundario en oscuro, pestaña activa (oscuro) |
| `ticket` | `#E9EBF2` | `#343338` | Fondo del segmentado en claro |
| `separador` | `#E3E5EB` | `#2A2A2E` | Líneas de 1 px; borde de la barra en claro |
| `texto` | `#0B0D17` | `#FFFFFF` | Texto principal; relleno del chip activo |
| `textoSuave` | `#5F6470` | `#98989F` | Metadatos y ayudas (AA en los dos modos) |
| `enlace` | `#2545C9` | `#4F86FF` | Enlaces, acciones de texto, pestaña activa, estado Publicado |
| `azulUtb` | `#2545C9` | `#2545C9` | Botón principal, segmento activo, botón +, cuadros de icono |
| Encabezado | `#1A36CF` → `#1232B8` (55 %) → `#0B2384` | igual | Degradado vertical, esquinas inferiores de 28 |
| `naranjaTexto` | `#B45309` | `#F5A35A` | Perdido, En verificación, Pendiente, insignia de avisos |
| `verdeTexto` | `#157F3C` | `#4CD07D` | Encontrado, Entregado, Aprobada |
| `rojoTexto` | `#C4261D` | `#FF6961` | Rechazada, Rechazar, Cerrar sesión, errores |
| `magentaTexto` | `#8A12C2` | `#D08CFF` | Posible coincidencia |
| `barra` | `#FFFFFF` | `#141414` | Barra inferior flotante y menú lateral |

El color se usa solo para estados y **siempre junto a su palabra**
("Perdido", "Encontrado", "En verificación"); por eso los accesos rápidos de
Inicio dejaron de ser botones naranja y verde: son tarjetas con cuadro de
icono azul y la palabra "PUBLICAR" en el color del estado.

### Tipografía (familia del sistema; Roboto empaquetada)

`tituloPestana` 34/800 · `seccion` 22/700 · `tarjetaBarra` 17/600 (botones,
títulos de tarjeta) · `fila` 16 · `secundario` 14 en `textoSuave` ·
`etiquetaEstado` 13/600 · `etiqueta` 12/600 en mayúsculas (única línea en
mayúsculas). Están en `TextoRecobra`.

### Forma y profundidad

- Radios (`RadiosRecobra`): etiqueta 8, cuadro de icono 10, campo 16, tarjeta
  20, segmentado 22, encabezado 28, hoja y barra 32, botones en píldora.
- Encabezado de pestaña con padding 58 / 20 / 22; botones de 52; barra y
  botón + de 64; cuadro de icono de fila de 38 (`IconoFila`, icono blanco).
- Sin sombras, salvo la barra flotante y el botón +, y solo en claro.
- Listas agrupadas en una tarjeta con separadores, en vez de tarjetas sueltas.
- Dos ajustes propios, para que se distingan sobre `fondo` en claro: los
  campos y el botón secundario van en `tarjeta` con línea de 1 px
  `separador` (en oscuro, `tarjetaAlta` sin línea, como dice el sistema).

### Paleta anterior (hasta el 2026-11-22, solo oscuro)

Fondo `#05060B`, superficie `#17181B`, degradado `#0A39D0` → `#0C288D` →
`#081A5E`, azul claro `#7B9BFF`, naranja `#F28C28`, verde `#3CCB6E`, rojo
`#FF6B6B`. Se reemplazó por el sistema de diseño de arriba.

## Patrones de la app UTB que se reutilizan

- **Encabezado** con degradado azul, esquinas inferiores redondeadas, fecha en
  mayúsculas y saludo en dos tonos ("Buenas tardes," en azul claro + "Ana").
- **Tarjetas oscuras** con una barra de color de 4 px dentro, a la izquierda,
  como la tarjeta "Próxima clase". Lo entregado se atenúa al 60 %.
- **Etiquetas** pequeñas en mayúsculas ("ENCONTRADO", "EN VERIFICACIÓN"); el
  estado de la publicación siempre lleva ícono y texto.
- **Control segmentado** en píldora con la opción activa en azul ("Todos /
  Perdidos / Encontrados", "Lo perdí / Lo encontré", "Lo que publiqué / Lo que
  reclamé" con contador naranja de lo que requiere acción).
- **Barra de navegación flotante** en píldora con Inicio, Mis cosas y Perfil;
  **Publicar** ocupa la burbuja redonda aparte, el mismo lugar que el asistente
  en la app UTB, para que la acción principal esté siempre a un toque.
- **Perfil** con avatar, nombre, correo, chip de tipo de cuenta e indicadores
  en anillo (publicadas y entregadas), como "Promedio" y "Avance".
- **Campana de avisos** (ADR-0015) con contador naranja; los avisos son
  tarjetas con barra de color (azul: coincidencia, naranja: reclamación nueva,
  verde: aprobada, rojo: rechazada), separados en "Nuevos" y "Anteriores".

## Problemas de UX que resuelve la propuesta

| Problema | Solución implementada |
|---|---|
| Inicio empezaba por la lista | "¿Qué pasó?" con dos **botones de acceso rápido** (**Perdí algo / Encontré algo**) que abren Publicar con el tipo elegido; la coincidencia sin leer aparece destacada dentro del encabezado |
| Los accesos rápidos parecían texto | Botones de **relleno sólido** (naranja para perdido, verde para encontrado, con texto oscuro de contraste 8:1), con un "+" en un círculo y la palabra PUBLICAR con flecha. La vitrina tiene los mismos dos botones arriba de todo |
| Quien no tenía cuenta no podía ver cómo se publica | El visitante **ve y llena el formulario** de publicar (con un aviso "Estás explorando sin cuenta"); al tocar Publicar se abre una hoja que explica **por qué hace falta una cuenta** (cada reclamo tiene un responsable, para avisarte, solo comunidad UTB) y deja iniciar sesión o crearla. Al entrar vuelve al formulario con lo que había escrito. Lo mismo con "Es mío: reclamar" y "Lo tengo yo", que reabren el objeto al volver. La pantalla de acceso repite las razones |
| Privacidad poco visible | Casilla obligatoria "Acepto el tratamiento de mis datos según el aviso de privacidad" al crear la cuenta, con enlace al aviso (que sirve la API, el mismo texto en la app y en la vitrina). En Perfil (app) y en "Mis datos" (vitrina): **Aviso de privacidad**, **Descargar mis datos** y **Eliminar mi cuenta** (pide la contraseña y explica qué pasa). La vitrina tiene un pie con el aviso |
| Lugares y pisos | Catálogo con los pisos y zonas reales del campus (A2 hasta el quinto, hemeroteca y sala de estudio en la biblioteca, Alcatraz, Mesón, bohíos, panadería, gimnasio, canchas, parqueadero…) como **sugerencias**; el campo "Otro piso, salón o referencia" es de texto libre y el lugar puede ser "Otra…" |
| Las coincidencias eran una lista con porcentaje | Comparación **lado a lado** ("Lo que perdiste" / "Lo que encontraron"), con el parecido en un anillo y las razones (misma categoría, lugar) |
| Reclamar confundía | Pantalla propia que explica qué es la prueba, con ideas tocables ("Marca o modelo", "Qué tenía dentro", "Una seña o raya"), contador "Faltan N caracteres (mínimo 20)", aviso de no escribir datos sensibles y "Qué pasa después" en tres pasos |
| "En verificación" no se entendía | Texto debajo de la tarjeta: "Alguien dijo que es suyo. Quien lo encontró está revisando." |
| Aprobar es irreversible | Hoja (app) o diálogo (vitrina) "¿Entregar «objeto» a Nombre?" con lo que pasa al confirmar y un botón que repite el nombre ("Sí, entregar a Ana" / "Todavía no") |
| Rechazar sin guía | Motivos rápidos que rellenan el campo ("Las señas no coinciden", "Falta información"), con "Nombre verá este motivo. Sé claro y amable." |
| El contacto aprobado era solo texto | Caja verde con el correo y "Copiar correo" |
| Estado de una reclamación propia | Progreso en tres pasos: Enviada → En revisión → Entrega |
| Primer uso | Bienvenida con los cuatro pasos (publica, te avisamos, reclama con una prueba, acuerden la entrega); se puede volver a ver desde Perfil |
| Vacíos y errores | Esqueleto mientras carga; vacío con filtros que propone "Publicar mis llaves" y "Quitar filtros"; error "No pudimos conectar con Recobra" con "Reintentar" |

## Lo que quedó como propuesta (no implementado)

- **Sesión vencida en una hoja** que deja volver a entrar sin perder lo escrito:
  hoy la app cierra la sesión y pide entrar de nuevo. (Sí se conserva lo escrito
  cuando la persona inicia sesión por primera vez desde el formulario.)
- **"Escribir"** (abrir el correo): necesita un paquete para abrir enlaces
  `mailto:`; hoy está "Copiar correo".
- Lo que la propia propuesta marcó como "no existe en la API": guardar fotos,
  historial de estados con fecha, búsqueda por texto y filtro por fecha, mapa
  del campus.
- "Publicado por Nombre" en el detalle: la API de publicaciones no expone el
  nombre del autor, solo su id.

## Dónde está

- App Flutter: `mobile/lib/tema/tema_utb.dart` (tokens y `ThemeData`),
  `mobile/lib/widgets/comunes.dart` (encabezado, etiquetas, tarjetas, control
  segmentado, barra con burbuja, anillo, esqueleto, vacío, error),
  `mobile/lib/estado/avisos.dart` (bandeja compartida por la campana y la
  tarjeta destacada) y `mobile/lib/pantallas/` (bienvenida, inicio, detalle,
  reclamar, publicar, mis_cosas, perfil, acceso, avisos y `requiere_cuenta.dart`,
  la hoja que explica por qué hace falta cuenta).
- Vitrina web (`public/index.html`): mismas variables CSS; publicar con "Lo
  perdí / Lo encontré" y lista de lugares, comparación lado a lado, reclamar con
  explicación y contador, diálogo de entrega, motivos rápidos, copiar correo y
  la campana con su bandeja.
- Pruebas: `mobile/test/widget_test.dart` (bienvenida, accesos rápidos,
  campana, reclamar habilitado con 20 caracteres, confirmación antes de aprobar).

## Accesibilidad

- El estado nunca se comunica solo con color: cada etiqueta lleva su texto y,
  en las publicaciones, un ícono; las barras de color son decorativas.
- Texto principal `#F5F6F8` sobre `#05060B` y `#17181B` (contraste alto); los
  colores que se distinguen entre sí también difieren en luminosidad.
- Áreas táctiles de 48 dp (`MaterialTapTargetSize.padded`); la barra y las
  tarjetas no usan alturas fijas, así que el texto ampliado no se corta.
- La campana anuncia el número de avisos ("Avisos, 2 sin leer"), el anillo
  "82 por ciento de parecido" y el progreso "Paso 2 de 3: en revisión".
- En la vitrina la bandeja y el diálogo se cierran con Escape; el control
  "Lo perdí / Lo encontré" son botones de opción reales dentro de un `fieldset`.
