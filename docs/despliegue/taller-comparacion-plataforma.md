# Taller aplicado de despliegue — comparación de alternativas

Corresponde a la actividad de Moodle `arqsw:taller-docker` (segundo corte,
15%, calificada una sola vez sobre el commit vigente al cierre — sin
archivo aparte que subir).

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
- **Arranque en frío vs. p95 del escenario, medido (no citado):** el
  escenario S5 fija el objetivo de p95 en 100 ms para
  `POST /publicaciones` (`docs/medicion-corte1.md`). No desplegamos la
  alternativa descartada (sería incoherente con descartarla), pero sí
  medimos localmente, de forma reproducible, el proxy más honesto que
  podíamos producir sin esa cuenta externa: el tiempo real desde que
  arranca un proceso Node/NestJS en frío hasta que responde su primera
  petición — exactamente lo que ocurre en una función serverless al
  "despertar", solo que sin el aprovisionamiento del contenedor de la
  plataforma encima (que solo puede sumar tiempo, nunca restarlo).

  ```bash
  START=$(date +%s%N)
  node dist/main.js &
  until curl -s -o /dev/null http://localhost:3000/health; do sleep 0.05; done
  END=$(date +%s%N); echo "$(( (END-START)/1000000 )) ms"
  ```

  Tres corridas, 2026-09-27: **586 ms, 576 ms, 568 ms** (arranque del
  proceso Node + inicialización de módulos NestJS + primera respuesta
  real de `/health`). Esa cifra ya es **5-6 veces el objetivo de 100 ms**
  de p95 de S5, y es una cota **inferior** conservadora del arranque en
  frío real de una función en Vercel/Lambda — la plataforma añade su
  propio aprovisionamiento de contenedor encima de esto, no lo elimina.
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
