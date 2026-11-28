# Recobra · Preparación de la sustentación final (23-nov-2026)

Todo lo que hay que saber para exponer, hacer la demo y responder preguntas.
Presentación: https://claude.ai/artifact/TBjePMwcuhWMczJF6pCL7w (13 diapositivas, ~10 min).
Documento guía para Moodle: `sustentacion/documento-guia.md`.

---

## 1. La idea en una frase

> Cada pieza de Recobra existe porque un escenario de calidad la pidió, y cambió cuando una medición lo dijo.

Si se pierden en una respuesta, vuelvan a eso: **contexto de Recobra → escenario → decisión (ADR) → evidencia (medición o prueba)**.

Cada respuesta tiene dos patas: **la base técnica** (qué propiedad da la tecnología) y **el contexto de Recobra** (por qué esa propiedad importa en un campus, con estos usuarios y este equipo). Una sin la otra suena a libro o a opinión.

---

## 1.1 El contexto de Recobra (lo que justifica todo)

| Rasgo del contexto | De dónde sale | Qué decisiones empuja |
|---|---|---|
| **Campus delimitado**: ~200 usuarios concurrentes previstos (S7 habla de 200 → 1000), volumen modesto | `ficha_problema.md`, S7 | Monolito, una instancia, sin broker, sin motor de búsqueda aparte, sin caché tipo Redis |
| **La confianza es la prioridad número uno**: una reclamación falsa entrega el objeto a otra persona y quema la plataforma | Árbol de utilidad (S2 primero), `restricciones_justificadas.md` | PostgreSQL con escrituras atómicas, reclamación con prueba y aprobación humana, sesiones revocables |
| **Hoy se resuelve por WhatsApp y carteleras**: rápido pero sin búsqueda, sin verificación y exponiendo datos | `ficha_problema.md` | Búsqueda sin cuenta (S1), avisos automáticos (S3), correos visibles solo tras aprobar |
| **Datos personales de estudiantes** (correos, fotos que pueden identificar) | Ley 1581 de 2012, ADR-0021 | Privacidad versionada, fotos en la base con borrado transaccional, limpieza periódica |
| **Publicar y buscar son lo crítico; el aviso puede llegar tarde** | S4a | Avisos por eventos, desacoplados, con reintentos y conciliación |
| **Se usa sobre todo desde el celular, entre clases** | Uso del campus, ADR-0031 | Una sola app adaptable; no dormirse (por eso se dejó Render Free); Idempotency-Key contra el doble toque con mala señal |
| **Proyecto de curso**: $0 sin tarjeta, stack cerrado (NestJS/FastAPI + Flutter/NextJS), 4 personas, un semestre | `restricciones_justificadas.md`, ADR-0003 | NestJS + Flutter, Dokploy del laboratorio, nada que el equipo no pueda operar |
| **Usuarios de la UTB pero sin integración con su login todavía** | ADR-0016 | Cuentas propias `@utb.edu.co` detrás de puertos, listas para cambiar a inicio de sesión único |

---

## 2. Reparto y tiempos (15 min = ~10 de exposición + ~4 de demo + aire)

