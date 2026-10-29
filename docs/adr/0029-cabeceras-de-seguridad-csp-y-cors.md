# ADR-0029: Cabeceras de seguridad, política de contenido (CSP) y CORS con lista blanca

## Estado

Aceptada — 2026-10-28. Mitigación estructural de las amenazas **T03** (XSS que roba el token), **T04**
(degradación a HTTP), **T07** (cuerpo comprimido que tumba el proceso), **T21** (CORS abierto), **T22**
(clickjacking), **T24** (origen falsificado) y **T27** (fuente de un tercero) del
[modelo de amenazas](../seguridad/modelo-de-amenazas.md). Contrato 5.3.0 (la API rechaza cuerpos
comprimidos con 415).

## Contexto

La API respondía sin ninguna cabecera de seguridad y con CORS abierto a cualquier sitio
(`app.enableCors()`). El token de sesión de la vitrina vive en `localStorage` (T03): si alguien lograra
inyectar un script, lo leería y se llevaría la cuenta. Además:

- Express 4 con `body-parser` 1.20.4: un solo cuerpo comprimido con bytes de más tumba el proceso
  (GHSA-27r3-jxmh-p828).
- Sin `trust proxy`, detrás de Traefik todas las peticiones parecen venir de la misma dirección, lo que haría
  inútil cualquier límite por origen (ADR-0028).
- La app Flutter web descargaba la fuente Roboto de `fonts.gstatic.com` en cada arranque (se vio al probar
  la CSP): una conexión a un tercero que cuenta a Google quién usa Recobra.

## Alternativas consideradas

### A. Instalar `helmet` (descartada)

- **A favor:** estándar y conocido.
- **En contra:** una dependencia más (la semana trata justamente de las dependencias) para escribir ocho
  cabeceras, y la parte difícil, la CSP de la vitrina con hashes, no la resuelve. Las cabeceras propias
  caben en un archivo de ~100 líneas probado.

### B. CSP con `'unsafe-inline'` para los scripts (descartada)

- **En contra:** una CSP que permite scripts en línea no frena un XSS, que es justo lo que se quiere.

### C. CSP con el hash del script y del estilo de la vitrina, calculado al arrancar (elegida)

## Decisión

1. **Middleware `crearCabecerasDeSeguridad`** (`src/seguridad/cabeceras-de-seguridad.ts`), antes que todo lo demás:
   - **Vitrina (`/`)**: `default-src 'none'; script-src 'self' 'sha256-…'; style-src 'self' 'sha256-…';
     img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`.
     Los dos hashes se **calculan al arrancar** del propio `public/index.html` (con los saltos de línea normalizados,
     como los calcula el navegador), así editar la vitrina no deja la política desfasada.
   - **App web (`/app/`)**: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; …
     connect-src 'self' blob: data:`. Flutter necesita WebAssembly y fija estilos al arrancar; los **scripts** siguen sin
     poder ser en línea.
   - **API**: `default-src 'none'; frame-ancestors 'none'` (las respuestas son datos, no documentos).
   - Todas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
     `Permissions-Policy` (sin geolocalización, micrófono, pagos ni USB), `Cross-Origin-Opener-Policy: same-origin`, y
     `Strict-Transport-Security: max-age=15552000` **solo cuando la conexión llegó por HTTPS** (sin `includeSubDomains`
     ni `preload`: el dominio es del laboratorio).
2. **Guardia de la vitrina** (`seguridad-http.spec.ts`): una prueba falla si `public/index.html` agrega algo que la
   política bloquearía (un segundo script, un `onclick=`, un `style="…"`, `javascript:`, `eval`, o asignar `innerHTML`). Se
   movió el único `style=""` que había a una clase.
3. **CORS con lista blanca** (`src/seguridad/cors.ts`): en producción, ningún origen externo salvo los de
   `CORS_ORIGENES`; fuera de producción, además, `localhost`. La vitrina y la app web son del mismo origen y no lo necesitan.
   Las apps móviles y `curl` no mandan `Origin`.
4. **Proxy de confianza**: `trust proxy` en 1 en producción (`PROXY_CONFIABLES` lo cambia): un salto, Traefik.
   Así `req.ip` y `req.secure` salen de `X-Forwarded-*` y **solo** de ese salto; un cliente directo no puede falsificarlos.
5. **Se rechazan con 415 los cuerpos con `Content-Encoding` distinto de `identity`**, antes de los lectores de cuerpo:
   ningún cliente de Recobra comprime lo que envía, y es la vía del ataque de `body-parser`. Además se actualizó
   `body-parser` a 1.20.9 (el arreglo cae dentro del rango que pide Express) — la defensa no depende solo de la versión.
6. **Tipografía empaquetada**: Roboto (licencia Apache 2.0, tomada del SDK de Flutter) va dentro de la app y el tema la fija:
   la app ya no pide nada a `fonts.gstatic.com`, y la CSP puede decir `connect-src 'self'`.
7. **`configurarSeguridad(app)`** reúne todo y lo usan **`main.ts` y las pruebas e2e**: lo que se prueba es lo que corre.

## Qué se comprobó

- **En un navegador real** (la vitrina servida por la API): funciona (inicio de sesión, aviso de privacidad), sin
  violaciones, y la CSP **bloquea** un script inyectado, un `fetch` a otro origen y una imagen hacia otro sitio con el
  token en la dirección (las tres violaciones quedaron registradas). La app Flutter arranca bajo su CSP **cargando solo
  desde el propio host**.
- `src/seguridad/seguridad-http.spec.ts` (19 pruebas) y `test/seguridad.e2e-spec.ts`: cabeceras en toda respuesta, 415 con el
  ataque real (un marco gzip válido más bytes de sobra) y el servidor sigue vivo, CORS, y que ningún endpoint procese multipart.

## Consecuencias

- Un XSS en la vitrina ya no puede ejecutar su script ni mandar el token a otro sitio.
- **Cualquier cambio a la vitrina que agregue un script o un estilo en línea cambia el hash** (se recalcula solo) pero uno
  nuevo, **adicional**, queda bloqueado: la prueba lo avisa antes de llegar a producción.
- La CSP de la app web admite `'unsafe-inline'` en **estilos** (Flutter lo necesita); es un riesgo menor que en scripts y está
  aceptado.
- El código de Flutter web carga WebAssembly (`wasm-unsafe-eval`): necesario, y no habilita `eval` de JavaScript.
- HSTS no se puede deshacer rápido: si algún día el sitio dejara de servirse por HTTPS, los navegadores que lo vieron
  se negarían a abrirlo por HTTP hasta que venza (seis meses).
- Los caracteres que Roboto no tenga (por ejemplo, un emoji) caerían a la fuente del sistema, porque la descarga de
  fuentes de respaldo de Google queda bloqueada. El texto de Recobra es español, que Roboto cubre.
- Peso: +~500 KB en la app (tres variantes de Roboto).

## Qué haría revisar esta decisión

- Que la vitrina necesite recursos de otros orígenes (mapas, analítica): habría que ampliar la CSP con un origen concreto.
- Un cambio de la versión de Flutter que exija otras directivas en `/app/`.
- Pasar el token a una cookie `HttpOnly`: cambiaría T03 (y abriría CSRF).
