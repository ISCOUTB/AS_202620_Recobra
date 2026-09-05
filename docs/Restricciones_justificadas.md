# Restricciones justificadas — Recobra
 
Las restricciones son condiciones que limitan cómo construimos el sistema, no funciones que el sistema deba cumplir. Por ejemplo: "el usuario puede publicar un objeto" es una funcionalidad; "la publicación debe quedar asociada al usuario que la realizó" es una restricción. Cada restricción que listamos abajo va acompañada del escenario que permite comprobarla, para que no se quede como una declaración de buenas intenciones.
 
## Restricciones técnicas
 
| Restricción | Por qué | Escenario que la verifica |
|---|---|---|
| El backend debe construirse en NestJS o FastAPI, y el frontend en Flutter o NextJS (restricción de stack del curso) | Espacio tecnológico cerrado por la asignatura; fuera de él la entrega no es válida | S5 — Mantenibilidad; ver ADR-0002 y ADR-0003 |
| Usar las tecnologías elegidas dentro de ese espacio, con una arquitectura lo bastante simple para implementarse, probarse y mantenerse durante el semestre | El equipo tiene tiempo y capacidad limitados | S5 — Mantenibilidad |

| El acceso a publicaciones y reclamaciones debe estar asociado a usuarios identificados | Sin esto no hay forma de mantener trazabilidad sobre lo que pasa | S2 — Seguridad en una reclamación, S6 — Trazabilidad |
| Las publicaciones y sus cambios deben guardarse de forma persistente, no solo en el cliente | Sin persistencia no hay búsqueda confiable ni continuidad del servicio | S1 — Búsqueda, S4 — Disponibilidad |
| La solución debe permitir crecer en usuarios y publicaciones sin reconstruir el sistema | Evita decisiones que después bloqueen el crecimiento | S7 — Escalabilidad |
 
## Restricciones organizativas
 
| Restricción | Por qué | Escenario que la verifica |
|---|---|---|
| El proyecto se mantiene dentro del alcance de la asignatura; se prioriza según tiempo y recursos disponibles | Nos obliga a decidir qué escenarios van primero en vez de intentar cubrir todo | Árbol de utilidad (`arbol_utilidad.md`), prioriza S2 y S1 |
| La solución debe poder ser mantenida por el mismo equipo del proyecto; no se meten tecnologías más complejas de lo necesario | Somos nosotros quienes vamos a operar y corregir el sistema durante el semestre | S5 — Mantenibilidad |
| La plataforma está pensada, al menos por ahora, para un espacio delimitado como un campus universitario | Acota el alcance geográfico y de datos que el sistema tiene que manejar | `ficha-problema.md`, alcance definido en el C4 |
 
## Restricciones legales y de privacidad
 
| Restricción | Por qué | Escenario que la verifica |
|---|---|---|
| Los datos personales usados para identificar usuarios se manejan solo para las funciones necesarias | Protege a los usuarios de un uso indebido de su información | S2 — Seguridad en una reclamación |
| La plataforma debe verificar que alguien realmente puede ser dueño de un objeto antes de marcarlo como reclamado | Reduce el riesgo de reclamaciones falsas, que es la prioridad número uno del proyecto | S2 — Seguridad en una reclamación |
| Las acciones importantes sobre una publicación deben poder asociarse con el usuario que las hizo | Permite investigar reclamaciones incorrectas o intentos de fraude | S6 — Trazabilidad del ciclo de vida |
 
Ninguna de estas restricciones queda suelta: las técnicas garantizan que el sistema funcione y pueda crecer, las organizativas garantizan que nosotros mismos podamos construirlo y mantenerlo en el semestre, y las legales garantizan que el manejo de reclamaciones sea confiable, que es justamente lo que priorizamos más alto en el árbol de utilidad.
