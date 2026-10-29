# Análisis de dependencias

Evidencia de la semana 13 (decisión y política: [ADR-0030](../adr/0030-seguridad-en-el-pipeline-dependencias-secretos-y-permisos.md)).
No es el análisis estático del código (SonarCloud, que ya está en el pipeline desde el segundo
corte): mira los **paquetes de terceros** que Recobra usa y si tienen vulnerabilidades conocidas.

## 1. Qué corre y dónde

| Qué | Herramienta | Dónde |
|---|---|---|
| Dependencias de **producción** del backend (lo que lleva la imagen) | `npm audit --omit=dev` | Trabajo **«Seguridad (dependencias y secretos)»** de `.github/workflows/ci.yml`, paso «Análisis de dependencias (producción y Flutter)» |
| Dependencias de la **app Flutter** (`mobile/pubspec.lock`, 60 paquetes) | OSV (osv.dev, ecosistema Pub) | El mismo paso |
| **Revisión de los hallazgos** | `scripts/revisar-dependencias.js` contra [`hallazgos-dependencias.json`](hallazgos-dependencias.json) | El mismo paso: **falla** si aparece un aviso que no esté revisado, si una decisión venció o si una entrada no dice qué se decidió |
| Actualizaciones | Dependabot (`.github/dependabot.yml`: npm, pub, acciones de GitHub y Docker, semanal) | Abre solicitudes de cambio que el mismo flujo prueba |

```bash
grep -rniE 'snyk|dependabot|trivy|osv|npm audit|owasp' .github/ scripts/ | head   # dónde está la herramienta
npm run seguridad:dependencias                                                      # lo mismo, en local
```

