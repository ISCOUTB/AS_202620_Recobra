# Corte vertical 1 - Crear y consultar una publicación

## Qué es y por qué este

Un corte vertical es una funcionalidad completa de punta a punta: entra por
la API, pasa por la lógica de negocio y llega a la persistencia - no una capa
entera a medias. Elegimos **crear y consultar una publicación** porque es la
base de la que dependen los demás escenarios (buscar, notificar coincidencias,
trazabilidad): sin poder publicar y leer un objeto, nada de eso tiene sentido.

## Cómo lo hicimos

1. Primero decidimos la arquitectura (hexagonal, comparada contra otras dos
   opciones en una matriz de decisión) y la dejamos por escrito en un ADR,
   **antes** de programar.
2. Montamos el esqueleto vacío pero ejecutable (servidor, `/health`,
   carpetas de dominio/aplicación/infraestructura).
3. Construimos una sola funcionalidad de punta a punta: la entidad
   `Publicación` con sus reglas de validación, el caso de uso que la crea,
   el caso de uso que la consulta, un adaptador HTTP y un adaptador de
   persistencia en memoria.
4. Escribimos pruebas en tres niveles (dominio/caso de uso, HTTP de extremo
   a extremo, smoke test) para poder demostrar que funciona, no solo que
   compila.
5. Al revisarlo, encontramos que "consultar" se saltaba la capa de
   aplicación (un atajo que rompía la misma arquitectura que definimos); lo
   corregimos para que las dos operaciones sigan el mismo camino.

## Qué entregamos

- Backend funcional en Node.js/Express con arquitectura hexagonal real: el
  dominio no depende de Express ni de una base de datos concreta.
- Dos operaciones completas: crear y consultar una publicación.
- 9 pruebas automatizadas, **9/9 en verde**.
- Una página de demostración visual para mostrar la funcionalidad sin
  herramientas externas.
