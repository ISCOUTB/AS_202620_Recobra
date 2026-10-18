import { Injectable, OnModuleInit } from '@nestjs/common';
import { Notificacion, TipoNotificacion } from '../../domain/entities/notificacion';
import { NotificacionRepository } from '../../domain/ports/notificacion-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/** Adaptador PostgreSQL de notificaciones (ADR-0015). La clave primaria evita duplicados. */
@Injectable()
export class PostgresNotificacionRepository extends NotificacionRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresNotificacionRepository.name, async () => {
      const pool = obtenerPoolCompartido();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notificaciones (
          id TEXT PRIMARY KEY,
          cuenta_id TEXT NOT NULL,
          tipo TEXT NOT NULL,
          titulo TEXT NOT NULL,
          mensaje TEXT NOT NULL,
          publicacion_id TEXT NOT NULL,
          leida BOOLEAN NOT NULL DEFAULT false,
          creado_en TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_notificaciones_cuenta ON notificaciones (cuenta_id, creado_en DESC)',
      );
    });
  }

  async guardarSiNoExiste(n: Notificacion): Promise<boolean> {
    const resultado = await consultarCompartido(
      `INSERT INTO notificaciones (id, cuenta_id, tipo, titulo, mensaje, publicacion_id, leida, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.cuentaId, n.tipo, n.titulo, n.mensaje, n.publicacionId, n.leida, n.creadoEn],
    );
    return resultado.rowCount === 1;
  }

  async listarPorCuenta(cuentaId: string, limite: number): Promise<Notificacion[]> {
    const resultado = await consultarCompartido(
      'SELECT * FROM notificaciones WHERE cuenta_id = $1 ORDER BY creado_en DESC LIMIT $2',
      [cuentaId, limite],
    );
    return resultado.rows.map(
      (fila) =>
        new Notificacion({
          id: fila.id,
          cuentaId: fila.cuenta_id,
          tipo: fila.tipo as TipoNotificacion,
          titulo: fila.titulo,
          mensaje: fila.mensaje,
          publicacionId: fila.publicacion_id,
          leida: fila.leida,
          creadoEn: new Date(fila.creado_en).toISOString(),
        }),
    );
  }

  async contarNoLeidas(cuentaId: string): Promise<number> {
    const resultado = await consultarCompartido(
      'SELECT count(*)::int AS total FROM notificaciones WHERE cuenta_id = $1 AND NOT leida',
      [cuentaId],
    );
    return resultado.rows[0]?.total ?? 0;
  }

  async marcarLeida(id: string, cuentaId: string): Promise<boolean> {
    const resultado = await consultarCompartido(
      'UPDATE notificaciones SET leida = true WHERE id = $1 AND cuenta_id = $2',
      [id, cuentaId],
    );
    return resultado.rowCount === 1;
  }

  async eliminarDeCuenta(cuentaId: string): Promise<void> {
    await consultarCompartido('DELETE FROM notificaciones WHERE cuenta_id = $1', [cuentaId]);
  }

  async eliminarAnterioresA(fecha: string): Promise<number> {
    const resultado = await consultarCompartido('DELETE FROM notificaciones WHERE creado_en < $1', [fecha]);
    return resultado.rowCount ?? 0;
  }

  async marcarTodasLeidas(cuentaId: string): Promise<void> {
    await consultarCompartido('UPDATE notificaciones SET leida = true WHERE cuenta_id = $1 AND NOT leida', [cuentaId]);
  }
}
