# ADR-0032: Primera carga de la app web: compresión y umbral que reabre ADR-0031

## Estado

Aceptada — 2026-11-28. Reemplaza parcialmente a
[ADR-0031](0031-una-sola-interfaz-la-app-flutter-reemplaza-la-vitrina.md): su criterio de revisión («que
la primera carga supere lo aceptable») pasa a ser un umbral medible. Responde a la pregunta 3 de la
evaluación S16 y entra en la [matriz de retroalimentación](../retroalimentacion-final.md).

## Contexto

ADR-0031 dejó una sola interfaz, la app Flutter, y aceptó como costo una primera carga más pesada, sin
decir cuánto ni desde qué valor sería inaceptable. La evaluación S16 preguntó: si Flutter Web tarda
demasiado en la red del campus, ¿qué umbral reabre ADR-0031 y cómo se conservarían el 404 y la
moderación sin volver a duplicar la interfaz?

Medido el 2026-11-28 en producción (`curl` con `Accept-Encoding: gzip`):

| Archivo | Tamaño servido |
|---|---|
| `main.dart.js` (la app) | 3,3 MB |
| `canvaskit/canvaskit.wasm` (motor gráfico) | 7,2 MB |
| Resto (`index.html`, `flutter_bootstrap.js`, `canvaskit.js`) | 0,1 MB |
| **Primera carga** | **10,6 MB, sin comprimir** |

El servidor no comprimía nada. Para quien abre Recobra desde el celular, entre clases y con los datos
móviles o la Wi-Fi compartida del campus, son 10,6 MB antes de poder buscar.

## Alternativas consideradas

### A. Dejar la carga como está (descartada)

Sin trabajo, pero el costo que ADR-0031 aceptó era evitable en su mayor parte: el código y el WebAssembly
se comprimen bien.

### B. Comprimir todas las respuestas, también la API (descartada)

Una línea de configuración. Pero respuestas como la de `POST /sesiones` llevan el token de sesión junto
a datos que escribe el usuario: es la combinación que aprovechan los ataques de tipo BREACH sobre HTTPS.
Las respuestas de la API pesan pocos kilobytes; no hay nada que ganar a cambio de ese riesgo.

### C. Volver a una página HTML liviana para buscar (descartada por ahora)

Cargaría en kilobytes, pero es exactamente la duplicación que ADR-0031 retiró. Queda como la salida si se
cruza el umbral de abajo.

### D. Comprimir solo los archivos de la app, y fijar un umbral (elegida)

## Decisión

1. **gzip solo bajo `/app/`** (`src/seguridad/compresion-de-la-app.ts`, prueba
   `src/seguridad/compresion-de-la-app.spec.ts`): la primera carga baja de 10,6 MB a **3,9 MB** (−63 %;
   `main.dart.js` 0,99 MB y `canvaskit.wasm` 2,9 MB). La API no se comprime.
2. **Umbral que reabre ADR-0031:** la primera carga **comprimida** de `/app/` no debe pasar de **5 MB**.
   A una conexión de 10 Mbit/s, 5 MB son unos 4 s de descarga. Se mide con:
   `curl -s -o /dev/null --compressed -w '%{size_download}' https://recobra.iscoutb.dev/app/<archivo>`
   sobre los archivos de la tabla.
3. **Si se cruza el umbral**, la respuesta no es volver a la vitrina completa: es una página de
   **búsqueda de solo lectura** (S1) servida por la API, que no publica, no reclama y no modera. Así:
   - el **404** no cambia, porque lo decide la API y no el cliente (ADR-0031, punto 2);
   - la **moderación** sigue solo en la app, porque la usan pocos administradores que pueden esperar
     la carga;
   - lo duplicado se limita a una lista con filtros, no a toda la interfaz.

## Consecuencias

**Positivas**

- La primera carga baja a 3,9 MB sin tocar la app ni su arquitectura.
- El criterio de ADR-0031 deja de ser una opinión («aceptable») y pasa a ser un número que cualquiera
  puede volver a medir.

**Negativas / riesgos asumidos**

- Comprimir cuesta CPU en el servidor en cada descarga. Es una vez por visitante: después, el navegador
  usa su caché (`ETag`).
- 3,9 MB sigue siendo más que una página HTML. El umbral deja margen (1,1 MB) para que la app crezca;
  una dependencia pesada nueva en Flutter puede consumirlo.

## Qué revisaría esta decisión

- La primera carga comprimida pasa de 5 MB, o se mide en la red del campus un tiempo hasta poder buscar
  mayor que 8 s en un celular de gama baja.
- Flutter publica un modo de compilación más liviano (por ejemplo, WebAssembly sin CanvasKit completo):
  se mide y se compara con el umbral.

## Referencias

- [ADR-0031](0031-una-sola-interfaz-la-app-flutter-reemplaza-la-vitrina.md), [ADR-0029](0029-cabeceras-de-seguridad-csp-y-cors.md) (cabeceras de seguridad)
- `src/seguridad/compresion-de-la-app.ts`, `src/seguridad/configurar-seguridad.ts`
- Pregunta 3 de la [evaluación S16](https://github.com/ISCOUTB/AS_202620_feedback/blob/master/revisiones/2026-2/AS_202620_Recobra/semana-16-final.md#preguntas-de-sustentación)
