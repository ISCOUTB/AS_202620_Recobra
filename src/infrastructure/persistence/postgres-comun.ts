import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { AlmacenamientoNoDisponibleError } from '../../domain/errors/almacenamiento-no-disponible.error';

/**
 * Piezas compartidas por los adaptadores PostgreSQL de Identidad y
 * Reclamaciones. Usan un único pool, con la misma configuración de TLS y de
 * límites de tiempo que el adaptador de Publicaciones (ver
 * docs/modos-de-fallo.md, integración I1).
 */
let poolCompartido: Pool | undefined;

export function obtenerPoolCompartido(): Pool {
  if (!poolCompartido) {
    const sinTls = process.env.DATABASE_SSL === 'false';
    poolCompartido = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sinTls ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000,
      statement_timeout: 2000,
      query_timeout: 2500,
      max: 5,
    });
  }
  return poolCompartido;
}

const CODIGOS_DE_CONEXION = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE']);

/** true si el error significa "la base no está disponible" (y no un error de datos o de SQL). */
export function esFalloDeAlmacenamiento(error: unknown): boolean {
  const codigo = (error as { code?: string })?.code ?? '';
  const mensaje = error instanceof Error ? error.message : '';
  return (
    CODIGOS_DE_CONEXION.has(codigo) ||
    codigo.startsWith('08') ||
    codigo.startsWith('57P') ||
    codigo === '57014' ||
    codigo === '42P01' ||
    /Connection terminated|timeout/i.test(mensaje)
  );
}

/** Ejecuta una consulta en el pool compartido y traduce las caídas al error de dominio. */
export async function consultarCompartido(sql: string, parametros?: unknown[]) {
  try {
    return await obtenerPoolCompartido().query(sql, parametros);
  } catch (error) {
    if (esFalloDeAlmacenamiento(error)) throw new AlmacenamientoNoDisponibleError();
    throw error;
  }
}

/**
 * Prepara un esquema sin impedir que el proceso arranque: si la base no
 * responde, se registra y se reintenta cada 5 s (mismo criterio que
 * Publicaciones).
 */
export function prepararEsquemaTolerante(nombre: string, crear: () => Promise<void>): void {
  const logger = new Logger(nombre);
  const intentar = () =>
    crear().catch(() => {
      logger.warn('No se pudo preparar el esquema; se reintentará');
      setTimeout(intentar, 5000).unref();
    });
  void intentar();
}
