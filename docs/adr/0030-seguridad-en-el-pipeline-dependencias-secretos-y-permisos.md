# ADR-0030: Seguridad en el pipeline: dependencias, secretos y permisos

## Estado

Aceptada — 2026-10-28. Mitigación estructural de las amenazas **T16** (dependencias con vulnerabilidades
conocidas, entre ellas los avisos de NestJS 10), **T17** (cadena de suministro del flujo: acciones de terceros y
permisos de más) y **T15** (credencial filtrada, parte detectable) del [modelo de amenazas](../seguridad/modelo-de-amenazas.md).

## Contexto

El flujo de integración ya hacía pruebas, análisis estático (SonarCloud) y construcción de la imagen, pero:

- **Nadie miraba los paquetes de terceros.** Al medirlo, `npm audit --omit=dev` dio 10 avisos de producción,
  uno crítico (`proxy-addr`, suplantación de la dirección IP) y varios altos que se podían tumbar con una
  petición (`body-parser`).
- **Un secreto en un repositorio público no se borra con otro commit.** No había ningún control que barriera
  el historial.
- El flujo corría con los permisos por defecto del token de GitHub (más de los necesarios).

## Alternativas consideradas

### A. `npm audit --audit-level=high` como puerta (descartada)

Fallaría para siempre mientras existan los avisos que dependen de NestJS 10, y la respuesta habitual a un
flujo siempre rojo es ignorarlo o quitar la puerta. Una puerta que no se puede cumplir no protege.

### B. Ejecutar el análisis solo informativo (`|| true`) (descartada)

Ejecutar la herramienta sin que nada dependa del resultado es evidencia a medias: nadie decide nada.

### C. Migrar a NestJS 11/12 ya (descartada para esta semana)

Elimina los 13 avisos, pero es un cambio de Express 4 a 5 (rutas con comodín, `serve-static` 5) que no se
debe mezclar con la semana de seguridad ni hacerse a ciegas; se hace con fecha (abajo).

### D. Puerta con registro de hallazgos revisados y vencimiento (elegida)

## Decisión

1. **Trabajo `seguridad`** en `.github/workflows/ci.yml`, con `permissions: contents: read` (en todo el flujo):
   - `npm run seguridad:dependencias` (`scripts/revisar-dependencias.js`): corre `npm audit --omit=dev` sobre
     el backend y consulta OSV (ecosistema Pub) con `mobile/pubspec.lock`; **compara cada aviso con**
     [`docs/seguridad/hallazgos-dependencias.json`](../seguridad/hallazgos-dependencias.json).
     Falla si hay un aviso sin revisar, si una decisión venció, o si una entrada no trae decisión, alcance,
     evidencia y fecha.
   - `npm run seguridad:secretos` (`scripts/barrido-secretos.js`): barre **todo el historial y todas las ramas**
     (`fetch-depth: 0`) contra firmas de alta confianza y falla si encuentra una credencial o un archivo
     sensible versionado.
   - El resumen del run muestra la tabla de avisos.
2. **Los 13 avisos que quedan** (multer×9, file-type×2, `@nestjs/core` SSE, `path-to-regexp`) se registran como
   **aceptados con alcance**: la función afectada no se usa en Recobra. Lo demuestra
   `src/alcance-de-dependencias.spec.ts` (no hay `FileInterceptor`, `MulterModule`, `ParseFilePipe`, `@Sse`, ni rutas
   con dos parámetros en un segmento; ningún endpoint procesa multipart). **La decisión vence el 15-dic-2026.**
3. **Plan de salida con fecha:** migrar NestJS a 11 o 12 antes del 15-dic-2026, apoyándose en las pruebas
   unitarias, e2e y la suite contra PostgreSQL real. Si no se hace, el flujo se rompe ese día: el costo de
   olvidarlo es visible.
4. **Lo corregible se corrige:** `proxy-addr` (`npm audit fix`), `body-parser` y `qs` (`overrides` en
   `package.json`: la versión parchada cae dentro del rango que piden los paquetes padres). Los avisos de
   producción bajaron de 10 a 7 paquetes y de 1 crítico a 0.
5. **Dependencias de desarrollo** (29 avisos más): no viajan en la imagen (`npm ci --omit=dev` en el
   `Dockerfile`); quedan fuera de la puerta y a cargo de Dependabot.
6. **Dependabot** (`.github/dependabot.yml`): npm, pub, acciones de GitHub y Docker, cada semana. Las solicitudes pasan por el mismo flujo.
7. **Secreto filtrado fuera del repositorio** (capturas de pantalla): ningún barrido lo ve. Se registra como
   hallazgo con nombre propio (T15), **sin cerrarse hasta que quien administra el panel rote la contraseña**
   y regenere el webhook. El documento [barrido de secretos](../seguridad/barrido-de-secretos.md) lo dice sin
   adornos.
8. **Pasos del flujo que invocan `npm run`** y no `npx`: el análisis de SonarCloud marcó `npx` como ejecución
   de un paquete sin versión fijada (reglas S6505 y S8543).

## Consecuencias

- Un aviso nuevo en una dependencia de producción **rompe el flujo** y obliga a decidir: corregir o registrar con
  alcance y fecha.
- **El registro puede mentir**: «no se usa» es una afirmación sobre el código de hoy. La prueba de alcance
  la vigila, pero un cambio que use la función y edite la prueba a la vez exige leer el aviso a conciencia.
- `npm audit` y OSV solo conocen avisos **publicados**: no detectan paquetes maliciosos nuevos.
- El barrido tiene firmas conocidas: una credencial con formato propio y sin palabras clave pasa.
- **Pendiente fuera del código:** activar el escaneo de secretos y la protección contra envíos con secretos de
  GitHub (depende de los permisos de la organización); y que SonarCloud tenga el permiso «Execute Analysis»
  para el flujo.
- El mantenimiento nuevo: revisar las entradas del registro antes del 15-dic-2026.

## Qué haría revisar esta decisión

- Terminar la migración de NestJS: se vacía el registro y se puede endurecer a `--audit-level=high` sin excepciones.
- Que OSV o `npm audit` dejen de ser gratuitos o estables: cambiar de herramienta sin cambiar la política.
- Más de un repositorio o un equipo mayor: pasar de un JSON a una herramienta con interfaz.
