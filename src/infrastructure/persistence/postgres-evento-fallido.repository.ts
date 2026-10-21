import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventoFallido, EstadoEventoFallido } from '../../domain/entities/evento-fallido';
import { EventoFallidoRepository } from '../../domain/ports/evento-fallido-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/**
 * Adaptador PostgreSQL de la cola de eventos fallidos (ADR-0026). Sin claves
 * foráneas hacia otros contextos; la carga se guarda como JSONB.
 */
@Injectable()
export class PostgresEventoFallidoRepository extends EventoFallidoRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresEventoFallidoRepository.name, async () => {
      const pool = obtenerPoolCompartido();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS eventos_fallidos (
          id TEXT PRIMARY KEY,
          tipo TEXT NOT NULL,
          version INTEGER NOT NULL,
          carga JSONB NOT NULL,
          ocurrido_en TIMESTAMPTZ NOT NULL,
          intentos INTEGER NOT NULL,
          ultimo_error TEXT NOT NULL,
          estado TEXT NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL,
          resuelto_en TIMESTAMPTZ
        )
      `);
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_eventos_fallidos_pendientes ON eventos_fallidos (creado_en) WHERE estado = 'pendiente'",
      );
    });
  }

  async guardar(e: EventoFallido): Promise<void> {
    await consultarCompartido(
      `INSERT INTO eventos_fallidos (id, tipo, version, carga, ocurrido_en, intentos, ultimo_error, estado, creado_en, resuelto_en)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET intentos = EXCLUDED.intentos, ultimo_error = EXCLUDED.ultimo_error,
         estado = EXCLUDED.estado, resuelto_en = EXCLUDED.resuelto_en`,
      [e.id, e.tipo, e.version, JSON.stringify(e.carga), e.ocurridoEn, e.intentos, e.ultimoError, e.estado, e.creadoEn, e.resueltoEn],
    );
  }

  async buscarPorId(id: string): Promise<EventoFallido | null> {
    const r = await consultarCompartido('SELECT * FROM eventos_fallidos WHERE id = $1', [id]);
    return r.rowCount ? this.aEntidad(r.rows[0]) : null;
  }

  async listarPendientes(limite: number): Promise<EventoFallido[]> {
    const r = await consultarCompartido(
      "SELECT * FROM eventos_fallidos WHERE estado = 'pendiente' ORDER BY creado_en ASC LIMIT $1",
      [limite],
    );
    return r.rows.map((fila) => this.aEntidad(fila));
  }

  async eliminarAnterioresA(fecha: string): Promise<number> {
    const r = await consultarCompartido('DELETE FROM eventos_fallidos WHERE creado_en < $1', [fecha]);
    return r.rowCount ?? 0;
  }

  private aEntidad(fila: Record<string, unknown>): EventoFallido {
    const fecha = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
    return new EventoFallido({
      id: fila.id as string,
      tipo: fila.tipo as string,
      version: fila.version as number,
      carga: fila.carga,
      ocurridoEn: fecha(fila.ocurrido_en) as string,
      intentos: fila.intentos as number,
      ultimoError: fila.ultimo_error as string,
      estado: fila.estado as EstadoEventoFallido,
      creadoEn: fecha(fila.creado_en) as string,
      resueltoEn: fecha(fila.resuelto_en),
    });
  }
}
