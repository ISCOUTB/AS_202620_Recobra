# Uso de IA en el proyecto Recobra

Este documento registra los usos reales de herramientas de IA durante el
desarrollo del proyecto, tal como lo pide la evidencia S1/S2.

> Si algún integrante no ha usado IA todavía, decláralo explícitamente en su
> fila (`No he usado IA en esta evidencia`) en vez de dejar la fila vacía.

| Fecha | Integrante | Herramienta | Qué se le pidió | Qué se usó del resultado / qué se descartó |
|---|---|---|---|---|
| 2026-08-23 | Equipo | Claude / ChatGPT  | Ej: comparar arquitectura en capas, hexagonal y monolito modular para el backend de Recobra | Ej: se usó la matriz comparativa como base y se ajustaron los pesos según nuestras restricciones reales; se descartó la recomendación de microservicios por sobredimensionada |


## Criterio del equipo sobre el uso de IA

- La IA se usa para acelerar borradores de documentación (arc42, ADR) y para
  discutir alternativas, no para generar la decisión final sin revisión del
  equipo.
- Toda salida generada con IA se revisa y se ajusta contra las restricciones
  reales del proyecto (S1: técnicas, organizativas, legales) antes de
  incorporarse al repositorio.
- El código de lógica de negocio (a partir de la semana 4) se escribe y se
  entiende por el equipo; el uso de IA en esa etapa también se registrará
  aquí.
- Para el primer corte vertical (crear/consultar publicación), la IA generó
  una propuesta completa de entidad, puerto, caso de uso, adaptador y
  pruebas; el equipo la valida verificando que las pruebas pasen (`npm
  test`) y que la estructura respete los límites de capas definidos en
  ADR-0001 antes de darla por aceptada.

## Registro de Uso de IA - [Fernando Isacc Conde Herrera]

### 1. Nivel de Uso
* *Frecuencia:* Uso puntual como herramienta de apoyo conceptual y consulta.
* *Herramientas empleadas:* Gemini / Claude (muy baja frecuencia de uso).

### 2. Casos de Uso Específicos
* *Clarificación de requisitos arquitectónicos:* Consultas relativas a los componentes del estándar y los criterios de aceptación para el corte vertical.
* *Revisión y validación de código:* Análisis de fragmentos de código en JavaScript (Node.js) para entender el flujo de datos entre la interfaz y la lógica del corte vertical.
* *Estructuración de entregables:* Guía en la organización de la documentación del proyecto y verificación de la lista de chequeo de la entrega.

### 3. Declaración de Autonomía
* El código final y la documentación enviada fueron revisados, comprendidos y validados manualmente antes de su integración al repositorio.