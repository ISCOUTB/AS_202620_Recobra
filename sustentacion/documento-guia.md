# Recobra · Documento guía de la sustentación final

**Arquitectura de Software 2026-2 · Universidad Tecnológica de Bolívar**
**Equipo:** Camilo, Fernando, Miguel, Verónica
**Sistema desplegado:** https://recobra.iscoutb.dev · **Repositorio:** https://github.com/ISCOUTB/AS_202620_Recobra

---

## 1. Problema y contexto de Recobra

En el campus, los objetos perdidos se buscan en grupos de WhatsApp y carteleras. Esos avisos se pierden, nadie verifica quién es el dueño y los datos personales quedan expuestos. **Recobra** conecta a quien perdió algo con quien lo encontró. Las personas publican, el sistema avisa cuando hay una posible coincidencia y la entrega exige una prueba de propiedad que aprueba quien tiene el objeto.

Cinco rasgos del contexto pesan en todas las decisiones (`docs/ficha_problema.md`, `docs/calidad/restricciones_justificadas.md`):

- **Espacio delimitado:** un campus, con unos 200 usuarios concurrentes previstos y un volumen modesto de publicaciones.
- **Prioridad número uno, la confianza:** una reclamación falsa le entrega el objeto a otra persona y destruye la credibilidad de toda la plataforma (S2 es la prioridad más alta del árbol de utilidad).
- **Datos personales de estudiantes:** correos, descripciones y fotos de objetos que pueden identificar a alguien (Ley 1581 de 2012).
- **Recursos de un curso:** $0 al mes y sin tarjeta. Lo opera el mismo equipo de 4 personas durante un semestre, y el stack es cerrado (NestJS o FastAPI, Flutter o NextJS).
- **Sobre la publicación y el aviso:** quien publica no puede esperar a que se envíe un aviso. Publicar y buscar son la operación crítica, y avisar es secundario (S4a).

El objetivo arquitectónico no fue acumular funciones, sino que **cada decisión responda a un escenario de calidad nacido de ese contexto y se pueda verificar con una medición o una prueba**.

## 2. Escenarios de calidad que guían las decisiones

| Escenario | Medida (`docs/calidad/escenarios_calidad.md`) | Estado hoy |
|---|---|---|
| **S1** Búsqueda | p95 ≤ 400 ms con filtros | **Cumple:** p97,5 de 203 ms con 200 conexiones en producción |
| **S2** Reclamación segura | 0 % llega a "reclamado" sin verificación; 100 % de intentos registrados | **Cumple:** por diseño y por prueba; la redacción de la medida está por actualizar (RV-05) |
| **S3** Aviso de coincidencia | 95 % notificado en ≤ 60 s | **En parte:** detección de ~2 ms medida en local; falta medir el aviso completo en producción |
| **S4 / S4a / S4b** Disponibilidad | ≥ 99 % mensual; publicar y buscar aunque fallen los avisos; RTO ≤ 5 min | **S4a cumple** (avisos desacoplados). S4 y S4b **sin medir**, aunque el respaldo y la restauración se verifican en el CI |
| **S5** Mantenibilidad | Un cambio como un filtro nuevo en ≤ 2 días, con las pruebas en verde | **Cumple:** hexagonal y CI con Quality Gate bloqueante |
| **S6** Trazabilidad | 100 % de cambios de estado con fecha y usuario | **En parte:** el ciclo de vida está completo; falta el historial (RV-04) |
| **S7** Escalabilidad | ×5 usuarios (200 → 1000) sin cambios estructurales | **No cumple en horizontal:** hay estado en memoria; queda el escalado vertical |

## 3. Vista general

Recobra usa **arquitectura hexagonal** (puertos y adaptadores), desplegada como **un solo proceso**:

- Una API NestJS organizada en contextos: Publicaciones, Emparejamiento, Reclamaciones, Notificaciones, Moderación, Fotos e Identidad.
- Una **app Flutter** compilada para web y servida en `/app/`.
- Una base **PostgreSQL 16**.

Todo corre en **Dokploy**, en el servidor del laboratorio, con TLS por Traefik. La interfaz es una sola: `/` redirige a `/app/` y la app se adapta al ancho, con menú lateral en computador y barra inferior en celular.

## 4. Decisiones principales: contexto, base técnica y costo

