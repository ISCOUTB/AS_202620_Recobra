# Restricciones justificadas — Recobra

Las restricciones representan condiciones que deben cumplirse durante el desarrollo del proyecto y que limitan las decisiones de arquitectura. Se separan de los requisitos funcionales porque no describen directamente una función que el sistema deba realizar, sino una condición sobre cómo esa función debe implementarse. Por ejemplo: "el usuario puede publicar un objeto" es una funcionalidad, mientras que "la publicación debe quedar asociada al usuario que la realizó" es una restricción.

Cada restricción se vincula abajo con el escenario de `escenarios_calidad.md` que la hace verificable — esta trazabilidad es lo que justifica la restricción, no solo la enuncia.

## 1. Restricciones técnicas

| Restricción | Justificación | Escenario que la verifica |
|---|---|---|
| El sistema debe usar las tecnologías definidas por el equipo, con arquitectura suficientemente sencilla para implementarse, probarse y mantenerse durante el semestre | Limita la complejidad técnica al tiempo y capacidad real del equipo académico | S5 — Mantenibilidad |
| El acceso a publicaciones y reclamaciones debe estar asociado a usuarios identificados | Necesario para mantener trazabilidad sobre las acciones realizadas | S2 — Seguridad en una reclamación, S6 — Trazabilidad |
| Las publicaciones y sus cambios deben almacenarse de forma persistente, no solo en el cliente | Sin persistencia no hay búsqueda confiable ni continuidad del servicio | S1 — Búsqueda, S4 — Disponibilidad |
| La solución debe permitir aumentar progresivamente usuarios y publicaciones sin reconstruir el sistema | Evita decisiones de arquitectura que bloqueen el crecimiento futuro | S7 — Escalabilidad |

## 2. Restricciones organizativas

| Restricción | Justificación | Escenario que la verifica |
|---|---|---|
| El proyecto se desarrolla dentro del alcance de la asignatura; las funcionalidades se priorizan según tiempo y recursos disponibles | Obliga a decidir qué escenarios son prioritarios en vez de intentar cubrir todo | Árbol de utilidad (`arbol_utilidad.md`), prioriza S2 y S1 |
| La solución debe poder ser mantenida por el equipo del proyecto; no se introducen tecnologías o arquitecturas excesivamente complejas sin beneficio claro | El equipo es el mismo que debe operar y corregir el sistema durante el semestre | S5 — Mantenibilidad |
| La plataforma está orientada inicialmente a un espacio delimitado (ej. campus universitario); la ubicación se mantiene dentro de ese contexto | Acota el alcance geográfico y de datos que debe manejar el sistema | `ficha-problema.md` (contexto), alcance del C4 |

## 3. Restricciones legales y de privacidad

| Restricción | Justificación | Escenario que la verifica |
|---|---|---|
| Los datos personales usados para identificar usuarios deben manejarse adecuadamente y solo para las funciones necesarias | Protege a los usuarios de un uso indebido de su información personal | S2 — Seguridad en una reclamación |
| La plataforma debe verificar que una persona realmente puede ser propietaria de un objeto antes de marcarlo como reclamado | Reduce el riesgo de reclamaciones falsas o fraude, prioridad número 1 del proyecto | S2 — Seguridad en una reclamación |
| Las acciones importantes sobre una publicación deben poder asociarse con el usuario que las realizó | Permite investigar reclamaciones incorrectas o intentos de fraude | S6 — Trazabilidad del ciclo de vida |

## Resumen

Ninguna restricción queda "suelta": las técnicas garantizan que el sistema funcione y escale, las organizativas garantizan que el equipo pueda construirlo y mantenerlo dentro del semestre, y las legales/privacidad garantizan que el manejo de reclamaciones sea confiable — que es precisamente la prioridad más alta identificada en el árbol de utilidad.
