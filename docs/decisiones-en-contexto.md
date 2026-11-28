# Decisiones de arquitectura en el contexto de Recobra

Responde a la recomendación del jurado en la sustentación final (2026-11-23): justificar cada decisión
por **lo que el proyecto necesita**, no por el software en sí. Cada fila parte de un rasgo del contexto de
Recobra, lo conecta con el escenario de calidad que lo vuelve medible y cierra con la evidencia. Es el
índice razonado de [arc42 §9](arc42/arc42.md#9-decisiones-de-arquitectura); el detalle de cada decisión
sigue en su ADR.

## El contexto que manda

| Rasgo de Recobra | Fuente | Escenarios que lo vuelven medible |
|---|---|---|
| **C1 · La confianza es lo primero.** Una entrega a quien no es el dueño destruye la plataforma | [árbol de utilidad](calidad/arbol_utilidad.md), S2 prioridad 1 | S2, S6 |
| **C2 · Campus delimitado.** ~7.000 estudiantes; ~200 a la vez en un pico, 1.000 si crece | [ficha del problema](ficha_problema.md), S1, S7 | S1, S7 |
| **C3 · Publicar es lo crítico, avisar no.** Un aviso tarde es tolerable; no poder publicar, no | [ficha del problema](ficha_problema.md) (tensión 2) | S3, S4a |
| **C4 · Datos de estudiantes.** Correos y fotos que pueden identificar a alguien (Ley 1581 de 2012) | [restricciones](calidad/restricciones_justificadas.md) | S2 |
| **C5 · Uso desde el celular, entre clases.** Red compartida, poco tiempo | ADR-0031, [ADR-0032](adr/0032-primera-carga-de-la-app-web-compresion-y-umbral.md) | S1 |
| **C6 · Proyecto de curso.** $0 sin tarjeta, stack cerrado, 4 personas, un semestre | [restricciones](calidad/restricciones_justificadas.md), arc42 §2 | S5 |
| **C7 · Usuarios UTB sin integración con su inicio de sesión** | ADR-0016 | S5 |

## Cada decisión, desde el contexto

| ADR | Decisión | Qué de Recobra la pidió | Escenario | Alternativa descartada y por qué | Evidencia |
|---|---|---|---|---|---|
| [0001](adr/0001-estilo-arquitectonico.md) → [0002](adr/0002-arquitectura-y-stack.md) | Hexagonal en un solo proceso | C3: un fallo de la base o del aviso no puede tumbar publicar. C6: había que cambiar de tecnología sin reescribir | S4a, S5 | Capas (2,7) y monolito modular (3,5) en la matriz ponderada de arc42 §4.2: aíslan por disciplina, no por estructura | `src/arquitectura.spec.ts`; memoria → PostgreSQL y Express → NestJS sin tocar el dominio |
| [0003](adr/0003-reto-corte1-stack-obligatorio.md) | NestJS + Flutter | C6: el curso cierra el stack. Su inyección de dependencias arma los puertos | S5 | FastAPI / NextJS: válidos, sin experiencia del equipo | Corte 1 |
| [0004](adr/0004-integracion-sincrona-vs-asincrona.md) | Síncrono donde se espera respuesta, eventos entre contextos | C3 | S3, S4a | Todo síncrono: un aviso lento haría lento publicar | `test/entrega-eventos.e2e-spec.ts` |
| [0005](adr/0005-plataforma-despliegue-backend.md) → [0010](adr/0010-despliegue-en-dokploy-servidor-del-laboratorio.md) | Dokploy del laboratorio | C6: $0 sin tarjeta. C5: un plan que se duerme 15 min falla justo cuando alguien vuelve a buscar | S1, S4 | Render gratis: 1.113 ms; Render de pago: rompe C6 sin garantizar S1 | [medicion-busqueda.md](medicion-busqueda.md) → [medicion-s10.md](medicion-s10.md): 157 ms |
| [0006](adr/0006-plataforma-persistencia-postgresql.md), [0020](adr/0020-consistencia-entre-publicaciones-y-reclamaciones.md), [0027](adr/0027-la-decision-de-datos-mas-costosa-de-revertir.md) | PostgreSQL con escrituras condicionales | C1: dos «es mío» sobre el mismo objeto no pueden aprobarse a la vez | S2 | Una base por contexto: más bases que operar sin escenario que lo pida | 37 pruebas de adaptadores contra PostgreSQL real (job `postgres`) |
| [0033](adr/0033-produccion-no-arranca-sin-base-de-datos.md) | Producción no arranca sin base | C1: una reclamación aprobada que se pierde en silencio es el peor fallo | S2, S6 | Respaldo a memoria (pérdida silenciosa); solo marcar `/health/ready` (nadie lo mira) | CI arranca la imagen sin base y exige que se detenga |
| [0007](adr/0007-no-incorporar-componente-generativo.md) | Sin IA generativa en tiempo de ejecución | C4: no mandar datos de estudiantes a un tercero. C6: sin costo variable | S2 | LLM para emparejar: costo, latencia y privacidad sin escenario que lo exija | ADR-0018 empareja con reglas medibles |
| [0008](adr/0008-busqueda-con-filtros-en-el-repositorio.md), [0034](adr/0034-indices-de-busqueda-por-categoria-y-lugar.md) | Búsqueda con filtros en PostgreSQL, con índices por categoría y lugar | C2: el volumen de un campus no justifica un motor de búsqueda; C5: la búsqueda es lo primero que se usa | S1 | Motor aparte (Elasticsearch): otra pieza que operar | [medicion-catalogo.md](medicion-catalogo.md): 100.000 publicaciones |
| [0009](adr/0009-versionado-del-contrato-y-error-unico.md) | Contrato versionado y error único | C6: app y API cambian a la vez, con el mismo equipo | S5 | Sin contrato: la app se rompe sin aviso | `npm run test:contract`, 129 e2e validadas contra OpenAPI |
| [0011](adr/0011-registro-de-enmiendas-a-adrs-aceptados.md) | Un ADR aceptado no se edita: se reemplaza | C6: equipo y semestre cortos; la historia de las decisiones es lo que se evalúa | S5 | Editar en sitio: se pierde por qué se cambió | `scripts/verificar-documentacion.js` |
| [0012](adr/0012-no-extraer-emparejamiento.md) | No extraer Emparejamiento | C2, C6: ningún dato pide otro servicio | S5, S7 | Microservicio: red y despliegue sin escenario que lo pida | Criterios escritos en el ADR |
| [0013](adr/0013-cuentas-con-correo-institucional-y-sesiones-opacas.md) | Correo `@utb.edu.co` y sesión opaca | C1, C7: computadores de sala; cerrar sesión tiene que cortar el acceso ya | S2 | JWT: no se revoca antes de vencer | `src/application/use-cases/identidad.spec.ts` |
| [0014](adr/0014-reclamacion-con-prueba-y-aprobacion.md) | Prueba del dueño + aprobación de quien lo encontró | C1: quien tiene el objeto en la mano es quien mejor juzga | S2 | Pregunta secreta; código al correo (prueba el correo, no el objeto) | `src/application/use-cases/reclamaciones.spec.ts` |
| [0015](adr/0015-notificaciones-en-la-aplicacion.md), [0024](adr/0024-conciliacion-de-avisos.md), [0026](adr/0026-entrega-de-avisos-con-eventos-reintentos-y-cola-de-fallidos.md) | Avisos por eventos en proceso, reintentos, cola de fallidos, conciliación | C3; C2: una instancia no justifica un broker | S3, S4a | Llamada síncrona; broker externo | `src/application/use-cases/entrega-de-eventos.spec.ts` |
| [0016](adr/0016-recobra-semiindependiente-de-la-app-utb.md) | Semiindependiente de la app UTB | C7: sin acceso al inicio de sesión de la UTB | S5 | Integración total: no hay acceso | Puertos de identidad listos para un adaptador nuevo |
| [0017](adr/0017-ciclo-de-vida-completo-cierre-vencimiento-y-entrega.md) | Ciclo de vida completo | C1: saber en qué terminó cada objeto | S6 | Publicaciones eternas | `src/domain/entities/publicacion.spec.ts` |
| [0018](adr/0018-coincidencias-persistidas-y-parecido-ponderado.md) | Coincidencias guardadas, parecido ponderado | C3: el aviso no se repite y se puede explicar | S3 | Recalcular siempre; IA (ADR-0007) | [medicion-emparejamiento.md](medicion-emparejamiento.md) |
| [0019](adr/0019-donde-esta-el-objeto-y-lo-tengo-yo.md) | Dónde está el objeto y «lo tengo yo» | Muchos objetos se dejan en portería | S2 | Solo correos entre personas | `test/hallazgos.e2e-spec.ts` |
| [0021](adr/0021-privacidad-y-datos-personales.md), [0023](adr/0023-fotos-con-privacidad.md) | Privacidad, retención y fotos dentro de la base | C4 | S2 | Fotos en un almacén externo: otro servicio y borrado no transaccional | `test/fotos.e2e-spec.ts` |
| [0022](adr/0022-moderacion-minima-reportes-y-ocultar.md) | Moderación mínima | C6: no hay un equipo de moderación | S2 | Moderación previa de todo: no hay quién | `test/moderacion.e2e-spec.ts` |
| [0025](adr/0025-diseno-de-cache-y-politica-de-invalidacion.md) | Caché mínima, sin Redis | C1: un dato viejo podría mostrar como disponible algo ya entregado | S1, S2 | Redis: una pieza más y lecturas viejas | `test/cache.e2e-spec.ts` |
| [0028](adr/0028-limites-de-uso-por-cuenta-y-por-origen.md), [0029](adr/0029-cabeceras-de-seguridad-csp-y-cors.md), [0030](adr/0030-seguridad-en-el-pipeline-dependencias-secretos-y-permisos.md) | Límites de uso, cabeceras y pipeline seguro | C4: datos de estudiantes en un servidor público | S2 | Sin límites: spam y prueba de contraseñas | [modelo de amenazas](seguridad/modelo-de-amenazas.md) |
| [0031](adr/0031-una-sola-interfaz-la-app-flutter-reemplaza-la-vitrina.md), [0032](adr/0032-primera-carga-de-la-app-web-compresion-y-umbral.md) | Una sola app adaptable; primera carga comprimida con umbral de 5 MB | C5, C6: una interfaz que mantener, usada sobre todo desde el celular | S1, S5 | Dos interfaces; redirigir por dispositivo; comprimir también la API (riesgo BREACH) | `test/raiz.e2e-spec.ts`, `src/seguridad/compresion-de-la-app.spec.ts` |

## Lo que el contexto todavía no resuelve

Están en [arc42 §11](arc42/arc42.md#11-riesgos-y-deuda-técnica): S7 en horizontal (estado en memoria),
el RTO de producción sin medir y S3 sin medir de punta a punta en producción.
