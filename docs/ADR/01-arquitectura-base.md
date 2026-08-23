# ADR 0001 — Arquitectura base de Recobra

- Estado: Aceptado
- Fecha: 22/08/2026

## Contexto

Recobra necesita una arquitectura que permita desarrollar funcionalidades de forma independiente, realizar pruebas y mantener bajo acoplamiento entre el dominio y la infraestructura.

## Alternativas consideradas

### Opción 1: Arquitectura por capas

**Ventajas**
- Fácil de comprender.
- Baja complejidad.

**Desventajas**
- El dominio termina dependiendo de la infraestructura.

---

### Opción 2: Hexagonal

**Ventajas**
- Dominio independiente.
- Excelente para pruebas.
- Adaptadores reemplazables.

**Desventajas**
- Requiere definir puertos e interfaces.

---

### Opción 3: Monolito modular

**Ventajas**
- Organización clara.
- Despliegue sencillo.

**Desventajas**
- Puede degradarse si no se respetan los módulos.

## Decisión

Se utilizará una **arquitectura hexagonal organizada como monolito modular**.

## Consecuencias

### Positivas

- Código desacoplado.
- Mejor mantenibilidad.
- Pruebas más simples.
- Permite crecer sin rehacer la estructura.

### Negativas

- Mayor trabajo inicial.
- Necesidad de mantener disciplina en los módulos.
