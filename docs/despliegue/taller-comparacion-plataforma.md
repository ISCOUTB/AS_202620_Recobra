
   # Taller aplicado de despliegue — comparación de alternativas

   **Condición operativa:** no se recibió una asignación individual distinta
   a la del curso en general, así que se asume **límite de costo ($0/mes) +
   restricción de "sin tarjeta"** — es la única condición que la guía del
   curso declara que siempre aplica. Pendiente de confirmar con el docente
   antes de la sustentación si Recobra tenía otra condición asignada.

   **Pieza concreta y nombrada:** la API backend NestJS (`src/`) — el
   corte vertical de publicaciones (`POST /publicaciones`,
   `GET /publicaciones/:id`).

   ## Alternativa A — Contenedor gestionado (Render.com, plan Free)

   - **Supuesto de volumen:** hasta 200 usuarios concurrentes (escenario S1,
     ver `docs/calidad/escenarios_calidad.md`).
   - **Plan reproducible:** `Dockerfile` + `render.yaml` ya en la raíz del
     repositorio; se despliega aprobando el Blueprint en Render, sin tarjeta.
   - **Costo:** $0/mes con el uso estimado (~300-370 h/mes de 750 h/mes
     gratis). Punto de ruptura: agregar un segundo servicio Free que sume más
     de 750 h/mes combinadas, o necesitar disponibilidad continua (el plan
     Free "duerme" tras 15 min sin tráfico) — ahí tocaría el plan Starter,
     USD 7/mes.
   - **Procedimiento de reversión:** apagar el servicio en Render (un clic);
     el código y el `Dockerfile` no cambian, así que no hay nada que
     deshacer del lado del repositorio.

   ## Alternativa B — Función serverless (Vercel Functions, descartada)

   - **Plan reproducible (no ejecutado, solo el plan):** envolver `src/main.ts`
     con un adaptador tipo `serverless-http` o `@vercel/node`, exportando el
     handler de Nest como función; desplegar con la CLI de Vercel apuntando
     al mismo repositorio. Vercel tampoco pide tarjeta para el plan Hobby.
   - **Arranque en frío vs. p95 del escenario:** el escenario S5 fija el
     objetivo de p95 en 100 ms para `POST /publicaciones`
     (`docs/medicion-corte1.md`). El arranque en frío típico y **públicamente
     documentado** de una función Node.js con un framework como NestJS
     (carga del módulo, inyección de dependencias) ronda 200 ms–1000+ ms en
     la primera invocación tras inactividad — esto es una cifra **citada de
     benchmarks públicos de la industria, no medida por el equipo**, porque
     medirla de verdad exigiría desplegar la alternativa descartada, que es
     precisamente lo que no se hace. Aun así, esa cifra sola ya es varias
     veces el objetivo de 100 ms de p95, y se repite en cada arranque en frío
     (no solo el primero, como en un contenedor que se mantiene vivo con
     tráfico seguido).
   - **Por qué se descarta:** dos razones. (1) El adaptador de persistencia
     actual guarda todo **en memoria del proceso**
     (`src/infrastructure/persistence/memoria-publicacion.repository.ts`); una
     función serverless no garantiza el mismo proceso entre invocaciones, así
     que los datos se perderían de forma impredecible — peor que un
     contenedor que "duerme" pero conserva el proceso mientras sigue vivo.
     (2) El arranque en frío estimado compite mal con el objetivo p95 de S5.
   - **Costo:** $0/mes en el plan Hobby de Vercel, sin tarjeta. No es el
     costo lo que la descarta, es el estado en memoria y el arranque en frío.

   ## Decisión

   Se mantiene la Alternativa A (Render, contenedor) para esta pieza. La
   decisión completa, con más alternativas consideradas (incluida Fly.io,
   descartada por exigir tarjeta), está en
   [ADR-0005](../adr/0005-plataforma-despliegue-backend.md) — este documento
   es el análisis comparativo que pide el taller, no un ADR nuevo, porque es
   la misma decisión de plataforma ya tomada para la evidencia S8.
