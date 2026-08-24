# ADR-0001: Estilo arquitectónico del backend de Recobra

## Estado

Aceptada — 2026-08-23

## Contexto

Recobra necesita un backend (Node.js/Express + PostgreSQL) que soporte el
ciclo de vida de una publicación (publicado → en contacto → reclamado/cerrado)
y el emparejamiento entre publicaciones de "perdido" y "encontrado". Los
atributos de calidad priorizados en S1/S2 son, en orden: disponibilidad,
seguridad y usabilidad del flujo de emparejamiento. El equipo es de 4
integrantes con experiencia previa en Express en capas (sin separación
formal de dominio), y el curso exige que la semana 4 arranque directamente
sobre la lógica de negocio, con un esqueleto ya ejecutable y probado desde el
Corte 1.

Se necesita decidir el estilo arquitectónico del backend antes de escribir
lógica de negocio, porque cambiarlo después de tener código de dominio
mezclado con Express/PostgreSQL es costoso para un equipo de este tamaño.

## Alternativas consideradas

### 1. Arquitectura en capas (layered)

Organización clásica: `routes/ → controllers/ → services/ → models/`. Es el
estilo que el equipo ya usó en Steamlinker.

- **A favor:** curva de aprendizaje mínima, rápida de montar, coincide con
  tutoriales y con la experiencia previa del equipo.
- **En contra:** sin una frontera explícita, el `service` termina llamando
  directamente al ORM/driver de PostgreSQL, lo que acopla las reglas de
  emparejamiento a la base de datos concreta y dificulta probarlas de forma
  aislada. Un fallo en la capa de notificaciones tiende a propagarse hacia
  arriba, lo que juega en contra de la disponibilidad priorizada en S1.

### 2. Arquitectura hexagonal (puertos y adaptadores)

El dominio (entidades + puertos) no depende de infraestructura; los
adaptadores (HTTP de entrada, PostgreSQL de salida, notificaciones de salida)
implementan esos puertos.

- **A favor:** el dominio y los casos de uso se prueban sin levantar HTTP ni
  base de datos real, lo cual da una prueba automatizada rápida y estable
  desde el primer commit. Un adaptador de notificación que falla se puede
  aislar/mockear sin tumbar el caso de uso de emparejamiento, lo que soporta
  directamente el atributo de disponibilidad. Cambiar de proveedor de
  notificaciones o de motor de persistencia no obliga a tocar el dominio.
- **En contra:** requiere que el equipo aprenda el concepto de inversión de
  dependencias y puertos, que no manejaban antes; hay más archivos e
  indirección para una funcionalidad pequeña; el riesgo de sobre-ingeniería
  es real si no se disciplina el equipo.

### 3. Monolito modular (módulos por dominio, sin capas transversales)

Un único desplegable dividido en módulos verticales (`publicaciones/`,
`emparejamiento/`, `notificaciones/`), cada uno con su propio
routes/service/model interno, sin frontera formal de puertos entre módulos.

- **A favor:** más cercano a lo que el equipo ya sabe que la hexagonal, pero
  con mejor cohesión que capas puras porque agrupa por dominio en vez de por
  tipo técnico. Rápido de montar.
- **En contra:** sin puertos explícitos, nada impide que un módulo importe
  directamente el cliente de PostgreSQL de otro, por lo que el aislamiento
  depende de la disciplina del equipo y no de la estructura. Es un paso
  intermedio razonable, pero no resuelve tan bien la testabilidad del dominio
  frente a fallos de infraestructura como la hexagonal.

## Decisión

Se adopta **arquitectura hexagonal (puertos y adaptadores)** para el backend
de Recobra, con la estructura de paquetes documentada en
`docs/arc42/04-estrategia-solucion.md` (`domain/`, `application/`,
`infrastructure/adapters/`).

Razón principal: de los tres estilos, es el único que aísla estructuralmente
—no solo por convención— el dominio de emparejamiento/notificación de los
fallos de infraestructura (caída de PostgreSQL, timeout del proveedor de
notificaciones), que es exactamente el riesgo que compromete la
disponibilidad priorizada desde S1. El costo de aprendizaje se considera
asumible porque el esqueleto de esta evidencia ya deja los puertos y
adaptadores mínimos creados y con una prueba en verde como referencia.

## Consecuencias

**Positivas**

- El dominio (`domain/`) se puede probar con `node --test` sin base de datos
  ni servidor HTTP real, dando pruebas rápidas y estables.
- Sustituir el motor de persistencia o el proveedor de notificaciones se
  reduce a escribir un nuevo adaptador que implemente el puerto existente.
- La semana 4 puede empezar directamente definiendo entidades y puertos del
  dominio, sin discutir de nuevo el montaje del proyecto.

**Negativas / riesgos asumidos**

- El equipo debe alinear criterio sobre qué va en `domain/` vs
  `application/` vs `infrastructure/`; se mitigará con revisión cruzada en
  cada PR.
- Mayor número de archivos/indirección que en capas para funcionalidades
  simples; se acepta como costo fijo a cambio de disponibilidad y
  testabilidad.
- Si el alcance del proyecto se reduce drásticamente, el estilo quedaría
  sobredimensionado; se revisará esta decisión si el corte 2 reduce alcance.

## Referencias

- `docs/arc42/04-estrategia-solucion.md` — matriz comparativa completa y
  principios de diseño derivados.
- Escenario de disponibilidad (S1) y escenario de seguridad (S2) del árbol de
  utilidad.
