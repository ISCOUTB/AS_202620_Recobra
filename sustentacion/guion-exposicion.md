# Recobra · Guion de la exposición

16 diapositivas · unos 12 minutos · cada quien defiende sus decisiones.

| Quién | Diapositivas | Tiempo aprox. |
|---|---|---|
| Camilo | 1, 2, 3, 15, 16 (demo) | 4 min |
| Fernando | 4, 5, 7, 13 | 3 min |
| Miguel | 6, 8, 9, 12 | 3 min |
| Verónica | 10, 11, 14 | 2 min |

Si van justos de tiempo, recorten la 13 y la 14.

---

### 1 · Portada — Camilo
"Buenos días. Somos el equipo de Recobra, una app para encontrar objetos perdidos en la universidad. Hoy no les vamos a mostrar pantallas: les vamos a contar por qué la construimos así."

### 2 · El proyecto — Camilo
"Hoy, si pierdes algo en la UTB, lo buscas en grupos de WhatsApp o en carteleras. El mensaje se pierde, cualquiera puede decir que algo es suyo, y tu número queda a la vista de todos.

Recobra lo pone todo en un solo lugar: publicas lo que perdiste o encontraste en menos de un minuto, cualquiera puede buscar sin crear cuenta, la app te avisa si aparece algo parecido, y para entregar un objeto hay que demostrar que es tuyo.

Elegimos este problema porque es real, pasa todos los días y es lo bastante pequeño para hacerlo bien."

### 3 · Qué tiene que hacer bien — Camilo
"Antes de programar definimos qué era lo más importante. Primero: que nadie se lleve un objeto que no es suyo. Segundo: que buscar sea rápido. Tercero: que el aviso llegue pronto. Todo lo que verán después responde a esta lista."

### 4 · Cómo está organizado — Fernando
"Comparamos tres formas de organizar el sistema y les pusimos nota. Ganó la llamada hexagonal.

La idea es sencilla: las reglas de Recobra, como 'no se entrega sin prueba', están en el centro y no dependen de la base de datos ni del servidor. Es como un aparato con enchufe estándar: puedes cambiar el tomacorriente sin cambiar el aparato.

Y todo funciona como un solo programa, no como muchos servicios separados, porque para una universidad no hacía falta más."

### 5 · Las piezas — Fernando
"El sistema tiene tres piezas: la app que usa el estudiante, el servidor que tiene las reglas y la base de datos que guarda todo. Lo importante es lo que no tiene: no agregamos piezas que nadie necesitaba, porque cada pieza extra es algo más que se puede dañar."

### 6 · Tecnologías — Miguel
"Cada herramienta tiene su porqué:
- NestJS para el servidor, porque lo pedía el curso y encaja con nuestra forma de organizar el código.
- Flutter para la app, porque con un solo código funciona en computador y en celular.
- PostgreSQL para los datos, porque garantiza que dos personas no puedan reclamar el mismo objeto a la vez.
- Y para publicar la app, el servidor del laboratorio, que es gratis y rápido.

Lo que no usamos fue a propósito: nada que no resolviera un problema real."

### 7 · Lo comprobamos — Fernando
"Esta forma de organizar no fue solo un dibujo: cambiamos dónde se guardan los datos y la herramienta del servidor sin tocar las reglas de Recobra. Además, una prueba automática revisa que nadie rompa esa separación; el día que la pusimos, encontró un error real."

### 8 · Dónde está publicada — Miguel
"Al principio usamos un servicio gratuito en internet. Lo medimos y la búsqueda tardaba más de un segundo, cuando la meta era menos de medio segundo. Además se 'dormía' si nadie la usaba. Nos pasamos al servidor del laboratorio, también gratis, y la búsqueda bajó a 0,16 segundos."

### 9 · La base de datos — Miguel
"Elegimos PostgreSQL por un caso concreto: si dos personas dicen 'es mío' al mismo tiempo, solo una puede ser aprobada. PostgreSQL lo garantiza. Como es lo más difícil de cambiar después, hacemos copias de seguridad y comprobamos que se puedan restaurar."

### 10 · Reclamar un objeto — Verónica
"Para reclamar, la persona escribe un detalle que solo el dueño sabría, por ejemplo 'la funda tiene un sticker'. Quien encontró el objeto lo revisa y aprueba o rechaza. Solo después de aprobar se ven los correos para coordinar la entrega. Así nadie se lleva lo que no es suyo."

### 11 · Los avisos — Verónica
"Cuando alguien publica algo parecido a lo que perdiste, te llega un aviso. Pero si el aviso falla, la publicación no se cae: el sistema lo reintenta, y cada cinco minutos revisa si quedó algún aviso pendiente."

### 12 · Qué cumplimos y qué no — Miguel
"Somos honestos: la búsqueda rápida y la entrega segura se cumplen y están medidas. El aviso funciona, pero no lo hemos medido completo en producción. Y si los usuarios se multiplicaran por cinco, habría que hacer cambios. Preferimos decirlo nosotros."

### 13 · Cuando algo sale mal — Fernando
"Si la base de datos se cae, la app no se queda colgada: avisa claramente que hay un problema. Si alguien toca 'publicar' dos veces, no se duplica. Y en seguridad revisamos 26 riesgos posibles: la mayoría están resueltos y los pendientes están anotados."

### 14 · Cómo fue cambiando — Verónica
"Tomamos 31 decisiones y todas están escritas, con lo que descartamos. Cuando una cambió, no la borramos: escribimos una nueva explicando por qué. Así cualquiera puede ver la historia del proyecto."

### 15 · Lo que falta — Camilo
"Lo que todavía no hacemos: funciona en un solo servidor, los avisos se pueden atrasar unos minutos si el servidor se reinicia, y falta medir cuánto tarda en recuperarse de una caída. Cada pendiente tiene escrito qué haríamos."

### 16 · Demostración — Camilo y quien maneje la segunda cuenta
"Ahora en vivo:
1. Buscamos un objeto sin iniciar sesión, en computador y en celular.
2. Una cuenta publica 'Perdí unos audífonos' y otra 'Encontré unos audífonos', y aparece el aviso.
3. Reclamamos con una prueba, la otra cuenta la aprueba y solo ahí se ven los correos.

Cerramos así: cada parte de Recobra existe porque resolvía un problema real, y la cambiamos cuando una medición nos dijo que había que hacerlo. Gracias, ¿preguntas?"
