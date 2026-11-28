# Recobra · Justificación de cada decisión arquitectónica

Formato: **qué hicimos** → **por qué**. Entre paréntesis, el número de ADR.

## Estructura del sistema

- **Hexagonal en un solo desplegable, no microservicios (0001 → 0002, 0012).** Comparamos tres estilos con una matriz ponderada: capas 2,7, monolito modular 3,5 y hexagonal 4,1. Ganó hexagonal porque es la única que aísla el negocio de la infraestructura por estructura, no solo por disciplina. Y va en un solo proceso porque es para un campus (~200 usuarios al mismo tiempo), lo operan 4 personas y corre en un servidor compartido: separar en servicios agregaría puntos de falla sin mejorar ningún escenario.
- **Puertos y adaptadores (0002).** 10 puertos: 9 repositorios y el hash de contraseñas, cada repositorio con un adaptador de PostgreSQL y otro en memoria. El negocio no depende de la base ni del proveedor. Por eso pudimos cambiar de Render a Dokploy sin tocar las reglas de negocio.
- **NestJS + Flutter (0002, 0003).** El curso solo permitía NestJS o FastAPI para el backend, y Flutter o NextJS para el cliente. Elegimos NestJS porque trae módulos e inyección de dependencias, que encajan con la hexagonal, y Flutter porque con un solo código sale la app web y la de celular.
- **Una sola interfaz (0031).** Teníamos una página web aparte de la app y se veían distintas. Ahora hay una sola app que se adapta al celular y al computador: una cosa que probar y mantener.

## Plataforma y datos

- **De Render + Neon a Dokploy (0005 → 0010).** Render era gratis pero lento: la búsqueda tardaba 1.113 ms y el límite es 400. Además se "dormía" y tardaba en despertar. Dokploy es gratis y tiene la base al lado de la API: 157 ms.
- **PostgreSQL (0006, 0020).** Dos personas pueden decir "es mío" del mismo objeto. PostgreSQL permite "revisar y aprobar" en una sola operación que no se puede pisar, así nunca se aprueban dos a la vez.
- **La decisión más cara de revertir (0027).** Cambiar la base es lo más difícil de deshacer, así que hacemos un respaldo y probamos restaurarlo en cada push.
- **Fotos dentro de la base (0023).** Al borrar una publicación se borra su foto en la misma operación, y no hay que operar otro almacenamiento. El costo: el respaldo pesa más.
- **Búsqueda con filtros simples (0008).** Con el volumen del campus, PostgreSQL con índices alcanza. Un motor de búsqueda aparte sería otra pieza que operar.
- **Caché mínima, sin Redis (0025).** La búsqueda ya cumple el tiempo pedido, y un dato viejo en caché podría mostrar como disponible un objeto ya entregado.

## Comunicación entre partes

- **Llamada directa donde el usuario espera la respuesta, eventos donde no (0004).** Al publicar quieres la respuesta ya; el aviso de coincidencia puede llegar después.
- **Contrato versionado y un solo formato de error (0009).** La app y la API cambiaban al mismo tiempo; con el contrato, las pruebas detectan si una rompe a la otra.
- **Avisos por eventos, con reintentos, cola de fallidos y revisión cada 5 minutos (0015, 0024, 0026).** Si falla el aviso, publicar no se cae. Si un aviso se pierde, la revisión periódica lo recupera.
- **Sin broker (Kafka o RabbitMQ).** Con una sola instancia no hace falta; sería otra pieza que mantener.
- **Coincidencias guardadas, con parecido ponderado (0018).** Así el aviso no se repite, y "se parece en un 70 %" se puede explicar con categoría, lugar, palabras y fecha.

## Seguridad y confianza

- **Correo `@utb.edu.co` y sesiones que se pueden cortar, no JWT (0013).** En el campus se usan computadores de sala: cerrar sesión debe cortar el acceso en ese momento, y un JWT no se puede cortar antes de que venza.
- **Reclamar con una prueba que aprueba quien encontró el objeto (0014).** Es la prioridad número uno: que nadie se lleve lo que no es suyo. Quien tiene el objeto es quien mejor juzga la prueba.
- **Privacidad (0021).** Son datos de estudiantes (Ley 1581 de 2012). El correo solo se muestra después de aprobar la entrega, y los datos viejos se limpian solos.
- **Moderación mínima: reportar y ocultar (0022).** Para frenar publicaciones falsas o abusivas sin montar todo un equipo de moderación.
- **Límites de uso por cuenta y por origen (0028).** Para que nadie llene la app de basura ni pruebe contraseñas sin parar.
- **Cabeceras de seguridad, CSP y CORS (0029).** El navegador bloquea que se ejecute código ajeno o que otra página use la API.
- **Seguridad del pipeline (0030).** Cada push revisa dependencias con fallas conocidas y secretos filtrados, y las acciones del CI van fijadas para que nadie las cambie.

## Producto

- **Sin IA dentro de la app (0007).** Ningún escenario la necesitaba, y meter datos de estudiantes en un servicio externo es un riesgo de privacidad.
- **Avisos dentro de la app, sin push (0015).** Es lo más simple que cumple el escenario del aviso; el push queda para cuando se integre con la app UTB.
- **Recobra independiente de la app UTB, pero preparada para integrarse (0016).** Hoy no hay acceso al inicio de sesión de la UTB; gracias a la hexagonal se puede conectar después sin rehacer nada.
- **Ciclo de vida completo: cierre, vencimiento y entrega (0017).** Las publicaciones viejas no se quedan para siempre, y se sabe en qué terminó cada objeto.
- **"Dónde está el objeto" y "lo tengo yo" (0019).** En el campus muchos objetos se dejan en la portería; el dueño necesita saber dónde ir a buscarlo.

## Cómo decidimos

- **Un ADR aceptado no se edita, se reemplaza por otro (0011).** Así queda la historia de por qué cambiamos de opinión. Además, el CI revisa la documentación en cada push.

---

> **Frase de cierre:** cada decisión sale de un escenario de calidad pensado para un campus, con un equipo de 4 y $0, y cambió cuando una medición nos mostró que había que cambiarla.
