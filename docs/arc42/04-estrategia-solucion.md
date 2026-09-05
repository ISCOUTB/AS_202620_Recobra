# 4. Estrategia de solución

## 4.1 Contexto y restricciones que condicionan la decisión

La elección del estilo arquitectónico de Recobra parte de tres insumos ya
producidos en S1/S2 y no de una preferencia estética:

- **Atributo de calidad prioritario:** disponibilidad (definido en S1 como el
  primero de la lista), seguido de seguridad (escenario S2) y usabilidad del
  flujo de emparejamiento.
- **Restricciones organizativas:** equipo de 4 personas, sin experiencia previa
  en el dominio de arquitectura hexagonal como tal, con calendario de curso
  fijo (Corte 1 en la semana 4).
- **Restricciones técnicas ya adoptadas:** stack obligatorio del curso
  (NestJS|FastAPI + Flutter|NextJS). Decisión del equipo: NestJS + Flutter,
  con PostgreSQL como persistencia objetivo. Ver ADR-0002 y ADR-0003.


De aquí se deriva el criterio de selección: el estilo debe (a) permitir probar
las reglas de emparejamiento y notificación sin levantar base de datos ni HTTP
real (soporta disponibilidad y facilita pruebas automatizadas), y (b) mantener
una curva de aprendizaje razonable para un equipo junior en un semestre.

## 4.2 Matriz comparativa de estilos arquitectónicos

Se evaluaron tres estilos candidatos: **arquitectura en capas** (layered),
**arquitectura hexagonal** (puertos y adaptadores) y **monolito modular**
(módulos por dominio dentro de un único desplegable, sin capas transversales
obligatorias). Escala de 1 (bajo) a 5 (alto) para cada criterio; el peso
refleja la prioridad del proyecto según los atributos de calidad de S2.

| Criterio (peso) | Capas | Hexagonal | Monolito modular |
|---|---|---|---|
| Testabilidad del dominio sin infraestructura (peso 3) | 2 — las capas superiores suelen depender de las inferiores concretas | 5 — el dominio solo depende de puertos (interfaces) | 3 — depende de qué tan disciplinado sea el aislamiento por módulo |
| Aislamiento del framework/HTTP/DB (peso 3) | 2 — el acoplamiento a Nest/PG suele filtrarse hacia arriba si no hay puertos | 5 — adaptadores son intercambiables sin tocar el dominio | 3 — aislado por módulo, pero no hay frontera formal de puertos |

| Curva de aprendizaje para el equipo (peso 2) | 5 — es el estilo que ya conocen de otros cursos | 2 — requiere entender puertos/adaptadores e inversión de dependencias | 4 — es capas + separación por carpetas de dominio, más intuitivo |
| Velocidad para llegar al Corte 1 con esqueleto ejecutable (peso 2) | 4 — rápido de montar | 3 — requiere definir puertos desde el inicio | 4 — rápido, cercano a lo que ya tenían |
| Soporte a disponibilidad (aislar fallos de notificación/DB) (peso 3) | 2 — un fallo en la capa de datos tiende a propagarse | 5 — el puerto de notificación puede fallar/mockearse sin tumbar el caso de uso | 3 — se puede lograr, pero no es el foco del estilo |
| Facilidad de mantenimiento a mediano plazo (semanas 5-16) (peso 2) | 3 | 4 | 4 |
| **Total ponderado** | **2.7** | **4.1** | **3.5** |

Cálculo: `(criterio × peso)` sumado y dividido entre la suma de pesos (15).

## 4.3 Decisión

Se selecciona **arquitectura hexagonal (puertos y adaptadores)** para el
backend de Recobra, implementada con **NestJS** y cliente **Flutter**.
El detalle está en
[`docs/adr/0002-arquitectura-y-stack.md`](../adr/0002-arquitectura-y-stack.md)
y el marco del reto de corte 1 en
[`docs/adr/0003-reto-corte1-stack-obligatorio.md`](../adr/0003-reto-corte1-stack-obligatorio.md).
ADR-0001 queda como histórico reemplazado.

## 4.4 Principios de diseño derivados de la decisión

1. El paquete `domain/` no importa nada de `infrastructure/` ni de Nest HTTP.
   Solo define entidades y puertos.
2. `application/use-cases/` orquesta el dominio y depende únicamente de
   puertos, nunca de adaptadores concretos. `@Injectable()` es metadato de DI,
   no acoplamiento a transporte.
3. Los adaptadores viven fuera del dominio: `src/publicaciones/` (entrada HTTP
   Nest) y `src/infrastructure/persistence/` (salida de datos). Ambos son
   reemplazables sin tocar el dominio.
4. Toda prueba automatizada del dominio y de los casos de uso debe poder
   correr sin base de datos real ni servidor HTTP levantado.
5. El composition root (`src/app.module.ts` / `src/main.ts`) es el único lugar
   que conoce qué adaptador concreto implementa cada puerto.


## 4.5 Consecuencias operativas para la Semana 4

- La semana 4 empieza implementando entidades y puertos del dominio
  (publicación, emparejamiento, notificación), no montaje de proyecto.
- Cada nuevo caso de uso se prueba primero contra los puertos (con dobles de
  prueba/mocks), y solo después se conecta al adaptador real de PostgreSQL.
- Cualquier cambio de proveedor de notificaciones (correo, push, etc.) se
  resuelve agregando un adaptador nuevo, sin modificar `domain/` ni
  `application/`.
