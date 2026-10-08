/**
 * El almacenamiento (base de datos) no responde: no es un dato inválido ni un
 * defecto del código, es una dependencia caída. El dominio la nombra sin saber
 * nada de HTTP ni de PostgreSQL; el adaptador de persistencia la lanza y el
 * adaptador HTTP la traduce a 503, de modo que el usuario distinga "mal usado"
 * (400) de "temporalmente fuera de servicio" (503).
 */
export class AlmacenamientoNoDisponibleError extends Error {
  constructor(motivo = 'El almacenamiento no está disponible') {
    super(motivo);
    this.name = 'AlmacenamientoNoDisponibleError';
  }
}
