# Uso de IA en el proyecto Recobra

Este documento registra los usos reales de herramientas de IA durante el
desarrollo del proyecto, tal como lo pide la evidencia S1/S2.

| Fecha | Integrante | Herramienta | Qué se le pidió | Qué se usó del resultado / qué se descartó |
|---|---|---|---|---|
| 2026-08-23 | Equipo | Claude / ChatGPT | Comparar arquitectura en capas, hexagonal y monolito modular para el backend de Recobra | Se usó la matriz comparativa como base y se ajustaron los pesos según restricciones reales; se descartó la recomendación de microservicios por sobredimensionada |
| 2026-09-05 | Equipo | Cursor / Claude | Replantear ADR y migrar a NestJS + Flutter ante el stack obligatorio del curso; alinear feedback del algoritmo (aspectos 8 columnas, CI, medición corte 1) | **Aceptado:** ADR-0002/0003, tabla de aspectos con 8 columnas, CI, cliente Flutter del corte, script de medición, C4 alineado a NestJS. **Corregido:** no tratar el feedback automático como nota final; la “restricción asignada” del algoritmo no existía aparte del stack. **Rechazado:** reescribir el dominio en Python/FastAPI y pasar el cliente a NextJS (mayor riesgo de aprendizaje sin beneficio para S5). |


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

## Registro de Uso de IA - [Camilo Conde]

### 1. Nivel de Uso
* *Frecuencia:* Uso frecuente como apoyo técnico durante el desarrollo del backend.
* *Herramientas empleadas:* Claude (frecuencia media-alta de uso).

### 2. Casos de Uso Específicos
* *Diseño y arquitectura:* Consultas sobre la aplicación práctica del estilo hexagonal (puertos y adaptadores) en casos de uso concretos del proyecto.
* *Generación de código base:* Apoyo en la escritura de entidades, casos de uso, adaptadores y pruebas automatizadas siguiendo la estructura ya definida en el repositorio.
* *Documentación técnica:* Ayuda para mantener actualizados el README y la documentación de arquitectura (ADR, arc42) conforme avanza el desarrollo.

### 3. Declaración de Autonomía

## Registro de Uso de IA - [Verónica Ubarne]

### 1. Nivel de Uso
* *Frecuencia:* Uso moderado como asistente para la documentación y revisión del proyecto.
* *Herramientas empleadas:* Claude (frecuencia media de uso).

### 2. Casos de Uso Específicos
* *Revisión del repositorio:* Análisis de la estructura del proyecto, archivos clave (package.json, server.js, adaptadores HTTP) y verificación del estado del corte vertical.
* *Completar documentación arc42:* Apoyo para redactar las secciones 5 (Requisitos de calidad) y 6 (Construcción y despliegue) que faltaban en el archivo `arc42.md`.
* *Estructuración de la tabla de aspectos:* Transformación del texto plano sobre seguridad en una tabla con el formato solicitado (Aspecto, Decisión, Justificación, Pruebas).
* *Verificación de entregables:* Revisión de la lista de chequeo de la entrega incremental (arc42, C4, corte vertical, tabla de aspectos) para confirmar que todo estuviera completo.
* *Organización del trabajo:* Guía sobre el flujo de trabajo con Git y la estructura de carpetas para la documentación.

### 3. Declaración de Autonomía
* Toda la documentación generada con apoyo de IA fue revisada, ajustada y validada por mí antes de integrarse al repositorio. El contenido final refleja el entendimiento del proyecto y sus requisitos.
* Todo el código y la documentación generados con apoyo de IA fueron revisados, ejecutados (pruebas automatizadas y pruebas manuales) y comprendidos por mí antes de integrarlos al repositorio.