**4.1 Hexagonal en un solo desplegable (ADR-0001 → 0002, 0012).** Se compararon tres estilos con una matriz ponderada: capas 2,7, monolito modular 3,5 y hexagonal 4,1 (arc42 §4.2).
- *Contexto de Recobra:* lo opera un equipo de 4 personas en un semestre, con un solo servidor compartido y unos 200 usuarios. Ningún escenario pedía distribuir. Lo que sí sabíamos es que la plataforma y la base iban a cambiar (S5).
- *Base técnica:* con servicios separados habría que operar red, despliegues y fallas parciales entre ellos sin ganar nada medible. En cambio, hay 10 puertos (9 repositorios y el hash de contraseñas) y el dominio no depende de la infraestructura, así que cambiar de proveedor o de base no toca las reglas de negocio. `arquitectura.spec.ts` revisa en el CI que ninguna capa importe a otra que no debe, y ya atrapó una violación real.
- *Costo:* un fallo grave afecta a todo el proceso. ADR-0012 dice qué dato haría extraer Emparejamiento a un servicio aparte.

**4.2 Plataforma: de Render + Neon a Dokploy (ADR-0005 → ADR-0010).**
- *Contexto de Recobra:* el presupuesto es de $0 sin tarjeta, y el uso se concentra en horario de clases: alguien busca lo que perdió entre una clase y otra.
- *Base técnica:* Render + Neon era gratis, pero la medición de S1 dio **1.113 ms** con 20 conexiones, y el plan se dormía tras 15 minutos, con arranques de 20 a 50 s justo cuando alguien volvía a buscar. El plan de pago rompía el presupuesto sin garantizar el umbral. En Dokploy, con la base en la misma red interna, el mismo `Dockerfile` dio **157 ms con 200 conexiones**.
- *Costo:* el servidor es del laboratorio, no del equipo, y cada redespliegue deja el sitio sin servicio de 30 a 50 s.

**4.3 PostgreSQL (ADR-0006, 0020, 0027).**
- *Contexto de Recobra:* un mismo objeto puede tener varias personas diciendo "es mío". Si dos reclamaciones se aprueban a la vez, Recobra entrega el objeto a quien no es, y ese es el fallo que más daño hace a la confianza. Los datos son relaciones claras: cuenta → publicación → reclamación → coincidencia.
- *Base técnica:* S2 necesita "comparar y fijar" en una sola operación atómica. PostgreSQL lo da de forma nativa con `INSERT … ON CONFLICT` y `UPDATE … WHERE estado = …`, y con integridad referencial entre las tablas. Las consultas son parametrizadas, hay índices para la búsqueda y 37 pruebas de adaptadores corren contra una base real.
- *Costo:* es la decisión más cara de revertir (ADR-0027), así que el respaldo se restaura y se compara en cada push. Las fotos también viven en la base: es más simple de borrar, pero hace crecer el respaldo.

**4.4 Identidad y reclamación con prueba (ADR-0013, 0014, 0021).**
- *Contexto de Recobra:* los usuarios son de la UTB, pero Recobra todavía no está integrado al inicio de sesión de la universidad (ADR-0016). Quien encontró el objeto es quien mejor puede juzgar si la prueba es creíble: "la funda tiene un sticker de…". Los correos de ambas personas no deben quedar expuestos a cualquiera.
- *Base técnica:* las cuentas usan correo `@utb.edu.co` y sesiones opacas guardadas en PostgreSQL, que se revocan al cerrar sesión. Con JWT, revocar antes de que venza exigiría una lista de revocación, que en la práctica es la misma tabla. Sin una aprobación no existe el estado "Entregado", y los correos solo se muestran después de aprobar.
- *Costo:* agrega fricción para quien solo quiere recuperar lo suyo, un costo aceptado porque S2 está por encima de la usabilidad. Además, no se verifica que el correo sea de quien lo usa (T01/T02).

**4.5 Avisos por eventos con garantías (ADR-0015, 0024, 0026).**
- *Contexto de Recobra:* que el aviso llegue un poco tarde es tolerable. Que publicar falle porque el aviso falló no lo es (S4a). Recobra corre como una sola instancia.
- *Base técnica:* hay un bus de eventos en proceso. Si una entrega falla, se reintenta 3 veces y pasa a una cola de fallidos. Cada 5 minutos, una conciliación recrea los avisos que falten de los últimos 3 días. La app consulta la bandeja cada 20 s. No se usa broker porque, con una instancia, sería operar otra pieza sin que lo pida ningún escenario.
- *Costo:* si el proceso muere con un evento en vuelo, ese evento se pierde, y la conciliación lo recupera minutos después.

**4.6 Contrato y errores (ADR-0004, 0009).**
- *Contexto de Recobra:* la app Flutter y la API las construye el mismo equipo, y cambian en paralelo durante el semestre.
- *Base técnica:* el contrato OpenAPI está versionado (hoy en 5.4.0) y las 129 pruebas e2e lo validan automáticamente. El error tiene un formato único, `{statusCode, message}`, para que la app muestre todos los errores de la misma manera.

