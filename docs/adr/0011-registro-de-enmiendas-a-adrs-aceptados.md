# ADR-0011: Registro de enmiendas a ADR ya aceptados y regla de inmutabilidad

## Estado

Aceptada — 2026-10-08. Evidencia S10. Regulariza la sucesión de los ADR que
se editaron después de aceptarse (hallazgo repetido en las revisiones S8, S9
y S10) sin reescribir el historial de git ni los hashes ya citados.

## Contexto

El contrato del curso exige que un ADR aceptado no se reescriba: si la
decisión cambia, se crea un ADR sucesor y el anterior se marca como
reemplazado. Cuatro ADR del proyecto se editaron después de aceptarse, sin
declarar sucesor:

| ADR | Aceptada | Edición posterior | Qué se cambió |
|---|---|---|---|
| [ADR-0002](0002-arquitectura-y-stack.md) | 2026-09-05 | commit `f7c1a6c`, 2026-09-07 | Se agregó el enlace al commit de implementación |
| [ADR-0003](0003-reto-corte1-stack-obligatorio.md) | 2026-09-05 | commit `f7c1a6c`, 2026-09-07 | Se agregaron el enlace al commit y la referencia a la etiqueta `corte-1` |
| [ADR-0004](0004-integracion-sincrona-vs-asincrona.md) | 2026-09-19 | commit `34ab8f2`, 2026-09-28 | Se agregó una "Actualización 2026-09-28" sobre Emparejamiento y el contrato 2.0.0 |
| [ADR-0005](0005-plataforma-despliegue-backend.md) y [ADR-0006](0006-plataforma-persistencia-postgresql.md) | 2026-09-26 / 2026-09-27 | un día después de aceptarse | Se agregó una sección "Verificación" |

En ningún caso cambió el fondo de la decisión: fueron enlaces y evidencia
nueva. Aun así, son ediciones posteriores a la aceptación.

## Alternativas consideradas

### A. Reescribir el historial para deshacer las ediciones (descartada)

Cambiaría los hashes ya citados en revisiones anteriores (`f7c1a6c` es el
hash de la etiqueta `corte-1`) y destruiría la trazabilidad que el curso
quiere preservar. Ver también
[`docs/no-conformidades.md`](../no-conformidades.md), puntos 6 y 8.

### B. Declarar las enmiendas y fijar la regla hacia adelante (elegida)

Se deja constancia de cada edición en este ADR, cada ADR afectado lleva una
línea de estado que enlaza al sucesor o a este registro (la misma práctica
que ya se usó con ADR-0001, "Reemplazada por ADR-0002"), y desde ahora la
evidencia nueva va en documentos aparte.

## Decisión

Se adopta la alternativa B, con tres reglas:

1. **Un ADR "Aceptada" no se vuelve a editar**, salvo una única línea de
   estado que lo marque como reemplazado (total o parcialmente) por un ADR
   sucesor, con enlace.
2. **La evidencia nueva** (una verificación, una medición, un enlace a un
   commit) va en documentos aparte que enlazan al ADR: `docs/medicion-*.md`,
   `docs/auditoria-*.md`, `correcciones.md`.
3. **Si la decisión cambia**, se escribe un ADR nuevo con su estado y sus
   alternativas.

Sucesión resultante:

| Decisión original | Reemplazo | Alcance |
|---|---|---|
| ADR-0001 | [ADR-0002](0002-arquitectura-y-stack.md) | Total (ya registrado) |
| ADR-0004 | [ADR-0009](0009-versionado-del-contrato-y-error-unico.md) | Parcial: lo que ADR-0004 dejó de describir (Emparejamiento, contrato 2.x, error único). La decisión de integración sigue vigente |
| ADR-0005 | [ADR-0010](0010-despliegue-en-dokploy-servidor-del-laboratorio.md) | Total: plataforma de despliegue |
| ADR-0006 | [ADR-0010](0010-despliegue-en-dokploy-servidor-del-laboratorio.md) | Parcial: solo el alojamiento de la base; PostgreSQL detrás del puerto sigue vigente |
| ADR-0002 y ADR-0003 | Sin reemplazo: su decisión sigue vigente | Las ediciones de `f7c1a6c` quedan registradas en esta tabla |

## Consecuencias

- Las no conformidades históricas siguen siendo ciertas (los commits
  existen); lo que se corrige es que ahora están declaradas y enlazadas.
- Los ADR 0002 a 0006 reciben una sola línea de estado que apunta a este
  registro o al sucesor; es la única edición permitida por la regla 1.
- A quien revise le basta con esta tabla para saber qué decisión sigue
  vigente.

## Qué haría reconsiderar esta decisión

Que el docente pida expresamente reescribir el historial, o que se detecte
una edición posterior a una fecha de cierre que cambie el fondo de un ADR y
no solo un enlace.
