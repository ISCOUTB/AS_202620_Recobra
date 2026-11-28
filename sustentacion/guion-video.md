# Recobra · Guion del video de arquitectura (máximo 10 minutos)

Lo graban los cuatro compartiendo la presentación
[Recobra · Arquitectura e implementación](https://claude.ai/artifact/N6ZACkF1KXateznvcrpi2u). Cada quien
lee su parte mientras se ve su diapositiva. Son unas 990 palabras: leídas con calma, unos 7 minutos; con
pausas y cambios de diapositiva, cerca de 8,5.

| Quién | Diapositivas |
|---|---|
| Camilo | 1, 2 y 12 |
| Fernando | 3, 4 y 5 |
| Miguel | 6, 7 y 11 |
| Verónica | 8, 9 y 10 |

**Para grabar:** una sola persona comparte la pantalla en modo presentación y avanza; cada uno abre el
micrófono en su turno, con una pausa de un segundo al cambiar de persona. Si se pasan de 10 minutos,
recorten frases dentro de las diapositivas 4 y 11, no diapositivas enteras.

---

### 1 · Recobra — Camilo

Hola. Somos Camilo, Fernando, Miguel y Verónica, y este es Recobra, el sistema de objetos perdidos y encontrados de la UTB. En estos diez minutos no vamos a recorrer pantallas: vamos a explicar la arquitectura. Qué necesitaba el proyecto, qué decidimos, qué descartamos y cómo lo comprobamos.

### 2 · Cuatro rasgos de Recobra mandan — Camilo

Antes de cualquier tecnología, definimos qué necesita Recobra. Primero, la confianza: entregar un objeto a quien no es su dueño destruye la plataforma, por eso S2 es la prioridad uno. Segundo, es un campus de unos siete mil estudiantes que buscan desde el celular, con picos de doscientas personas a la vez: de ahí S1, buscar en menos de cuatrocientos milisegundos. Tercero, publicar es crítico y avisar puede esperar. Y cuarto, es un proyecto de curso: cero pesos y cuatro personas. Cada decisión que sigue sale de uno de estos rasgos.

### 3 · Hexagonal, desplegada como un solo proceso — Fernando

Para el estilo comparamos tres opciones con una matriz ponderada. Capas sacó dos coma siete, porque un fallo de la base sube hasta el negocio. Monolito modular, tres coma cinco: separa los módulos solo por disciplina. Hexagonal, cuatro coma uno, porque aísla el negocio por estructura, con puertos y adaptadores. Lo desplegamos como un solo proceso NestJS, con un módulo por contexto. No hay microservicios: ningún escenario pedía distribuir, y el ADR doce deja escrito qué dato nos haría separar Emparejamiento.

### 4 · Una app, una API, una base — Fernando

En el nivel dos de C4 hay tres contenedores. La app Flutter, única interfaz, igual en el navegador y en el celular. La API en NestJS, con un contrato OpenAPI versionado y un bus de eventos dentro del proceso. Y PostgreSQL, con nueve tablas de un solo dueño cada una. Todo corre en Dokploy, en el servidor del laboratorio, con TLS. Tan importante es lo que no hay: ni broker, ni Redis, ni motor de búsqueda. Ningún escenario los pedía.

### 5 · Las reglas en el centro; la tecnología, afuera — Fernando

Dentro de la API hay tres capas. En el centro, el dominio: publicación, reclamación y el cálculo de parecido, sin NestJS ni SQL. Alrededor, los casos de uso, que solo conocen diez puertos: nueve repositorios y el hash de contraseñas. Afuera, los adaptadores: HTTP, y cada repositorio en PostgreSQL y en memoria para las pruebas. El código va en un módulo por contexto. Y la regla no es una promesa: una prueba del CI falla si una capa importa lo que no debe; el día que la pusimos encontró un error real.

### 6 · PostgreSQL: la consistencia la da el motor — Miguel

PostgreSQL lo elegimos por S2. Si dos personas dicen «es mío» a la vez, solo una puede ser aprobada, y el motor lo garantiza en una sentencia condicional; un reintento tampoco duplica. Como es la decisión más cara de revertir, el respaldo se restaura y se compara en cada push. Y la retroalimentación nos hizo medir con un catálogo real: con cien mil publicaciones, la búsqueda filtrada tardaba dos mil setecientos milisegundos. Con índices por categoría y lugar, el ADR treinta y cuatro, bajó a cien.

### 7 · Una medición decidió dónde corre — Miguel

Dónde corre Recobra también lo decidió una medición. En Render gratis la búsqueda daba mil ciento trece milisegundos con apenas veinte conexiones, y el plan se dormía. Pagar rompía el presupuesto. En Dokploy, con la base en la misma red, bajó a ciento cincuenta y siete con doscientas conexiones, y con el mismo Dockerfile. Además, por la retroalimentación final, producción ya no arranca sin base de datos: antes caía en silencio a memoria y podía perder reclamaciones. El CI lo comprueba sobre la imagen real.

### 8 · Es mío: se demuestra, no se declara — Verónica

Para S2 descartamos la pregunta secreta, porque quien encontró el objeto no sabe qué preguntar, y el código al correo, porque prueba que el correo es tuyo, no el objeto. Elegimos que quien reclama describa un detalle que solo el dueño sabría y que lo apruebe quien tiene el objeto. Los correos se ven solo después de aprobar. Usamos sesiones opacas y no JWT, porque en un computador de sala cerrar sesión tiene que cortar el acceso ya. Y sin aprobación no hay Entregado.

### 9 · Publicar responde ya; avisar puede esperar — Verónica

Entre contextos, la pregunta fue cómo avisar sin que publicar dependa del aviso. Una llamada síncrona lo acoplaba y rompía S4a; un broker era otro servicio para una sola instancia. Elegimos eventos dentro del proceso con red de seguridad: tres reintentos, una cola de fallidos en PostgreSQL y una conciliación cada cinco minutos. El id del aviso sale del dato, así que no se duplica. Y declaramos el límite: si el proceso cae con un evento en vuelo, se recupera minutos después.

### 10 · Una sola app, y su primera carga medida — Verónica

La interfaz pasó de dos a una. La vitrina HTML y la app Flutter se habían separado, y la vitrina tapaba los errores de ruta. Hoy hay una sola app que se adapta al ancho. El costo era la primera carga, y la medimos: diez coma seis megas sin comprimir. Comprimimos solo la app, no la API, que mezcla el token con datos del usuario, y bajó a tres coma nueve. El ADR treinta y dos deja el umbral: si pasa de cinco megas, se reabre la decisión.

### 11 · Lo medido, lo probado y lo que no — Miguel

Así se verifica. S1 cumple: cien milisegundos con cien mil publicaciones, y doscientos tres en producción. S2 cumple por diseño y por prueba. S3 y la recuperación de S4b están probados en el CI, pero no medidos en producción, y lo decimos. S7 en horizontal hoy no se cumple, porque varias cosas viven en la memoria del proceso. En cada push corren más de cuatrocientas pruebas, las reglas hexagonales, la documentación, la seguridad y el Quality Gate.

### 12 · Cada cambio, por un dato — Camilo

Para cerrar: treinta y cuatro decisiones escritas, ninguna borrada; cuando una cambia, otra la reemplaza. Cambiamos de Express a NestJS por el curso, de Render a Dokploy por una medición y de dos interfaces a una. Después de la sustentación recibimos once recomendaciones: aceptamos ocho con su commit y su prueba, escribimos tres ADR nuevos y aplazamos dos con motivo y responsable. La lección del jurado: una decisión se defiende desde lo que el proyecto necesita, y se mide con datos reales. Gracias.