| # | Diapositiva | Quién | Tiempo | Qué tiene que quedar claro |
|---|---|---|---|---|
| 1 | Portada | Camilo | 0:30 | Problema: objetos perdidos en el campus, hoy por grupos de WhatsApp |
| 2 | Escenarios | Camilo | 1:00 | S1–S7 son los que mandan; las decisiones salen de ahí |
| 3 | Vista C4 | Fernando | 0:45 | Hexagonal en un solo proceso: una API NestJS, una app Flutter, una base PostgreSQL |
| 4 | Hexagonal | Fernando | 1:00 | Dominio sin dependencias; 10 puertos; el CI lo verifica |
| 5 | Render → Dokploy | Miguel | 1:00 | 1.113 ms → 157 ms; $0 y sin tarjeta |
| 6 | PostgreSQL | Miguel | 1:00 | Escrituras atómicas condicionales; la decisión más cara de revertir |
| 7 | Reclamación | Verónica | 1:00 | S2: sin prueba aprobada no hay entrega ni correos visibles |
| 8 | Eventos | Verónica | 1:00 | Bus en proceso + 3 reintentos + cola de fallidos + conciliación |
| 9 | Calidad medida | Miguel | 1:00 | Qué cumple, qué no, qué falta medir (honestidad) |
| 10 | Resiliencia y seguridad | Fernando | 1:15 | Modos de fallo con prueba; 26 amenazas STRIDE |
| 11 | Evolución | Verónica | 1:00 | 31 ADR, 4 reemplazos, ADR-0011, el CI vigila la documentación |
| 12 | Deuda | Camilo | 0:45 | Lo que no hacemos, dicho por nosotros |
| 13 | Demo | Camilo + 2.ª cuenta | 4:00 | S1, S3, S2 y caminos de error en vivo |

Regla: **cada quien defiende su decisión con el porqué**. Si el jurado pregunta a alguien, responde esa persona.

---

## 3. Guion corto por diapositiva

1. **Portada.** "Recobra conecta a quien perdió algo en el campus con quien lo encontró. Hoy no les vamos a mostrar pantallas: les vamos a mostrar por qué el sistema es como es."
2. **Escenarios.** "Partimos de siete escenarios de calidad. Los que más pesan: S1, búsqueda en menos de 400 ms; S2, cero entregas sin verificación; S3, aviso de coincidencia en menos de 60 s. Todo lo que sigue responde a alguno."
3. **C4.** "Recobra es para un campus: unos 200 usuarios, un equipo de 4 que lo opera y un servidor compartido. Por eso todo va en un solo proceso, no en microservicios: una API NestJS hexagonal con un módulo por contexto, una app Flutter y PostgreSQL. Ningún escenario pedía distribuir y cada pieza extra es un punto de falla en un servidor compartido (ADR-0012)."
4. **Hexagonal.** "El dominio no importa nada de infraestructura. Diez puertos: nueve repositorios y el hash de contraseñas, cada repositorio con un adaptador de PostgreSQL y otro en memoria. Por eso cambiamos de proveedor sin tocar reglas de negocio. Y no es una promesa: una prueba en el CI falla si una capa importa a otra que no debe; ya atrapó una violación real."
5. **Plataforma.** "Es un proyecto de curso: $0 y sin tarjeta. Empezamos en Render + Neon porque eran gratis. Medimos S1 y dio 1.113 ms con 20 conexiones, además de arranques en frío de 20–50 s. Pagar rompía la restricción de $0 sin tarjeta. Pasamos a Dokploy del laboratorio con la base al lado: 157 ms con 200 conexiones. Mismo Dockerfile (ADR-0010)."
6. **PostgreSQL.** "En Recobra varias personas pueden decir es mío sobre el mismo objeto; si dos reclamaciones se aprueban a la vez, entregamos a quien no es. S2 necesita 'comparar y fijar' en una sola operación atómica: que dos personas no reclamen y se aprueben a la vez. PostgreSQL lo da nativo: `ON CONFLICT` y `UPDATE … WHERE estado = …`. Además el modelo es relacional. Es la decisión más cara de revertir (ADR-0027), por eso se respalda y se restaura en cada push."
7. **Reclamación.** "Hoy por WhatsApp cualquiera dice es mío y todos ven tu número. Aquí quien reclama aporta una prueba; quien encontró el objeto, que es quien mejor puede juzgarla, la aprueba o la rechaza. Solo después de aprobar se ven los correos de ambos. Sin aprobación no hay 'Entregado', por diseño y por prueba (ADR-0014, ADR-0020)."
8. **Eventos.** "Para quien pierde algo, que el aviso llegue un minuto tarde es tolerable; que no pueda publicar, no (S4a). Por eso publicar no espera al aviso. Emparejamiento emite un evento; si falla la entrega se reintenta 3 veces, va a una cola de fallidos y cada 5 minutos una conciliación recrea lo que falte. No usamos broker: con una instancia no lo justifica ningún escenario (ADR-0024, ADR-0026)."
9. **Calidad.** "S1 y S2 cumplen. S3 cumple en la detección, ~2 ms medido en local, falta el aviso completo en producción. El RTO de S4b no está medido. S7 hoy no se cumple. Preferimos decirlo antes de que nos lo pregunten."
10. **Resiliencia y seguridad.** "Si la base cae, cortamos a 3 s y respondemos 503 con la causa en `/health/ready`. El doble clic no duplica (Idempotency-Key). En seguridad modelamos 26 amenazas sobre nuestro C4: 18 mitigadas, 6 aceptadas con motivo, 2 pendientes; la más alta, T15, es operativa."
11. **Evolución.** "31 ADR, ninguno borrado. Cuatro reemplazos, cada uno por un dato. Y una regla sobre cómo decidimos: un ADR aceptado no se edita, se reemplaza (ADR-0011). El CI revisa enlaces, el índice de ADR y las reglas de arquitectura en cada push."
12. **Deuda.** "Una sola instancia, eventos no durables, RTO sin medir, NestJS 10 con avisos que vencen el 15-dic, sin revisión de pares. Cada uno tiene escrito qué dato nos haría cambiarlo."
13. **Demo.** (Ver sección 5.) Cierre: "Cada pieza existe porque un escenario la pidió y cambió cuando una medición lo dijo. Gracias."

