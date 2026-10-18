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

## Paleta (medida en la app UTB)

| Rol | Color | Uso |
|---|---|---|
| Fondo | `#05060B` | Fondo de todas las pantallas (tema oscuro) |
| Superficie | `#17181B` | Tarjetas |
| Superficie alta | `#22242A` | Campos de texto, hojas, bloques dentro de tarjetas |
| Borde | `#2C2E35` | Bordes y separadores |
| Azul UTB | `#0A39D0` → `#0C288D` → `#081A5E` | Degradado del encabezado (155°), botón principal, opción activa. Nunca como texto sobre fondo oscuro |
| Azul claro | `#7B9BFF` (texto `#9DB4FF`) | Enlaces, íconos activos, foco, estado "publicado" |
| Naranja | `#F28C28` | Objeto **perdido**; "en verificación"; reclamación pendiente; contadores (texto oscuro encima, 8:1) |
| Verde | `#3CCB6E` | Objeto **encontrado**; "entregado"; reclamación aprobada |
| Rojo | `#FF6B6B` (texto `#FF8A8A`) | Errores, rechazar, cerrar sesión |

## Tipografía, espaciado y formas

- Sin serifa del sistema (Roboto en Android, SF en iOS). Escala 28–30 / 22 / 16
  / 14 / 12 / 11; las etiquetas y la fecha van en mayúsculas, 11 px, peso 700.
- Margen lateral de pantalla 20 px, padding de tarjeta 16, 12 entre tarjetas.
- Radios: tarjetas 20, campos 14, encabezado y hojas 28, botones en píldora.
- Única sombra: barra flotante y hojas inferiores.

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
