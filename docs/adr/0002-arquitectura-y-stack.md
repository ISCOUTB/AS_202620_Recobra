# ADR-0002: Arquitectura y stack tecnológico de Recobra

## Estado

Aceptada - 2026-09-05.
Reemplaza a ADR-0001.
Complementada por [ADR-0003](0003-reto-corte1-stack-obligatorio.md) (marco
formal del reto de corte 1 y su medición).

## Contexto

Recobra necesita un backend y un frontend que soporten el ciclo de vida de
una publicación (publicado → en contacto → reclamado/cerrado) y el
emparejamiento entre publicaciones de "perdido" y "encontrado". Los
atributos de calidad priorizados en S1/S2 son, en orden: disponibilidad,
seguridad y usabilidad del flujo de emparejamiento; S3 exige notificar al
usuario ante una coincidencia probable.

El curso fija dos restricciones de partida:

- El backend debe construirse en **NestJS** o **FastAPI**.
- El frontend debe construirse en **Flutter** o **NextJS**.

El equipo es de 4 integrantes, con experiencia previa en Node.js/Express y
en Flutter. Hay que decidir, dentro de ese espacio de opciones, tanto el
estilo arquitectónico interno del backend como el framework concreto de
cada capa, antes de escribir lógica de negocio: cambiar cualquiera de las
dos decisiones después de tener código de dominio ya mezclado con un
framework o motor de datos concreto es costoso para un equipo de este
tamaño.

## Alternativas consideradas — Estilo arquitectónico del backend

### 1. Arquitectura en capas (layered)

Organización clásica: `routes/ → controllers/ → services/ → models/`.

- **A favor:** curva de aprendizaje mínima, coincide con la experiencia
  previa del equipo.
- **En contra:** sin una frontera explícita, el `service` termina llamando
  directamente al ORM/driver de base de datos, acoplando las reglas de
  emparejamiento a la persistencia concreta y dificultando probarlas de
  forma aislada. Un fallo en notificaciones tiende a propagarse hacia
  arriba, en contra de la disponibilidad priorizada en S1.

### 2. Arquitectura hexagonal (puertos y adaptadores)

El dominio (entidades + puertos) no depende de infraestructura; los
adaptadores (HTTP de entrada, persistencia de salida, notificaciones de
salida) implementan esos puertos.

- **A favor:** el dominio y los casos de uso se prueban sin levantar HTTP ni
  base de datos real. Un adaptador de notificación que falla se aísla sin
  tumbar el caso de uso de emparejamiento, lo que sostiene directamente la
  disponibilidad. Cambiar de proveedor de notificaciones o de motor de
  persistencia no obliga a tocar el dominio.
- **En contra:** exige que el equipo maneje inversión de dependencias y
  puertos; más archivos e indirección para una funcionalidad pequeña; riesgo
  de sobre-ingeniería si no se disciplina el equipo.

### 3. Monolito modular (módulos por dominio)

Un único desplegable dividido en módulos verticales
(`publicaciones/`, `emparejamiento/`, `notificaciones/`), cada uno con su
propio routes/service/model interno.

- **A favor:** mejor cohesión que capas puras al agrupar por dominio; rápido
  de montar.
- **En contra:** sin puertos explícitos, nada impide que un módulo importe
  directo el cliente de base de datos de otro; el aislamiento depende de la
  disciplina del equipo y no de la estructura.

## Alternativas consideradas — Backend

### 1. NestJS

Framework de Node.js sobre TypeScript, con arquitectura modular basada en
inyección de dependencias (módulos, controladores, providers).

- **A favor:** el equipo ya tiene experiencia en Node.js/Express, así que la
  curva de aprendizaje se reduce a las convenciones de Nest, no a un
  lenguaje nuevo. Su sistema de inyección de dependencias es una
  implementación natural del patrón puertos y adaptadores: un puerto de
  dominio se declara como interfaz/token inyectable, y el adaptador concreto
  (memoria, base de datos) se registra como provider, sin que el dominio
  dependa del framework.
- **En contra:** más convenciones ("magia" de decoradores y módulos) que
  Express plano; exige disciplina para que el dominio no termine importando
  decoradores de Nest directamente.