---

## 4. Lista antes de entrar

- [ ] Dos cuentas `@utb.edu.co` con sesión abierta: **A** en el computador, **B** en el celular (o el navegador en vista móvil).
- [ ] Cuenta A ya publicó **"Perdí algo · Audífonos negros"** (categoría y lugar anotados).
- [ ] Pestañas abiertas: `https://recobra.iscoutb.dev/app/`, `https://recobra.iscoutb.dev/no-existe`, `https://recobra.iscoutb.dev/health/ready`, `https://recobra.iscoutb.dev/metrics`.
- [ ] Probar 10 min antes que `/health/ready` responde 200.
- [ ] **No hacer push a `master` el día de hoy**: cada push redespliega y deja el dominio 30–50 s sin servicio.
- [ ] Plan B listo en un portátil: repo clonado, `npm install` hecho, base local.
- [ ] La presentación compartida con el equipo (menú *Compartir* del artifact) o abierta en el portátil que proyecta.
- [ ] Si se rotaron las credenciales de T15 antes de entrar: decir la fecha en la diapositiva 10.

---

## 5. Demo paso a paso (≈4 min)

| Paso | Escenario | Quién / dónde | Qué hacer | Qué decir |
|---|---|---|---|---|
| 1 | S1 | Computador, sin sesión (ventana privada) | Buscar "audífonos" con filtro de categoría | "Buscar no exige cuenta. Menú lateral en pantalla ancha." |
| 2 | S1 | Celular | La misma búsqueda | "Es la misma app; con ancho menor de 900 px cambia a barra inferior (ADR-0031)." |
| 3 | S3 | Cuenta B (celular) | Publicar "Encontré algo", misma categoría y lugar | "Publicar responde ya; el emparejamiento corre aparte, por evento." |
| 4 | S3 | Cuenta A (computador) | Abrir la campana: aparece la posible coincidencia | "Esto es S3: el aviso llega sin que nadie lo pida." |
| 5 | S2 | Cuenta A | "Es mío" → escribir la prueba | "Aún no se ve ningún correo." |
| 6 | S2 | Cuenta B | Aprobar la reclamación | "Solo ahora ambos ven el correo del otro. Sin aprobación, no hay entrega." |
| 7 | Errores | Navegador | Abrir `/no-existe` → 404 JSON; `/health/ready` → 200 con la base | "Error con un solo formato `{statusCode, message}` (ADR-0009); el health dice si la base responde." |