**4.7 Una sola interfaz (ADR-0031).**
- *Contexto de Recobra:* la mayoría busca desde el celular, en el campus, y una minoría desde el computador. Había una vitrina HTML y una app Flutter que se habían separado, y el usuario veía cosas distintas según el enlace.
- *Base técnica:* `/` redirige a `/app/` y la app se adapta al ancho, con el corte en 900 px. Así hay una sola cosa que probar, mantener y proteger con una CSP. Además, las rutas inexistentes ahora responden 404 en JSON; antes la vitrina las ocultaba.

## 5. Resiliencia y seguridad

- **Modos de fallo con prueba** (`docs/modos-de-fallo.md`):
  - Si la base no responde, la conexión se corta a 3 s y la API responde 503, y `/health/ready` dice la causa.
  - Un doble toque desde el celular con mala señal no duplica la publicación, gracias a la `Idempotency-Key`.
- **STRIDE sobre nuestro C4:** 26 amenazas, de las cuales 18 están mitigadas y verificadas, 6 son parciales o aceptadas con motivo y 2 siguen pendientes. La más alta, **T15**, es operativa: la contraseña de la base y el webhook aparecieron en capturas de pantalla, y hay que rotarlos en el panel de Dokploy. El barrido de los commits salió limpio.
- **Controles:**
  - Cabeceras, CSP y CORS (ADR-0029).
  - Límites de uso por cuenta y por origen contra el spam de publicaciones (ADR-0028).
  - Moderación mínima con reportes (ADR-0022).
  - Privacidad: aviso versionado, consentimiento y limpieza periódica (ADR-0021).
  - Pipeline con auditoría de dependencias, barrido de secretos y acciones fijadas por hash (ADR-0030).

## 6. Evidencia y proceso

- **Pruebas en cada push:** 216 unitarias, 129 e2e contra el contrato, 37 contra PostgreSQL real y 35 de la app, más SonarCloud con Quality Gate bloqueante.
- **Mediciones:**
  - `medicion-busqueda.md`: S1 en Render.
  - `medicion-s10.md` y `medicion-s14.md`: S1 en Dokploy.
  - `medicion-emparejamiento.md`: S3.
- **31 ADR, ninguno borrado:** un ADR aceptado no se edita, se reemplaza (ADR-0011). El CI verifica los enlaces de la documentación, que cada ADR esté en arc42 §9 y las reglas de arquitectura.
- **Dependencias:** las 12 PR de Dependabot se decidieron con motivo técnico. Por ejemplo, no se actualizó Flutter justo antes de la sustentación para no cambiar el compilador de la app que se va a demostrar.

## 7. Límites declarados (arc42 §11)

| Límite | Por qué es aceptable hoy en Recobra | Qué lo haría cambiar |
|---|---|---|
| Una sola instancia (S7) | 1.490 peticiones/s sin errores alcanzan para un campus | Que el campus o la organización crezca: llevar límites, tareas y eventos fuera de la memoria |
| Eventos no durables | Un aviso tardío es tolerable; la conciliación lo recupera | Una segunda instancia o un consumidor externo, por ejemplo la app UTB: broker |
| RTO sin medir y respaldo sin programar | El respaldo se prueba en el CI | Configurarlo en Dokploy y cronometrar una restauración |
| NestJS 10 con avisos aceptados | No son alcanzables desde nuestro código, y hay pruebas que lo muestran | Vencen el 15-dic-2026: migrar a NestJS 11+ |
| Sin revisión de pares | Hubo revisión del curso y con IA | Que otro equipo revise Recobra |

## 8. Guía de la demostración

1. **S1:** buscar sin iniciar sesión, con filtros, en computador y en celular.
2. **S3:** la cuenta A publica "Perdí algo" y la cuenta B publica "Encontré algo" parecido. Aparecen la coincidencia y el aviso.
3. **S2:** A reclama con una prueba y B la aprueba. Solo en ese momento se ven los correos.
4. **Errores:** una ruta inexistente responde 404 en JSON. Se muestran `/health/ready` y `/metrics`.

**Plan B:** `npm run start` en local y las pruebas e2e en vivo.

**Documentación principal:** `docs/arc42/arc42.md`, `docs/adr/`, `docs/c4/`, `docs/calidad/`, `docs/seguridad/modelo-de-amenazas.md`, `docs/modos-de-fallo.md`, `docs/contracts/`.
