# ADR-0019: Dónde está el objeto y "Lo tengo yo"

## Estado

Aceptada — 2026-10-17. Responde a dos hallazgos de la evaluación del
planteamiento. Se apoya en ADR-0014 (reclamación con prueba), ADR-0015
(avisos) y ADR-0018 (parecido). Contrato 4.1.0, cambio compatible.

## Contexto

1. **No se sabía dónde estaba un objeto encontrado.** En el campus muchos se
   dejan en la portería o en una oficina; quien lo reclamaba tenía que
   preguntarlo después de la aprobación.
2. **Quien veía un perdido y tenía el objeto no podía decirlo.** Tenía que
   publicar un encontrado por su cuenta y esperar a que el emparejamiento lo
   relacionara, si es que el parecido superaba el umbral.

## Alternativas consideradas

### Para el punto 2: mostrar el correo del dueño a quien dice tenerlo (descartada)

Cualquiera podría decir "lo tengo" para conseguir el correo de alguien. Va en
contra de ADR-0014: el contacto se comparte solo cuando quien tiene el objeto
aprueba una prueba del dueño.

### Para el punto 2: un encontrado enlazado al perdido (elegida)

## Decisión

1. **Custodia** en los encontrados: `quien_lo_encontro` (por omisión) o
   `punto_de_entrega` con `puntoCustodia` (texto, por ejemplo "Portería de la
   entrada principal"). Se indica al publicar y quien lo encontró la puede
   cambiar después con `POST /publicaciones/{id}/custodia`, mientras el objeto
   no se haya entregado ni cerrado. Los perdidos no tienen custodia.
2. **"Lo tengo yo":** `POST /publicaciones/{id}/lo-tengo` sobre un perdido
   ajeno que no se ha cerrado ni entregado. Crea la publicación de encontrado
   de quien lo tiene (misma categoría que el perdido, con su descripción, lugar
   y custodia) y una coincidencia explícita entre las dos, que se guarda aunque
   el parecido quede bajo el umbral, porque una persona la señaló. El dueño
   recibe el aviso de coincidencia de siempre.
3. **La verificación no cambia:** el dueño reclama ese encontrado con su prueba
   y quien lo tiene decide (ADR-0014). Nadie ve el correo de nadie antes.
4. Una persona no puede responder "lo tengo" dos veces al mismo perdido, ni si
   ya tiene un encontrado enlazado a él; tampoco a su propia publicación.
5. **Dueño único:** "Lo tengo yo" vive en Emparejamiento (crea la coincidencia)
   y crea la publicación a través de `CrearPublicacion`, el caso de uso de
   Publicaciones; no escribe su tabla directamente.

## Consecuencias

- El reclamante ve dónde recogerlo junto al contacto, cuando lo aprueban.
- El id de la coincidencia es el mismo que usaría el emparejamiento
  automático (`encontrado__perdido`), así que si los dos la encuentran no se
  duplica ni el aviso ni la coincidencia.
- El punto de entrega es texto libre: no hay un catálogo oficial de puntos de
  custodia de la UTB. Si existiera, se ofrecería como lista, igual que los
  lugares (`GET /lugares`).

## Qué haría revisar esta decisión

- Abuso de "Lo tengo yo" para generar avisos falsos → límite por cuenta y por
  día, o reportes de abuso (moderación pendiente).
- Que la UTB centralice los objetos en una oficina → la custodia por omisión
  pasaría a ser esa oficina.