**Si algo falla en vivo:** decirlo con calma ("es justamente S4: veamos `/health/ready`") y pasar al plan B.

**Plan B (sin red o sin producción):**

```powershell
npm run start
```

```powershell
npm run test:e2e
```

Las 129 pruebas e2e recorren los mismos flujos contra el contrato OpenAPI.

---

## 6. Cifras que hay que saberse

| Dato | Valor |
|---|---|
| ADR | 31 (ninguno borrado; 4 reemplazos) |
| Escenarios de calidad | S1–S7 (más S4a/S4b) |
| S1 búsqueda (umbral p95 ≤ 400 ms; medimos p97,5, más exigente) | Render: **1.113 ms** (20 conexiones) → Dokploy: **157 ms** (200 conexiones, S10) → **203 ms** (S14) |
| Capacidad medida | 1.490 peticiones/s sin errores (S14) |
| S3 detección | ~2 ms, medido en local (falta medir de punta a punta en producción) |
| Pruebas | 216 unitarias · 129 e2e · 37 contra PostgreSQL real · 35 de la app Flutter |
| Contrato | OpenAPI **5.4.0**, validado con jest-openapi |
| Amenazas (STRIDE) | 26: 18 mitigadas · 6 parciales/aceptadas · 2 pendientes (T15 la más alta) |
| Puertos hexagonales | 10 |
| Eventos | 3 reintentos · cola de fallidos · conciliación cada 5 min sobre los últimos 3 días |
| Base caída | conexión corta a 3 s, consulta a 2 s, respuesta 503 |
| Redespliegue | 30–50 s sin servicio por push a `master` |
| Costo | $0/mes, sin tarjeta |
| Corte de NestJS 10 | avisos aceptados vencen el **15-dic-2026** |

---

## 7. Las decisiones en una línea (chuleta de ADR)

**Estilo y estructura**
- **0001/0002** Hexagonal (matriz: capas 2,7 · monolito modular 3,5 · hexagonal 4,1) en un solo proceso; NestJS + Flutter (el reto del corte 1 obligó el stack, **0003**).
- **0012** No extraer Emparejamiento a un servicio: ningún dato lo pide todavía.
- **0031** Una sola interfaz: la app Flutter reemplaza la vitrina HTML (reemplaza parte de 0022/0029).

**Datos y plataforma**
- **0005 → 0010** Render → Dokploy del laboratorio, por la medición de S1 y el costo $0.
- **0006** PostgreSQL (Neon al inicio, hoy en Dokploy).
- **0027** La decisión de datos más cara de revertir: el esquema y PostgreSQL.
- **0023** Fotos dentro de PostgreSQL (máx. 1 MB), por privacidad y borrado transaccional.
- **0025** Caché: qué se puede guardar sin servir un dato viejo; no hacía falta Redis (157 ms medidos, una instancia).

**Integración y consistencia**
- **0004 → 0009** Síncrono donde el usuario espera; contrato versionado y un solo formato de error.
- **0020** Consistencia publicaciones/reclamaciones con escrituras condicionales.
- **0024/0026** Avisos por eventos con reintentos, cola de fallidos y conciliación.
- **0018** Coincidencias guardadas con parecido ponderado.
- **0008** Búsqueda con filtros en el repositorio (no motor de búsqueda aparte).

**Negocio y privacidad**
- **0013** Correo institucional y sesiones opacas (no JWT).
- **0014** Reclamación con prueba y aprobación humana.
- **0015** Notificaciones dentro de la app: bandeja que se consulta cada 20 s, sin push.
- **0016** Recobra semiindependiente de la app UTB.
- **0017** Ciclo de vida completo: cierre, vencimiento y entrega.
- **0019** "Dónde está el objeto" y "lo tengo yo".
- **0021** Privacidad y datos personales (limpieza periódica).
- **0022** Moderación mínima: reportes y ocultar.
- **0007** No incorporar componente generativo (IA dentro del producto).

