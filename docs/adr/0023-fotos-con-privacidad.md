# ADR-0023: Fotos de las publicaciones con privacidad

## Estado

Aceptada — 2026-10-18. Cierra el pendiente de "fotos" de la evaluación del
planteamiento y cumple la condición que dejó [ADR-0021](0021-privacidad-y-datos-personales.md)
("si se agregan fotos hay que actualizar el aviso, el consentimiento y la
retención antes de guardarlas"). Contrato 5.2.0 (cambio compatible: rutas y un
campo nuevos). El aviso de privacidad sube a la versión `2026-10-19`.

## Contexto

Una foto ayuda a reconocer un objeto, pero en un sistema de objetos
**encontrados** es también la mejor prueba de que algo es tuyo: si cualquiera ve
la foto completa, cualquiera puede "reclamarlo" describiendo lo que vio, y la
verificación de ADR-0014 pierde sentido. Además, las fotos de celular traen
datos ocultos (EXIF) que incluyen la ubicación exacta, justo lo que el aviso de
privacidad decía no guardar, y pueden mostrar personas o documentos.

## Alternativas consideradas

### A. Foto pública para todos (descartada)

- **En contra:** regala la prueba de propiedad de los objetos encontrados.

### B. Mostrarla borrosa con CSS o en el cliente (descartada)

- **En contra:** los bytes completos igual se descargan; cualquiera los ve con
  las herramientas del navegador. No es privacidad, es maquillaje.

### C. Desenfocar en el servidor con una librería de imágenes (descartada)

- **En contra:** añade una dependencia nativa (compilación por plataforma en
  Docker y CI) y superficie de ataque por decodificar imágenes no confiables, para
  algo que se resuelve de otra forma.

### D. Foto completa restringida + miniatura diminuta generada por el cliente (elegida)

## Decisión

1. **Dos imágenes por publicación:** la foto (JPEG, hasta 1 MB y 2048 px por
   lado) y una **miniatura de 24 px** (hasta 32 px y 4 KB para el servidor). Los
   clientes reducen y vuelven a codificar la foto en el dispositivo (la vitrina con
   `canvas`, la app con el paquete `image`), y generan la miniatura.
2. **El servidor no confía en el cliente:** revisa que ambas sean JPEG, mide la
   miniatura sin decodificarla (lee el encabezado) y rechaza la que no sea
   realmente pequeña; así lo único público es de verdad de baja resolución. Además
   **quita los segmentos de metadatos** (EXIF/GPS, XMP, comentarios) de las dos.
3. **Quién ve qué:**
   - La miniatura de cualquier publicación es pública
     (`GET /publicaciones/{id}/foto/miniatura`).
   - La foto completa de un **perdido** es pública (quien lo perdió quiere que lo
     encuentren).
   - La foto completa de un **encontrado** (`GET /publicaciones/{id}/foto`) solo
     la ven **su autor** y **quien tiene una reclamación aprobada** sobre él; los
     demás reciben 403. Con una reclamación pendiente todavía no: el autor la usa
     para comparar con lo que el reclamante describe.
4. **Quién la cambia:** `PUT` y `DELETE /publicaciones/{id}/foto`, solo su autor y
   solo mientras la publicación está `publicado` (no se cambia la foto a mitad de
   una verificación). La publicación expone `tieneFoto`.
5. **Dónde vive:** contexto `Fotos` (`src/fotos/`), dueño único de la tabla `fotos`
   (bytes en `BYTEA` en la misma base PostgreSQL: el mismo respaldo, sin servicio
   nuevo). Publicaciones solo guarda el booleano `tieneFoto`, que el caso de uso
   actualiza por el puerto de Publicaciones. El cuerpo viaja como `image/jpeg`
   crudo (no base64 dentro de JSON) con la miniatura en la cabecera `X-Miniatura`;
   un lector propio de ese cuerpo responde los errores con el formato único de la
   API (413 si pasa de 1 MB).
6. **Retención:** la foto solo sirve mientras el objeto se puede reclamar. Se borra
   al **cerrarse** o **entregarse** la publicación (pasada diaria), al **ocultarla**
   un administrador (ADR-0022, en el momento) y al **eliminar la cuenta** de su
   autor (ADR-0021, en el momento).
7. **Aviso de privacidad:** ahora dice que se guardan fotos, que se les quitan los
   datos ocultos, quién ve qué y cuándo se borran.

## Consecuencias

- La privacidad de lo que se muestra al público es real (solo existe una imagen de
  24 px), no depende de que el cliente se porte bien.
- Quien reclama un objeto no ve la foto hasta que su reclamación se aprueba: es
  intencional, y significa que no puede "reconocerlo" por la foto antes de
  describirlo.
- Las fotos pesan en la base de datos (hasta 1 MB por publicación). Con el
  volumen actual es aceptable; si crece, el puerto `FotoRepository` permite pasar
  a almacenamiento de objetos sin tocar los casos de uso.
- La miniatura de 24 px puede dejar ver el color y la forma general de un objeto
  encontrado. Es lo que se quiere mostrar; lo que identifica (marcas, textos,
  rasguños) no se distingue.
- El servidor no verifica **qué hay** en la foto (personas, documentos): eso se
  cubre con el aviso, el botón de reportar (ADR-0022) y la retención.
- El EXIF se quita sin decodificar la imagen, pero no se corrige la orientación;
  los clientes la corrigen antes de enviar.
- Las fotos de una cuenta eliminada se borran, pero no hay copias de seguridad
  configuradas todavía: cuando las haya, deberán respetar la retención.

## Qué haría revisar esta decisión

- Que haya muchas fotos o que pesen más: pasar a almacenamiento de objetos.
- Que se necesite revisar el contenido de las imágenes automáticamente.
- Que la universidad pida otra política de retención o de visibilidad.