### 2. FastAPI

Framework de Python, con validación vía Pydantic y documentación OpenAPI
automática.

- **A favor:** documentación automática de la API, tipado con Pydantic, buen
  rendimiento en I/O asíncrono.
- **En contra:** obliga a construir todo el dominio y los casos de uso en
  Python, sin que el equipo tenga experiencia previa fuerte en ese
  ecosistema, duplicando el riesgo de aprendizaje.

## Alternativas consideradas — Frontend

### 1. Flutter

Framework de UI multiplataforma (Dart) para móvil, web y escritorio desde un
solo código base.

- **A favor:** un integrante del equipo ya tiene experiencia previa con
  Flutter. El dominio de Recobra ocurre naturalmente desde el celular del
  usuario, en el sitio donde perdió o encontró el objeto; notificaciones
  push (S3) y acceso a cámara para adjuntar una foto son de primera clase en
  móvil. Flutter también compila a web, sin cerrar esa puerta.
- **En contra:** agrega un lenguaje (Dart) que no comparte con el backend en
  TypeScript.

### 2. NextJS

Framework de React para aplicaciones web, con renderizado híbrido.

- **A favor:** mismo lenguaje (TypeScript) en frontend y backend; ecosistema
  grande; despliegue web sencillo.
- **En contra:** el equipo no tiene experiencia previa con NextJS, y el caso
  de uso principal (reportar en el sitio, adjuntar foto, recibir una
  notificación de coincidencia) se resuelve de forma más directa en un
  cliente móvil nativo que en una aplicación web, donde cámara y push
  requieren más fricción (permisos del navegador, Service Workers).

## Decisión

Se adopta **arquitectura hexagonal (puertos y adaptadores)**, implementada
en **NestJS** para el backend y **Flutter** para el frontend.

Razón de arquitectura: de los tres estilos, la hexagonal es la única que
aísla estructuralmente -no solo por convención- el dominio de
emparejamiento/notificación de los fallos de infraestructura, que es
exactamente el riesgo que compromete la disponibilidad priorizada desde S1.

Razón de backend: NestJS permite construir el dominio y los casos de uso
(`domain/`, `application/`) sin dependencias de framework, y su inyección de
dependencias materializa el patrón de puertos y adaptadores de forma nativa,
aprovechando la experiencia previa del equipo en Node.js.

Razón de frontend: Flutter aprovecha experiencia previa real del equipo y
encaja mejor con la naturaleza móvil del dominio (reportar en el sitio,
adjuntar foto, recibir notificaciones), que son justamente los escenarios ya
priorizados (S3 y la usabilidad del flujo de emparejamiento).

## Consecuencias

**Positivas**

- El dominio (`domain/`) se puede probar sin base de datos ni servidor HTTP
  real, dando pruebas rápidas y estables.
- Sustituir el motor de persistencia o el proveedor de notificaciones se
  reduce a escribir un nuevo adaptador que implemente el puerto existente.
- El equipo aprovecha experiencia previa real en ambos frameworks elegidos,
  reduciendo el riesgo de que el proyecto se vuelva "aprender el framework"
  en vez de resolver el problema de negocio.

**Negativas / riesgos asumidos**

- El equipo debe alinear criterio sobre qué va en `domain/` vs
  `application/` vs `infrastructure/`; se mitiga con revisión cruzada en
  cada PR.
- Se mantienen dos lenguajes (TypeScript en backend, Dart en frontend) en
  vez de uno solo.
- Si el alcance del proyecto se reduce drásticamente, el estilo hexagonal
  quedaría sobredimensionado; se revisará esta decisión si un corte
  posterior reduce alcance.

## Referencias

- `docs/arc42/04-estrategia-solucion.md` - estrategia de solución y
  principios de diseño derivados.
- [ADR-0003](0003-reto-corte1-stack-obligatorio.md) - reto de corte 1.
- [docs/medicion-corte1.md](../medicion-corte1.md) - línea base y resultado.
- Escenarios S4/S4a (disponibilidad), S2 (seguridad) y S5 (mantenibilidad)
  en `docs/escenarios_calidad.md`.