**Seguridad y proceso**
- **0028** Límites de uso por cuenta y por origen.
- **0029** Cabeceras de seguridad, CSP y CORS.
- **0030** Seguridad del pipeline: dependencias, secretos, permisos, acciones fijadas por hash.
- **0011** Un ADR aceptado no se edita: se reemplaza.

---

## 8. Preguntas contrafactuales (el jurado debe hacer al menos 3)

**¿Y si la carga se multiplica por 5 (S7)?**
*Contexto:* S7 imagina el campus pasando de 200 a 1000 usuarios concurrentes (por ejemplo, abrirlo a otras sedes). La propia medida admite escalado **vertical u horizontal**.
*Técnica:* en vertical (más CPU/RAM al contenedor) probablemente aguanta: hoy 203 ms frente a 400 ms con 200 conexiones y 1.490 peticiones/s sin errores; habría que medirlo. En horizontal **no** sin cambios, y está declarado (RV-03): las sesiones viven en PostgreSQL, pero los límites de uso, los intentos de inicio de sesión, el bus de eventos y cinco tareas periódicas viven en el proceso. Para dos instancias: contadores y bloqueo de tareas en PostgreSQL (o Redis) y eventos en un broker. El dominio no cambia porque está detrás de puertos.

**¿Y si se cae PostgreSQL?**
El proceso no se cuelga: conexión 3 s, consulta 2 s, 503 con mensaje claro, `/health/ready` dice la causa y `/health` sigue vivo. Hay prueba e2e de degradación. Respaldo y restauración se verifican en el CI en cada push. Falta: respaldo programado en producción (T26) y medir el RTO real.

**¿Y si el laboratorio deja de existir / cambia el proveedor?**
Ya pasó: Render → Dokploy. Mismo `Dockerfile`; cambia el manifiesto de despliegue y `DATABASE_URL`. ADR-0010 lo documenta, y `render.yaml` se conserva como referencia.

**¿Por qué PostgreSQL y no MongoDB?**
Honesto: no hay un ADR que compare con una base documental.
*Contexto:* en Recobra varias personas pueden decir "es mío" sobre el mismo audífono. Si dos reclamaciones se aprueban a la vez, entregamos el objeto a quien no es: el peor fallo posible para la confianza (S2, prioridad número uno).
*Técnica:* necesitamos comparar y fijar en una sola sentencia atómica (`ON CONFLICT`, `UPDATE … WHERE estado = …`) e integridad referencial. Los datos son relaciones: cuenta → publicación → reclamación → coincidencia. MongoDB tiene operaciones atómicas por documento, pero aquí la regla cruza publicación y reclamación; tendríamos que modelarlo a mano.

**¿Por qué no microservicios o un broker (Kafka/RabbitMQ)?**
*Contexto:* un campus, ~200 usuarios, 4 personas que operan el sistema un semestre, un servidor del laboratorio compartido y $0. El aviso puede llegar tarde sin daño (S4a).
*Técnica:* cada servicio o broker agrega red, despliegue y fallas parciales que hay que operar, sin mejorar ningún escenario medido. ADR-0012 dice qué dato nos haría extraer Emparejamiento; la deuda dice cuándo entra un broker (segunda instancia o un consumidor externo, como la app UTB).

**¿Por qué no JWT?**
*Contexto:* en un campus es común iniciar sesión en un computador de sala o prestado; cerrar sesión tiene que cortar el acceso **ya**, no cuando venza el token.
*Técnica:* un JWT no se revoca antes de vencer sin una lista de revocación, y esa lista es una tabla de sesiones. El token opaco en PostgreSQL se revoca al cerrar sesión, y la consulta cuesta poco con nuestro volumen (ADR-0013).

