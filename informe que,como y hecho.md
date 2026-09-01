# Funcionalidades del proyecto y estado del corte vertical

**Proyecto:** Recobra (AS_202620_Recobra)

## Introducción

Recobra es una plataforma pensada para publicar y encontrar objetos perdidos dentro de un espacio delimitado, como un campus universitario, una empresa o un edificio de apartamentos. La idea central es conectar de forma rápida a la persona que perdió algo con la persona que lo encontró.

Este informe muestra todo lo que el proyecto planea ofrecer según su documentación, y lo compara con lo que ya está realmente construido en el primer corte vertical, revisando directamente el código y los documentos del repositorio.

## El problema que busca resolver

Hoy en día no existe un canal centralizado, buscable y con notificaciones que conecte de manera eficiente a quien pierde un objeto con quien lo encuentra. Esto trae varios problemas:

* Objetos que nunca son reclamados porque nadie sabe que fueron encontrados.
* Tiempo perdido preguntando en distintos grupos o canales no oficiales.
* Falta de trazabilidad sobre quién encontró qué objeto y en qué momento.
* Riesgo de fraude, ya que no hay ningún mecanismo que verifique que quien reclama un objeto realmente es su dueño.

## Cómo está organizada la arquitectura

El proyecto sigue una arquitectura hexagonal, también conocida como puertos y adaptadores, tal como se define en el ADR 0001 sobre el estilo arquitectónico. Esta forma de organizar el código separa el negocio de los detalles técnicos, y se estructura así:

* **domain**: contiene las entidades y los contratos del negocio, sin depender de nada externo.
* **application**: contiene los casos de uso que orquestan la lógica del dominio.
* **infrastructure**: contiene los adaptadores concretos, como el servidor HTTP y la persistencia de datos.
* **server.js**: es el punto de entrada de toda la aplicación.

## Todas las funcionalidades planeadas

Estas son las ocho funcionalidades o atributos de calidad que aparecen definidos en la documentación del proyecto, ya sea en los objetivos del README, en el aspecto de seguridad o en los escenarios de calidad del S1 al S7.

| # | Funcionalidad | De dónde sale |
|---|---|---|
| 1 | Publicación centralizada y buscable de objetos | Objetivo 1 del README |
| 2 | Emparejamiento entre publicaciones de perdido y encontrado | Objetivo 2 del README |
| 3 | Notificaciones cuando hay una coincidencia probable | Objetivo 3 del README y escenario S3 |
| 4 | Trazabilidad del ciclo de vida de un objeto | Objetivo 4 del README y escenario S6 |
| 5 | Búsqueda con filtros, con tiempos de respuesta menores a 400 ms | Escenario de calidad S1 |
| 6 | Reclamación verificada, validando la identidad de quien reclama | Aspecto de seguridad y escenario S2 |
| 7 | Alta disponibilidad, con al menos 99% de tiempo activo al mes | Escenarios S4, S4a y S4b |
| 8 | Escalabilidad para soportar hasta cinco veces más usuarios | Escenario S7 |

## Qué tanto de esto ya está hecho en el corte vertical

El primer corte vertical de negocio que se implementó cubre, por ahora, solamente la parte de crear y consultar una publicación. Este flujo sí atraviesa las tres capas de la arquitectura hexagonal, desde el HTTP hasta el dominio, pasando por el caso de uso, y guarda los datos a través del puerto de repositorio de publicaciones.

| # | Funcionalidad | Estado | Qué significa |
|---|---|---|---|
| 1 | Publicación centralizada y buscable | Parcial | Ya se puede crear una publicación y consultarla por su id. Todavía falta la parte de búsqueda con filtros. |
| 2 | Emparejamiento | No implementado | Todavía no hay ninguna lógica que compare publicaciones entre sí. |
| 3 | Notificaciones de coincidencia | No implementado | Aún no existe un módulo de notificaciones. |
| 4 | Trazabilidad del ciclo de vida | Parcial | Cada publicación se crea con el estado publicado, pero todavía no hay transiciones entre estados ni historial de cambios. |
| 5 | Búsqueda con filtros | No implementado | No existe todavía un endpoint para buscar ni filtrar publicaciones. |
| 6 | Reclamación verificada | No implementado | No hay endpoint ni lógica para verificar la identidad de quien reclama un objeto. |
| 7 | Alta disponibilidad y continuidad | No implementado | Solo existe un endpoint de salud básico, sin mecanismos de resiliencia todavía. |
| 8 | Escalabilidad | No implementado | La persistencia actual es en memoria. Se tiene previsto pasar a PostgreSQL más adelante. |

## Lo que sí funciona hoy en el código

* Un endpoint de salud (**GET /health**) que confirma que el servidor está activo.
* Un endpoint para crear publicaciones (**POST /publicaciones**), que exige tipo, descripción, categoría y ubicación, y valida que el tipo sea perdido o encontrado. Responde con éxito o con un error si los datos no son válidos.
* Un endpoint para consultar una publicación por su id (**GET /publicaciones/:id**), que responde correctamente si existe o con un error si no la encuentra.
* Una entidad Publicación con sus reglas básicas de validación.
* Persistencia en memoria, que ya es un adaptador real y no una simulación, pensado para reemplazarse por PostgreSQL sin tener que tocar las capas de dominio ni de aplicación.
* Una página de demostración sencilla para probar el flujo sin necesidad de herramientas como Postman. Esta página es solo una vitrina y no forma parte del corte vertical en sí.
* Nueve pruebas automatizadas que están pasando sin errores.

## En resumen

El proyecto tiene muy bien pensadas sus ocho funcionalidades principales, con objetivos claros y escenarios de calidad medibles. Sin embargo, lo que realmente está construido hasta ahora es solo una parte de la primera funcionalidad, la de crear y consultar publicaciones, y se está sentando la base para la cuarta, la de trazabilidad, gracias al estado inicial con el que nace cada publicación.

Todo lo demás, como el emparejamiento, las notificaciones, la búsqueda con filtros, la reclamación verificada, la disponibilidad y la escalabilidad, todavía no tiene código, pero ya está bien definido y listo para guiar los próximos avances del proyecto.
