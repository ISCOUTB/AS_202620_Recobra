import { Injectable, OnModuleInit } from '@nestjs/common';
import { DETALLE_ANONIMIZADO, EstadoReporte, Reporte } from '../../domain/entities/reporte';
import { ReporteRepository } from '../../domain/ports/reporte-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/**
 * Adaptador PostgreSQL de reportes (ADR-0022). Sin claves foráneas hacia otros
 * contextos (la referencia es por id), como el resto de tablas.
 */
@Injectable()
export class PostgresReporteRepository extends ReporteRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresReporteRepository.name, async () => {
      const pool = obtenerPoolCompartido();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reportes (
          id TEXT PRIMARY KEY,
          publicacion_id TEXT NOT NULL,
          reportante_id TEXT NOT NULL,
          motivo TEXT NOT NULL,
          detalle TEXT,
          estado TEXT NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL,
          resuelto_en TIMESTAMPTZ,
          resuelto_por TEXT,
          nota TEXT
        )
      `);
      await pool.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_reportes_uno_por_cuenta ON reportes (publicacion_id, reportante_id)',
      );
      await pool.query("CREATE INDEX IF NOT EXISTS idx_reportes_abiertos ON reportes (creado_en) WHERE estado = 'abierto'");
    });
  }

  async guardar(r: Reporte): Promise<Reporte> {
    await consultarCompartido(
      `INSERT INTO reportes (id, publicacion_id, reportante_id, motivo, detalle, estado, creado_en, resuelto_en, resuelto_por, nota)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, resuelto_en = EXCLUDED.resuelto_en,
         resuelto_por = EXCLUDED.resuelto_por, nota = EXCLUDED.nota`,
      [r.id, r.publicacionId, r.reportanteId, r.motivo, r.detalle, r.estado, r.creadoEn, r.resueltoEn, r.resueltoPor, r.nota],
    );
    return r;
  }

  async buscarPorId(id: string): Promise<Reporte | null> {
    const resultado = await consultarCompartido('SELECT * FROM reportes WHERE id = $1', [id]);
    return resultado.rowCount ? this.aEntidad(resultado.rows[0]) : null;
  }

  async buscarDe(publicacionId: string, reportanteId: string): Promise<Reporte | null> {
    const resultado = await consultarCompartido(
      'SELECT * FROM reportes WHERE publicacion_id = $1 AND reportante_id = $2',
      [publicacionId, reportanteId],
    );
    return resultado.rowCount ? this.aEntidad(resultado.rows[0]) : null;
  }

  async listarAbiertos(limite: number): Promise<Reporte[]> {
    const resultado = await consultarCompartido(
      "SELECT * FROM reportes WHERE estado = 'abierto' ORDER BY creado_en ASC LIMIT $1",
      [limite],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async listarAbiertosDe(publicacionId: string): Promise<Reporte[]> {
    const resultado = await consultarCompartido(
      "SELECT * FROM reportes WHERE publicacion_id = $1 AND estado = 'abierto'",
      [publicacionId],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async listarPorReportante(reportanteId: string): Promise<Reporte[]> {
    const resultado = await consultarCompartido(
      'SELECT * FROM reportes WHERE reportante_id = $1 ORDER BY creado_en DESC LIMIT 200',
      [reportanteId],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async anonimizarDetallesDe(reportanteId: string): Promise<number> {
    const resultado = await consultarCompartido(
      'UPDATE reportes SET detalle = $2 WHERE reportante_id = $1 AND detalle IS NOT NULL AND detalle <> $2',
      [reportanteId, DETALLE_ANONIMIZADO],
    );
    return resultado.rowCount ?? 0;
  }

  private aEntidad(fila: Record<string, unknown>): Reporte {
    const fecha = (valor: unknown) => (valor ? new Date(valor as string).toISOString() : null);
    return new Reporte({
      id: fila.id as string,
      publicacionId: fila.publicacion_id as string,
      reportanteId: fila.reportante_id as string,
      motivo: fila.motivo as string,
      detalle: (fila.detalle as string | null) ?? null,
      estado: fila.estado as EstadoReporte,
      creadoEn: fecha(fila.creado_en) as string,
      resueltoEn: fecha(fila.resuelto_en),
      resueltoPor: (fila.resuelto_por as string | null) ?? null,
      nota: (fila.nota as string | null) ?? null,
    });
  }
}