**¿Qué pasa si el proceso muere con un evento en vuelo?**
Se pierde, porque el bus no es durable. La conciliación cada 5 min recorre los últimos 3 días y recrea los avisos que falten: se recupera, no al instante.

**¿Por qué no se cumple S6 (trazabilidad)?**
El ciclo de vida existe (ADR-0017), pero no hay tabla de historial con fecha y usuario de cada cambio (RV-04). Es deuda declarada.

**¿S2 se cumple si el correo no se verifica?**
La redacción de S2 habla de "código estudiantil o correo institucional"; lo implementado es más fuerte: aprobación humana con prueba. Pero no verificamos que el correo `@utb.edu.co` sea de quien lo usa (T01/T02). Está en RV-05 para reescribir la medida.

**¿Cómo saben que la hexagonal se respeta?**
`src/arquitectura.spec.ts` revisa los imports en cada push. Atrapó una violación real (`estado-de-seguridad.ts` estaba en la capa equivocada y se movió a `application`).

**¿Qué es T15 y por qué sigue pendiente?**
La contraseña de la base y la URL del webhook de despliegue aparecieron en capturas de pantalla (fuera del repositorio; el barrido de los commits salió limpio). Hay que rotar la contraseña, cerrar el puerto externo y regenerar el webhook. Es operativa (panel de Dokploy), no de código. Es la primera acción que sigue.

**¿Por qué una sola interfaz (ADR-0031)?**
Teníamos una vitrina HTML y la app Flutter; se separaron y la vitrina escondía rutas inexistentes (devolvía la vitrina en vez de 404). Una sola app adaptada al ancho = una sola cosa que probar y mantener.

**¿Usaron IA?**
Sí; el registro está en `docs/ia.md` y hay auditorías (`docs/auditoria-generacion-ia.md`, pruebas de mutación). Respondan con lo que de verdad usaron.

---

## 9. Cosas por saber (preguntas sueltas)

### 9.1 ¿Cuál es la diferencia entre `https://recobra.iscoutb.dev/` y `https://recobra.iscoutb.dev/app/`?

Ninguna para el usuario: **son la misma app**.

- `/` no tiene página propia: responde **302** y redirige a `/app/` (`src/raiz/raiz.controller.ts`).
- `/app/` sirve la app Flutter compilada para web (`ServeStaticModule` en `src/app.module.ts`).
- Antes (hasta ADR-0031) `/` mostraba una **vitrina HTML** distinta de la app, y por eso se veían dos interfaces diferentes según el enlace. Esa vitrina se eliminó.
- El resto de rutas es la API (`/publicaciones`, `/health`, `/metrics`…). Una ruta que no existe responde 404 en JSON.
- Comprobado hoy: `/` → 302, `/app/` → 200, `/health/ready` → 200, `/no-existe` → 404.

Enlace para compartir: cualquiera de los dos; el "oficial" es `https://recobra.iscoutb.dev`.

### 9.2 ¿Por qué el diseño nuevo no se ve en `/app/`?

La app desplegada está al día (incluye la pantalla de Moderación del último cambio), pero **el sistema de diseño nuevo solo se aplicó a las diapositivas**, no a la app. Cambiar la app hoy implicaba recompilar Flutter y redesplegar justo antes de la demo, con riesgo y 30–50 s de corte. Queda como el siguiente paso (rebranding de `tema_utb.dart` con los colores claro/oscuro del sistema de diseño), después de la sustentación.

Si en su navegador la app se ve oscura: sigue el modo oscuro del sistema operativo.

Tampoco se ve nada de **Dependabot** en la app: esos cambios son de dependencias internas y del CI, no de pantallas.

### 9.3 ¿Qué es Dependabot y qué hicimos?

