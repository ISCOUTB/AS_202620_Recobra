import { Injectable, OnModuleInit } from '@nestjs/common';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { CoincidenciaRepository } from '../../domain/ports/coincidencia-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/**
 * Adaptador PostgreSQL de coincidencias (ADR-0018): sobreviven a los
 * redespliegues. El id es determinista por par, así que recalcular la misma
 * coincidencia actualiza su puntaje en vez de duplicarla.
 */
@Injectable()
export class PostgresCoincidenciaRepository extends CoincidenciaRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresCoincidenciaRepository.name, async () => {
      const pool = obtenerPoolCompartido();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS coincidencias (
          id TEXT PRIMARY KEY,
          publicacion_origen_id TEXT NOT NULL,
          publicacion_coincidente_id TEXT NOT NULL,
          score NUMERIC(3, 2) NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_coincidencias_origen ON coincidencias (publicacion_origen_id)');
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_coincidencias_coincidente ON coincidencias (publicacion_coincidente_id)',
      );
    });
  }

  async guardar(c: Coincidencia): Promise<Coincidencia> {
    await consultarCompartido(
      `INSERT INTO coincidencias (id, publicacion_origen_id, publicacion_coincidente_id, score, creado_en)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score`,
      [c.id, c.publicacionOrigenId, c.publicacionCoincidenteId, c.score, c.creadoEn],
    );
    return c;
  }

  async listarPorPublicacion(publicacionId: string): Promise<Coincidencia[]> {
    const resultado = await consultarCompartido(
      `SELECT * FROM coincidencias
       WHERE publicacion_origen_id = $1 OR publicacion_coincidente_id = $1
       ORDER BY score DESC, creado_en DESC
       LIMIT 50`,
      [publicacionId],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async listarCreadasDesde(desde: string, limite: number): Promise<Coincidencia[]> {
    const resultado = await consultarCompartido(
      'SELECT * FROM coincidencias WHERE creado_en >= $1 ORDER BY creado_en ASC LIMIT $2',
      [desde, limite],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  private aEntidad(fila: Record<string, unknown>): Coincidencia {
    return new Coincidencia({
      id: fila.id as string,
      publicacionOrigenId: fila.publicacion_origen_id as string,
      publicacionCoincidenteId: fila.publicacion_coincidente_id as string,
      score: Number(fila.score),
      creadoEn: new Date(fila.creado_en as string).toISOString(),
    });
  }
}
