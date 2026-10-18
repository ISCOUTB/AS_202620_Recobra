import { Injectable, OnModuleInit } from '@nestjs/common';
import { Sesion } from '../../domain/entities/sesion';
import { SesionRepository } from '../../domain/ports/sesion-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/** Adaptador PostgreSQL de sesiones: guarda el hash del token, nunca el token (ADR-0013). */
@Injectable()
export class PostgresSesionRepository extends SesionRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresSesionRepository.name, async () => {
      await obtenerPoolCompartido().query(`
        CREATE TABLE IF NOT EXISTS sesiones (
          token_hash TEXT PRIMARY KEY,
          cuenta_id TEXT NOT NULL,
          creada_en TIMESTAMPTZ NOT NULL,
          expira_en TIMESTAMPTZ NOT NULL
        )
      `);
    });
  }

  async guardar(sesion: Sesion): Promise<void> {
    await consultarCompartido(
      'INSERT INTO sesiones (token_hash, cuenta_id, creada_en, expira_en) VALUES ($1, $2, $3, $4)',
      [sesion.tokenHash, sesion.cuentaId, sesion.creadaEn, sesion.expiraEn],
    );
  }

  async buscarPorTokenHash(tokenHash: string): Promise<Sesion | null> {
    const resultado = await consultarCompartido('SELECT * FROM sesiones WHERE token_hash = $1', [tokenHash]);
    if (!resultado.rowCount) return null;
    const fila = resultado.rows[0];
    return {
      tokenHash: fila.token_hash,
      cuentaId: fila.cuenta_id,
      creadaEn: new Date(fila.creada_en).toISOString(),
      expiraEn: new Date(fila.expira_en).toISOString(),
    };
  }

  async eliminar(tokenHash: string): Promise<void> {
    await consultarCompartido('DELETE FROM sesiones WHERE token_hash = $1', [tokenHash]);
  }

  async eliminarDeCuenta(cuentaId: string): Promise<void> {
    await consultarCompartido('DELETE FROM sesiones WHERE cuenta_id = $1', [cuentaId]);
  }

  async eliminarExpiradas(ahora: string): Promise<number> {
    const resultado = await consultarCompartido('DELETE FROM sesiones WHERE expira_en <= $1', [ahora]);
    return resultado.rowCount ?? 0;
  }
}
