import { Injectable, OnModuleInit } from '@nestjs/common';
import { EstadoReclamacion, Reclamacion } from '../../domain/entities/reclamacion';
import { ReclamacionRepository } from '../../domain/ports/reclamacion-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/**
 * Adaptador PostgreSQL de reclamaciones (ADR-0014). Cada intento queda como
 * una fila, con reclamante y fecha (escenario S2). Sin claves foráneas hacia
 * otros contextos a propósito: cada contexto es dueño de su tabla
 * (docs/modulo-datos.md).
 */
@Injectable()
export class PostgresReclamacionRepository extends ReclamacionRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresReclamacionRepository.name, async () => {
      const pool = obtenerPoolCompartido();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reclamaciones (
          id TEXT PRIMARY KEY,
          publicacion_id TEXT NOT NULL,
          reclamante_id TEXT NOT NULL,
          prueba TEXT NOT NULL,
          estado TEXT NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL,
          resuelta_en TIMESTAMPTZ,
          motivo_rechazo TEXT
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_reclamaciones_publicacion ON reclamaciones (publicacion_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_reclamaciones_reclamante ON reclamaciones (reclamante_id)');
    });
  }

  async guardar(r: Reclamacion): Promise<Reclamacion> {
    await consultarCompartido(
      `INSERT INTO reclamaciones (id, publicacion_id, reclamante_id, prueba, estado, creado_en, resuelta_en, motivo_rechazo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, resuelta_en = EXCLUDED.resuelta_en,
         motivo_rechazo = EXCLUDED.motivo_rechazo`,
      [r.id, r.publicacionId, r.reclamanteId, r.prueba, r.estado, r.creadoEn, r.resueltaEn, r.motivoRechazo],
    );
    return r;
  }

  async buscarPorId(id: string): Promise<Reclamacion | null> {
    const resultado = await consultarCompartido('SELECT * FROM reclamaciones WHERE id = $1', [id]);
    return resultado.rowCount ? this.aEntidad(resultado.rows[0]) : null;
  }

  async listarPorPublicacion(publicacionId: string): Promise<Reclamacion[]> {
    const resultado = await consultarCompartido(
      'SELECT * FROM reclamaciones WHERE publicacion_id = $1 ORDER BY creado_en DESC LIMIT 100',
      [publicacionId],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async listarPorReclamante(reclamanteId: string): Promise<Reclamacion[]> {
    const resultado = await consultarCompartido(
      'SELECT * FROM reclamaciones WHERE reclamante_id = $1 ORDER BY creado_en DESC LIMIT 100',
      [reclamanteId],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  private aEntidad(fila: Record<string, unknown>): Reclamacion {
    const fecha = (valor: unknown) => (valor ? new Date(valor as string).toISOString() : null);
    return new Reclamacion({
      id: fila.id as string,
      publicacionId: fila.publicacion_id as string,
      reclamanteId: fila.reclamante_id as string,
      prueba: fila.prueba as string,
      estado: fila.estado as EstadoReclamacion,
      creadoEn: fecha(fila.creado_en) as string,
      resueltaEn: fecha(fila.resuelta_en),
      motivoRechazo: (fila.motivo_rechazo as string | null) ?? null,
    });
  }
}
