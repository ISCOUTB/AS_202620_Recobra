# Barrido de secretos

Evidencia de la semana 13 (control en el pipeline: [ADR-0030](../adr/0030-seguridad-en-el-pipeline-dependencias-secretos-y-permisos.md)).
El repositorio es **público**: un secreto que alguna vez se subió sigue visible en el historial aunque el último
commit ya no lo tenga. Por eso se barre **todo el historial y todas las ramas**, no solo el árbol actual.

## 1. Resultado (28-oct-2026)

| Qué se barrió | Cómo | Resultado |
|---|---|---|
| Árbol actual (`HEAD`) | `git grep` con la expresión del contrato (llaves de AWS, claves privadas, tokens de GitHub y Slack, `sk-…`, `password\|secret\|token\|api_key = valor`) | Solo nombres de variables (`token = …`), sin valores |
| **Historial completo** (180 commits, todas las ramas) | `scripts/barrido-secretos.js`: cada línea que alguna vez se agregó contra 7 firmas de alta confianza | **Sin credenciales** |
| Archivos sensibles alguna vez versionados (`.env`, `*.pem`, `id_rsa`, `*.keystore`, `google-services.json`…) | Nombres de archivo de todo el historial | Solo `.env.example` (la plantilla sin valores) |
| Credenciales de nube, base de datos y webhooks en el código | Las firmas anteriores | Ninguna |

Lo que el barrido tolera, con su motivo (lista de excepciones en el propio script, revisadas a mano): las
contraseñas de cuentas de **prueba locales** (`contrasena-segura-1`, `clave-local-123`), los tokens inventados
de las pruebas de la app (`tok-123`), los marcadores de posición de la documentación y la base efímera del CI
(sin contraseña).

**Sobre el token de Coveralls** que mencionó una no conformidad anterior: es un artefacto público de la
dependencia `debug@2.6.9`, no una credencial del equipo ([`no-conformidades.md`](../no-conformidades.md), punto 1);
el barrido actual no lo marca.

## 2. Lo que el barrido NO puede ver: filtraciones fuera del repositorio

Durante el trabajo del proyecto se detectó (y es el hallazgo con nombre propio): **la contraseña de la base de
datos y la URL del webhook de despliegue de Dokploy aparecieron en capturas de pantalla** compartidas durante el
trabajo. **No están en el repositorio ni en su historial** (lo confirma el barrido), pero siguen siendo
credenciales expuestas.

- Es la amenaza **T15** del [modelo de amenazas](modelo-de-amenazas.md): riesgo 25, **crítica**, la primera de la lista.
- **Estado: pendiente de la acción de quien administra el panel.** Hay que rotar la contraseña (`ALTER USER … PASSWORD`
  desde el terminal del servicio PostgreSQL, y actualizar `DATABASE_URL`), cerrar el puerto externo de la base si
  estuviera abierto y regenerar el webhook. La guía paso a paso ya se entregó al equipo en octubre y se repite aquí:
  rotar no es opcional aunque la captura «ya se borró»: quien la vio la conserva.
- Mientras no se rote, el riesgo **sigue abierto**, y este documento no afirma lo contrario.

## 3. Cómo se mantiene

- **En cada commit**, el trabajo «Seguridad (dependencias y secretos)» del flujo corre
  `node scripts/barrido-secretos.js` con el historial completo (`fetch-depth: 0`) y falla si encuentra algo.
- **Se prueba que el control funciona** (`src/seguridad/barrido-secretos.spec.ts`): un repositorio temporal con
  un token de GitHub, una cadena de conexión y una clave privada falla; **también falla si el secreto ya se
  quitó del último commit**; un `.env` borrado se señala; un `.env.example` no.
- Los secretos de prueba de esa misma prueba se arman en tiempo de ejecución para que el archivo no contenga
  nada que parezca una credencial.
- Si el barrido encuentra una credencial real: **rotarla el mismo día** y avisar al equipo. Quitarla del último
  commit no la quita del historial.
- Complemento que no depende del código: activar en la configuración de GitHub el escaneo de secretos y la
  protección contra envíos con secretos (*push protection*) del repositorio, si la organización lo permite.

## 4. Límites

- Son firmas conocidas: una credencial con un formato propio, sin las palabras `password`, `secret`, `token` o
  `api_key` cerca, no se detectaría.
- No revisa archivos binarios.
- No sabe nada de lo que se comparta por fuera del repositorio (capturas, chats, correos), como se vio en §2.
