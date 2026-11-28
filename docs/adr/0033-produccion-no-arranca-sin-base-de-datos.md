# ADR-0033: En producción, Recobra no arranca sin base de datos

## Estado

Aceptada — 2026-11-28. Reemplaza parcialmente a
[ADR-0006](0006-plataforma-persistencia-postgresql.md): el respaldo automático a memoria cuando falta
`DATABASE_URL` queda solo para pruebas y desarrollo. Responde a la observación del corte final del
2026-11-25 y entra en la [matriz de retroalimentación](../retroalimentacion-final.md).

## Contexto

ADR-0006 conectó PostgreSQL detrás de los puertos y dejó una regla: si `DATABASE_URL` no está
definida, cada contexto usa su adaptador en memoria. Sirve para las pruebas, que corren sin base.

El corte final señaló el riesgo de esa regla en producción: el `compose` de Dokploy no administra el
contenedor de PostgreSQL, así que si la variable se pierde (un servicio recreado, un error al editar el
panel), **la app arranca igual, en memoria**. `/health` y `/health/ready` responden 200, la gente publica
y reclama, y todo se pierde en el siguiente despliegue. Es el peor fallo posible para S2 y S6: una
reclamación aprobada que desaparece sin que nadie lo note.

## Alternativas consideradas

### A. Mantener el respaldo a memoria (descartada)

Cómodo, pero convierte un error de configuración en pérdida de datos silenciosa.

### B. Arrancar en memoria pero marcar `/health/ready` como degradado (descartada)

`/health/ready` ya informa `almacenamiento: "memoria"` o `"postgres"`, pero nadie lo mira en cada
despliegue, y mientras tanto el sistema acepta escrituras que va a perder.

### C. Negarse a arrancar en producción sin `DATABASE_URL` (elegida)

## Decisión

1. `persistenciaConfigurada()` (`src/infrastructure/persistence/seleccion-de-persistencia.ts`) decide
   una vez, al arrancar: con `DATABASE_URL`, PostgreSQL; sin ella y con `NODE_ENV=production` (lo fija el
   `Dockerfile`), el proceso **se detiene con un error que dice qué falta**. `main.ts` la llama antes de
   crear los módulos.
2. `PERMITIR_MEMORIA=true` es la única salida, explícita, para una demostración sin base.
3. Fuera de producción (pruebas, desarrollo) nada cambia: memoria sin `DATABASE_URL`.
4. El CI arranca la imagen Docker sin base y exige que se detenga con ese mensaje (job «Backend NestJS»).

## Consecuencias

**Positivas**

- Un error de configuración se ve en el despliegue (el contenedor no levanta y Dokploy lo marca), en
  vez de convertirse en datos perdidos días después.
- El CI lo comprueba sobre la imagen real, no solo en una prueba unitaria.

**Negativas / riesgos asumidos**

- Un despliegue con la variable mal puesta deja el servicio caído hasta corregirla. Se prefiere caído y
  visible a «funcionando» sin guardar nada.

## Qué revisaría esta decisión

- Que se necesite un modo de solo lectura cuando la base no está disponible: sería otra decisión
  (degradación controlada), no volver al respaldo silencioso.

## Referencias

- [ADR-0006](0006-plataforma-persistencia-postgresql.md), [ADR-0010](0010-despliegue-en-dokploy-servidor-del-laboratorio.md), [ADR-0027](0027-la-decision-de-datos-mas-costosa-de-revertir.md)
- `src/infrastructure/persistence/seleccion-de-persistencia.ts` y su prueba `seleccion-de-persistencia.spec.ts`, `src/main.ts`
- `.github/workflows/ci.yml` (paso «La imagen no arranca en producción sin base de datos»), `deploy/compose.lab.yaml`
- Observación del [corte final](https://github.com/ISCOUTB/AS_202620_feedback/blob/master/revisiones/2026-2/AS_202620_Recobra/corte-final-2026-11-25.md#coherencia-de-arquitectura--c2-y-c4)