- **Run del flujo con el análisis ejecutado:** [run 40804709036 (commit c579bf2)](https://github.com/ISCOUTB/AS_202620_Recobra/actions/runs/40804709036), trabajo «Seguridad (dependencias y secretos)» en verde
- **El resultado** queda en el resumen de cada ejecución (tabla de avisos, decisión y vencimiento).

Por qué un control propio de revisión y no solo `npm audit --audit-level=high` (que fallaría para siempre
con los avisos que se aceptan): **ejecutar la herramienta sin revisar lo que encuentra es evidencia
a medias**. Aquí cada aviso tiene una decisión escrita, con su alcance y una fecha de vencimiento, y el
flujo se rompe cuando aparece uno nuevo o cuando una decisión caduca.

## 2. Resultado (28-oct-2026)

### Backend, dependencias de producción

| Momento | Total | Críticos | Altos | Moderados | Bajos |
|---|:-:|:-:|:-:|:-:|:-:|
| Al empezar la semana | **10** | **1** | 5 | 4 | 0 |
| Después de aplicar lo aplicable | **7** | **0** | 4 | 3 | 0 |

**Qué se corrigió** (sin cambiar de versión mayor):

| Paquete | Antes | Ahora | Aviso | Cómo |
|---|---|---|---|---|
| `proxy-addr` | 2.0.7 | 2.0.8 | **Crítico**: suplantación de la dirección IP con subredes IPv4 mapeadas (GHSA-jqcg-44mw-7w3h) | `npm audit fix` |
| `body-parser` | 1.20.4 | 1.20.9 | **Alto**: un cuerpo comprimido con bytes de más tumba el proceso (GHSA-27r3-jxmh-p828) y límite inválido que desactiva el tope (GHSA-v422-hmwv-36x6) | `overrides` en `package.json` (la versión cae dentro del rango que pide Express) **y** rechazo con 415 de los cuerpos comprimidos (defensa que no depende de la versión) |
| `qs` | 6.14.2 | 6.16.2 | 4 avisos moderados de denegación de servicio | `overrides` en `package.json` |

### Los 13 avisos que quedan (7 paquetes afectados, 4 con aviso propio)

Todos nacen de **NestJS 10** (`@nestjs/core`, `@nestjs/platform-express`, `@nestjs/serve-static`) y su arreglo
exige NestJS 11 o 12 (Express 5), un cambio de versión mayor. Cada uno se **revisó uno por uno**: el
daño solo ocurre si se usa la función afectada, y Recobra **no la usa**; lo demuestra la prueba
[`src/alcance-de-dependencias.spec.ts`](../../src/alcance-de-dependencias.spec.ts), que falla si el código
empieza a usarla.

| Paquete | Avisos | Gravedad | Función afectada | ¿Se usa en Recobra? | Decisión |
|---|:-:|---|---|---|---|
| `multer` (por `@nestjs/platform-express`) | 9 | 7 altos, 1 moderado, 1 bajo | Recibir archivos con `multipart/form-data` (`FileInterceptor`, `MulterModule`) | **No.** La foto llega como cuerpo `image/jpeg` crudo (`express.raw`) y la revisa `revisarJpeg`; ninguna ruta procesa multipart (`test/seguridad.e2e-spec.ts`) | Aceptado, vence 15-dic-2026 |
| `file-type` (por `@nestjs/common`) | 2 | moderados | `FileTypeValidator` / `ParseFilePipe` de Nest | **No** | Aceptado, vence 15-dic-2026 |
| `@nestjs/core` | 1 | moderado | Eventos del servidor (`@Sse`): saltos de línea sin neutralizar en `type` e `id` | **No**: no hay endpoints SSE | Aceptado, vence 15-dic-2026 |
| `path-to-regexp` (por `@nestjs/serve-static` 4) | 1 | alto | Rutas con **dos parámetros en un mismo segmento** (`/:a-:b`): expresión regular con retroceso | **No**: ninguna ruta de Recobra los tiene (la prueba lo comprueba) y el servidor de archivos estáticos usa un patrón fijo | Aceptado, vence 15-dic-2026 |

**Plan de salida:** migrar NestJS a 11 o 12 elimina los 13. Es un cambio estructural (Express 5, rutas
con comodín, `serve-static` 5) que se hace con la red de seguridad de las 211 pruebas unitarias, las 122
e2e y la suite contra PostgreSQL real; está registrado en el ADR-0030 con **fecha límite 15-dic-2026**.
Ese día vencen las decisiones y el flujo se rompe si no se hizo o no se revisó de nuevo.

### Dependencias de desarrollo

El análisis completo (`npm audit`, con las de desarrollo) reporta **36** avisos: los 7 de producción
y **29 más de herramientas de desarrollo** (`jest`, `@nestjs/cli`, `jest-openapi`, `autocannon`, sus
transitivas). **No viajan en la imagen**: el `Dockerfile` instala con `npm ci --omit=dev`
(línea 27), así que ninguna está en el servidor. Corren solo en CI y en la máquina de quien desarrolla;
el riesgo que quedan es el de la cadena de suministro en tiempo de construcción (T17), que se acota con
acciones fijadas por SHA, permisos mínimos del flujo y Dependabot. Decisión: **aceptadas**, sujetas a
las actualizaciones de Dependabot y a la migración de NestJS (que renueva `@nestjs/cli`).

### App Flutter

60 paquetes de pub.dev (5 directos): **0 avisos conocidos** en OSV. Límite: OSV cubre el ecosistema Pub
de forma parcial, así que «0 avisos» significa «ninguno publicado que OSV conozca», no una garantía.
También se revisó qué hace la app al arrancar: dependía de `fonts.gstatic.com` (Google) para la
tipografía; ahora Roboto va empaquetada (T27).

## 3. Cómo se decide un hallazgo nuevo

1. Aparece en el flujo (falla el paso).
2. Se lee el aviso: ¿qué función afecta y la usamos?
3. Si hay arreglo compatible, se aplica (`npm audit fix`, o `overrides` en `package.json` cuando la versión
   parchada cae dentro del rango que pide el paquete padre).
4. Si no, se registra en `hallazgos-dependencias.json` con **decisión** (`aceptado`, `mitigado`,
   `pendiente-de-actualizacion`), **alcance** (por qué no nos afecta o cómo se mitiga), **evidencia**
   (la prueba que lo respalda), **plan** y **fecha de vencimiento**.
5. Si la decisión es «no se usa», se agrega una verificación en `alcance-de-dependencias.spec.ts`.

## 4. Límites

- `npm audit` y OSV conocen avisos publicados; no detectan paquetes maliciosos nuevos ni código
  vulnerable sin aviso.
- Que una función «no se use» es una afirmación sobre el código de hoy; la prueba de alcance la vigila,
  pero un cambio que la use y la modifique a la vez exige revisar el aviso a conciencia.
- Las dependencias transitivas de la imagen base (`node:20-alpine`, `postgres:16`) no se analizan aquí:
  Dependabot propone actualizar la imagen, y la imagen de PostgreSQL del CI va fijada por su digest.
