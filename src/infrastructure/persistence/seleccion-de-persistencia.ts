/**
 * Qué almacenamiento usa el proceso, decidido una sola vez al arrancar.
 *
 * Con DATABASE_URL, PostgreSQL. Sin ella, los adaptadores en memoria, que solo
 * sirven para pruebas y desarrollo: pierden todo al reiniciar. En producción
 * (NODE_ENV=production) arrancar en memoria haría que el sistema pareciera
 * sano mientras no guarda nada, así que el proceso se niega a arrancar.
 * PERMITIR_MEMORIA=true es la salida explícita para una demo sin base.
 */
export type Persistencia = 'postgres' | 'memoria';

export class PersistenciaNoConfiguradaError extends Error {
  constructor() {
    super(
      'Producción sin DATABASE_URL: Recobra no arranca con almacenamiento en memoria, porque perdería los datos ' +
        'en cada reinicio. Defina DATABASE_URL o, solo para una demostración, PERMITIR_MEMORIA=true.',
    );
    this.name = 'PersistenciaNoConfiguradaError';
  }
}

export function persistenciaConfigurada(entorno: NodeJS.ProcessEnv = process.env): Persistencia {
  if (entorno.DATABASE_URL) return 'postgres';
  if (entorno.NODE_ENV === 'production' && entorno.PERMITIR_MEMORIA !== 'true') {
    throw new PersistenciaNoConfiguradaError();
  }
  return 'memoria';
}
