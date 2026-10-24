# ADR-0025: Diseño de caché y política de invalidación

## Estado

Aceptada — 2026-10-21. Responde al pedido de la semana 12 (diseño de caché con
su política de invalidación). Implementado en
`src/observabilidad/politica-de-cache.middleware.ts` y probado en
`test/cache.e2e-spec.ts`. No cambia el contrato de la API.

## Contexto

Recobra no tenía caché. La pregunta no es "dónde ponemos Redis" sino **qué se
puede guardar sin que una lectura vieja rompa una operación**. Las lecturas
principales cambian con el ciclo de vida de las publicaciones (publicado →
en verificación → por entregar → entregado o cerrado, ADR-0017) y con la
moderación (ADR-0022), así que un dato guardado de más es un dato equivocado.

Dos hechos medidos condicionan la decisión:

- **No hay una necesidad de rendimiento que una caché resuelva.** En Dokploy,
  con 200 conexiones, la búsqueda alcanzó 1.337 peticiones por segundo con p97,5
  de **157 ms** contra el objetivo de 400 ms de S1
  ([`docs/medicion-s10.md`](../medicion-s10.md)); dentro de la API, el p95 de las
  últimas 200 búsquedas fue de 12,8 ms. Lo que ve el cliente es sobre todo
  trayecto de red, que una caché en el servidor no reduce.
- **Hay una sola instancia del backend** (ADR-0010). Una caché dentro del
  proceso funcionaría hoy y se volvería incoherente al agregar una segunda
  instancia.

## Qué se podría cachear y qué se decidió

| Candidato | Se guarda | Dónde | Cuánto | Qué lo invalida | Qué se rompería con una caché por tiempo |
|---|---|---|---|---|---|
| Búsqueda `GET /publicaciones` y detalle `GET /publicaciones/{id}` | Se revalida siempre (`no-cache`) | Navegador o intermediario, con **ETag** del contenido | 0 s de frescura: cada uso pregunta al servidor; si no cambió, responde **304** sin cuerpo | **Automática**: cualquier escritura cambia el contenido y, por tanto, el ETag; la siguiente pregunta recibe lo nuevo | Tras **aprobar** una reclamación el objeto seguiría "publicado" y otra persona podría intentar reclamarlo (409 confuso); tras **cerrar**, lo ya entregado seguiría en la búsqueda; tras **ocultar por moderación**, una publicación abusiva seguiría visible durante la vida de la caché |
| Resolver sesión → cuenta en cada petición autenticada | **No** | — | — | — | Cerrar sesión, vencimiento o eliminación de la cuenta tardarían en aplicarse: es un retroceso de seguridad a cambio de ahorrar dos consultas de ~1 ms |
| Lo de una persona (`/publicaciones/mias`, avisos, reclamaciones, `/cuentas/yo`, descarga de datos) | **No** (`private, no-store`) | — | — | — | Es información personal (contacto, pruebas): no debe quedar en ninguna caché compartida |
| Catálogo de lugares `GET /lugares` | Sí (`public, max-age=3600`) | Navegador y proxies | 1 hora | **Solo el tiempo.** El catálogo está en el código (`catalogo-lugares.ts`) y solo cambia al desplegar, pero **desplegar no invalida** la copia que ya tiene un navegador: la conserva hasta que se cumpla la hora. No hay forma de forzarla desde el servidor | Un lugar nuevo (o un piso corregido) tarda **hasta 1 hora después del despliegue** en verse en quien ya había abierto la vitrina o la app; no afecta ninguna operación, porque el lugar se envía como texto y el servidor no lo valida contra el catálogo |
| Miniatura de una foto `GET /publicaciones/{id}/foto/miniatura` | Sí (`public, max-age=60`) | Navegador y proxies | 60 s | **Por tiempo** (60 s): reemplazar, quitar o moderar la foto deja la miniatura vieja hasta 60 s en quien ya la pidió | Una miniatura de 24 px (borrosa, ADR-0023) sigue visible hasta 60 s tras quitarla; se acepta porque ya era pública y no identifica el objeto |
| Foto completa `GET /publicaciones/{id}/foto` | **No** (`private, no-store`) | — | — | — | Puede ser privada (la de un encontrado): no se guarda nunca |
| Vitrina y app web (archivos estáticos) | Sí, con revalidación | Navegador | Express: `public, max-age=0` + ETag/Last-Modified | Un despliegue cambia los archivos y su validador | Ninguno: siempre se pregunta antes de usar |

