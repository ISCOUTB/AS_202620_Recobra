# ADR-0031: Una sola interfaz: la app Flutter reemplaza la vitrina web

## Estado

Aceptada — 2026-11-19. Reemplaza parcialmente a
[ADR-0029](0029-cabeceras-de-seguridad-csp-y-cors.md) (la política CSP por hash de la vitrina deja de
existir; la de la app y la de la API siguen igual) y a
[ADR-0022](0022-moderacion-minima-reportes-y-ocultar.md) (el panel de moderación pasa de la vitrina a la
app; las reglas de moderación no cambian). Contrato 5.4.0 (cambio compatible: ninguna ruta de la API cambia).

## Contexto

Desde el corte 1, `https://recobra.iscoutb.dev/` servía la **vitrina**: una página HTML con su propio
JavaScript (`public/index.html`, ~2 300 líneas) que nació para mostrar la API en clase. Desde S11 la
**app Flutter** compilada para web se sirve en `/app/`. Las dos hacían lo mismo (buscar, publicar,
reclamar, avisos) y se fueron separando:

- **Dos clientes de la misma API.** Cada función nueva se escribía dos veces (JavaScript y Dart), con dos
  juegos de pruebas, y una de las dos quedaba atrás: la moderación de administradores solo existía en la
  vitrina, y el diseño de la app (docs/diseno-ui.md) solo en parte en la vitrina.
- **Computador y celular mezclados.** En la retroalimentación del docente (noviembre) la entrada al
  sistema se vio "rara": la raíz abre una página de computador y el celular necesita conocer `/app/`; la
  app, a su vez, en un computador se estiraba de borde a borde con la barra de un teléfono.
- **Rutas inexistentes con 200.** `ServeStaticModule` respondía la vitrina para *cualquier* ruta
  desconocida (comodín de página única), así que `GET /no-existe` daba `200` con HTML en vez de un `404`
  con el esquema `Error` del contrato (ADR-0009). Un error de ruta quedaba oculto para clientes y
  monitoreo.
- **Superficie de seguridad doble.** La vitrina necesitaba su propia política CSP por hash (ADR-0029,
  amenaza T03) y una prueba que vigilara su HTML; la app tenía otra.

## Alternativas consideradas

### A. Redirigir según el dispositivo (descartada)

La raíz mira el `User-Agent`: celular → `/app/`, computador → vitrina.

- **A favor:** casi sin código.
- **En contra:** conserva los dos clientes y su divergencia (el problema de fondo); adivinar el
  dispositivo por `User-Agent` falla con tabletas, ventanas angostas y navegadores que lo ocultan; y una
  misma URL mostraría productos distintos a dos personas.

### B. Portada con dos botones (descartada)

`/` muestra una página mínima con "Abrir la app" y "Versión de escritorio".

- **A favor:** explícito para quien entra.
- **En contra:** sigue habiendo dos clientes que mantener, y agrega un paso para todos.

### C. Una sola interfaz: la app Flutter, adaptada al ancho de la pantalla (elegida)

La raíz redirige (`302`) a `/app/`; la vitrina se retira. La app decide por el **ancho disponible**, no por
el dispositivo: desde 900 px muestra un menú lateral (Inicio, Publicar, Mis cosas, Perfil y, para
administradores, Moderación) y centra el contenido con ancho máximo de 820 px; por debajo, la barra
flotante inferior de la app UTB. La moderación pasa a la app (pantalla `ModeracionPantalla`, visible solo
con `esAdministrador`, el servidor sigue exigiendo el rol con 403).

- **A favor:** un solo cliente de la API (la app ya era el mismo código para web, Android e iOS, ADR-0002);
  una sola política CSP de interfaz; la raíz deja de tapar los errores de ruta.
- **En contra:** la primera carga de la app web pesa más que la vitrina (CanvasKit, varios MB, que el
  navegador guarda después); se pierden las pruebas de la vitrina, que se reemplazan por las de la app.

## Decisión

Se adopta C:

1. `GET /` responde `302` a `/app/` (`src/raiz/raiz.controller.ts`).
2. `ServeStaticModule` sirve solo `public/app` bajo `/app`, **sin comodín**: cualquier otra ruta que no
   sea de la API responde `404` con `{ statusCode, message }` (`test/raiz.e2e-spec.ts`).
3. Se borra `public/index.html` y su política CSP por hash; la raíz recibe la política de la API
   (`default-src 'none'`).
4. La app adapta su navegación al ancho (`MenuLateralUtb`, `anchoEscritorio = 900`) e incluye la
   moderación para administradores (`mobile/lib/pantallas/moderacion.dart`), con pruebas de widget para
   ambos casos.

## Consecuencias

**Positivas**

- Cada función nueva se escribe una vez; la app es la misma en computador, celular (web) y como app
  instalada (Android/iOS, mismo código).
- Las rutas inexistentes son errores visibles (`404`), coherentes con el contrato.
- Menos superficie de seguridad: desaparece una política CSP y el HTML que había que vigilar.

**Negativas / riesgos asumidos**

- La app web tarda más en abrir la primera vez que la vitrina (descarga de CanvasKit); las siguientes
  usan la caché del navegador.
- Quien tenga guardado un enlace a la vitrina llega a la app (la raíz redirige); no hay enlaces internos
  a rutas propias de la vitrina que se rompan.

## Qué revisaría esta decisión

- **Dato que la haría revisar:** que el tiempo de primera carga de `/app/` en un celular de gama baja
  supere lo aceptable para el flujo "buscar un objeto" (se mide con la herramienta del navegador en la
  red del campus), o que se necesite indexación en buscadores (una app de canvas no la tiene).
- **Costo de reversión aceptado:** bajo — la vitrina queda en el historial de git (último commit con
  `public/index.html`) y volver a servirla es restaurar el archivo y una entrada de `ServeStaticModule`.

## Referencias

- [ADR-0002](0002-arquitectura-y-stack.md) (Flutter como cliente), [ADR-0009](0009-versionado-del-contrato-y-error-unico.md) (esquema `Error`),
  [ADR-0022](0022-moderacion-minima-reportes-y-ocultar.md), [ADR-0029](0029-cabeceras-de-seguridad-csp-y-cors.md)
- `src/raiz/raiz.controller.ts`, `src/app.module.ts`, `src/seguridad/cabeceras-de-seguridad.ts`
- `mobile/lib/main.dart`, `mobile/lib/widgets/comunes.dart` (`MenuLateralUtb`), `mobile/lib/pantallas/moderacion.dart`
- Pruebas: `test/raiz.e2e-spec.ts`, `src/seguridad/seguridad-http.spec.ts`, `mobile/test/widget_test.dart`