Dependabot es un bot de GitHub que abre PR cuando sale una versión nueva de una dependencia. Había **12 PR abiertas sin decidir** (observación RV-10). El 21-nov se decidió cada una con su motivo (`docs/seguridad/analisis-de-dependencias.md` §5):

| PR | Cambio | Decisión | Por qué |
|---|---|---|---|
| #8 | `pg` 8.23.0 → 8.23.1 | Integrada | Parche; las 37 pruebas contra PostgreSQL real pasan |
| #14 | Acción de SonarCloud 8.3 → 8.5 | Integrada | Compatible; el Quality Gate sigue bloqueante |
| #1, #3 | `actions/checkout` y `setup-node` v7 | Integradas | Solo el CI; siguen fijadas por hash (ADR-0030) |
| #12 | Imagen Node 20 → 26 | Reemplazada por **Node 24 LTS** | Node 20 sin soporte desde abr-2026; 24 es LTS hasta abr-2028 y ahora CI e imagen usan la misma versión |
| #15 | `image` 4.12 → 4.13.1 (Flutter) | Integrada y **revertida** | Su lockfile rompía con Flutter 3.41; el CI la rechazó. Va junto con #5 |
| #5 | Flutter 3.41 → 3.44 | Aplazada | Cambia el compilador de la app justo antes de la sustentación |
| #6, #7, #9 | NestJS 10 → 12 | Aplazadas | Van con la migración del framework (T16), antes del 15-dic |
| #10 | `flutter_lints` 5 → 6 | Aplazada | Reglas nuevas; va con la actualización de Flutter |

Mensaje para el jurado: **"El CI decide, no la intuición"**: #15 parecía segura y el CI la rechazó, así que se revirtió.

### 9.4 ¿Por qué Render y Neon al principio, y por qué los dejamos?

- **Render + Neon:** gratis, sin tarjeta, despliegue automático con cada push. Cumplían la restricción de costo $0.
- **Por qué se dejaron:** la medición de S1 dio 1.113 ms (umbral 400 ms) con 20 conexiones, y el plan gratuito se duerme tras 15 min (arranque en frío de 20–50 s). Pagar ($7/mes) rompía la restricción y no garantizaba cerrar la brecha.
- **Dokploy:** servidor del laboratorio, $0, no se duerme, la base al lado de la API por red interna → 157 ms con 200 conexiones.
- **Lo que se paga:** el servidor no es nuestro (dependencia compartida) y cada redespliegue corta 30–50 s.

### 9.5 ¿Qué corre el CI en cada push?

Backend (unitarias + e2e contra el contrato), adaptadores contra PostgreSQL real, Flutter (análisis + pruebas), seguridad (auditoría de dependencias y secretos), SonarCloud con Quality Gate bloqueante, verificación de documentación (`npm run docs:verificar`: enlaces, ADR en arc42 §9) y reglas hexagonales. Respaldo y restauración de la base también se verifican.

Punto débil conocido (RV-11): en las PR el análisis de Sonar se omite por un permiso de la organización; el gate solo se verifica tras integrar a `master`.

### 9.6 ¿Qué falta y quién lo hace?

| Pendiente | Dónde | Responsable |
|---|---|---|
| T15: rotar contraseña de la base, cerrar el puerto externo, regenerar webhook | Panel de Dokploy | Equipo (no se puede hacer desde el repo) |
| T26: respaldo programado + medir RTO | Panel de Dokploy | Equipo |
| T16: migrar NestJS 10 → 11+ | Repo | Antes del 15-dic-2026 |
| Rebranding de la app con el sistema de diseño | `mobile/lib/` | Después de la sustentación |
| RV-04 historial (S6), RV-05 redacción de S2, RV-06 medir S3 en producción | Repo / docs | Declarado en arc42 §11.4 |

---

## 10. Si nos preguntan algo que no sabemos

"No lo medimos / no lo decidimos formalmente; lo que sí tenemos es X, y el dato que nos haría decidir sería Y." Nunca inventar una cifra.