Todo lo demás (escrituras, `/health`, `/metrics`, errores) sale con `no-cache` o
`private, no-store` por omisión: la política por omisión es **no guardar sin
preguntar**, y cada excepción (lugares, miniatura) es explícita en su
controlador.

## Alternativas consideradas

### A. Caché en el servidor con tiempo de vida (en memoria o Redis) para búsqueda y detalle (descartada)

- **A favor:** menos consultas a la base.
- **En contra:** la base no es el cuello (12,8 ms internos), así que se pagaría
  complejidad sin beneficio medible. Una caché por tiempo no tiene política de
  invalidación tras escritura: rompe las tres operaciones de la tabla (aprobar,
  cerrar, moderar). Invalidar por escritura exigiría que cada caso de uso que
  cambie una publicación conozca la caché (acoplamiento entre contextos) y, con
  más de una instancia, un canal de invalidación compartido.
- **Se reconsideraría si:** el p95 interno de la búsqueda supera de forma
  sostenida 200 ms, o se agrega una segunda instancia.

### B. Caché de sesiones en memoria (descartada)

- **En contra:** retrasa la revocación (cerrar sesión, eliminar la cuenta) y
  crea un estado que no sobrevive a un reinicio ni se comparte entre instancias.

### C. Solo caché HTTP con revalidación, y tiempo de vida únicamente para lo que cambia con un despliegue o es inocuo (elegida)

La invalidación tras una escritura es **automática** para lo que importa
(ETag), y para lo que se deja envejecer (lugares, miniatura) el desfase máximo
está acotado y no afecta ninguna operación.

## Política de invalidación

1. **Lo que cambia con el ciclo de vida** no tiene tiempo de vida: se revalida
   en cada uso. La escritura invalida porque cambia el contenido y su ETag. No
   hay código de invalidación que olvidar.
2. **Lo que solo cambia con un despliegue** (lugares) vive una hora y **no se
   invalida**: se renueva por tiempo, no porque se despliegue. El desfase máximo
   tras un despliegue es esa hora, y es aceptable porque el catálogo es solo una
   ayuda para elegir y el servidor acepta cualquier lugar escrito (hay una opción
   "Otra…"). Si algún día un cambio del catálogo no pudiera esperar una hora, se
   baja el tiempo o se pasa a `no-cache` con ETag, como el resto.
3. **Lo que no puede mostrarse tras quitarse** (foto completa, lo personal) no se
   guarda.
4. **La miniatura** envejece 60 s: es el único caso en que un dato borrado puede
   seguir visible, acotado y documentado.

## Qué se probó

`test/cache.e2e-spec.ts` contra la aplicación real:

- la búsqueda y el detalle salen con `no-cache` y ETag;
- **invalidación tras escribir:** se pide un objeto y se guarda su ETag; la misma
  consulta condicional responde 304; se cambia su custodia (una escritura); la
  misma consulta condicional ya **no** responde 304 y trae el dato nuevo;
- lo personal sale con `private, no-store`; los lugares con `public, max-age=3600`;
  la miniatura con `public, max-age=60` y la foto completa con `private, no-store`;
- tras quitar una foto, el servidor deja de servir su miniatura (404): lo único
  que puede quedar es lo que ya estaba en la caché de un cliente, hasta 60 s.

`politica-de-cache.middleware.spec.ts` comprueba que los archivos estáticos
quedan fuera de la política de la API.

## Consecuencias

- Hay caché donde es segura y no la hay donde una lectura vieja rompería algo,
  con la razón escrita para cada caso.
- Cada petición de búsqueda llega al servidor (para comparar el ETag). Es
  deliberado: cuesta una consulta de ~1 ms y evita una clase entera de errores
  de datos viejos.
- El ETag lo calcula Express a partir del cuerpo; el servidor igual ejecuta la
  consulta para poder compararlo. No ahorra trabajo de base, ahorra ancho de banda.
- Si una publicación se oculta por moderación, su miniatura puede verse hasta 60
  s más en quien la tenía guardada. Si ese desfase deja de ser aceptable, se
  baja a 0 (`no-cache`).

## Qué haría revisar esta decisión

- p95 interno de la búsqueda sostenido por encima de 200 ms.
- Una segunda instancia del backend (una caché en el proceso divergiría).
- Un volumen de imágenes que haga caro servir miniaturas sin caché larga.
