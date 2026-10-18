import { Injectable, OnModuleInit } from '@nestjs/common';
import { Foto } from '../../domain/entities/foto';
import { FotoRepository } from '../../domain/ports/foto-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/**
 * Adaptador PostgreSQL de fotos (ADR-0023): los bytes viven en la misma base
 * que el resto de los datos, así un respaldo los incluye y no hace falta otro
 * servicio. Sin claves foráneas hacia otros contextos (la referencia es por id).
 */
@Injectable()
export class PostgresFotoRepository extends FotoRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresFotoRepository.name, async () => {
      await obtenerPoolCompartido().query(`
        CREATE TABLE IF NOT EXISTS fotos (
          publicacion_id TEXT PRIMARY KEY,
          completa BYTEA NOT NULL,
          miniatura BYTEA NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL
        )
      `);
    });
  }

  async guardar(foto: Foto): Promise<void> {
    await consultarCompartido(
      `INSERT INTO fotos (publicacion_id, completa, miniatura, creado_en) VALUES ($1, $2, $3, $4)
       ON CONFLICT (publicacion_id) DO UPDATE SET completa = EXCLUDED.completa, miniatura = EXCLUDED.miniatura,
         creado_en = EXCLUDED.creado_en`,
      [foto.publicacionId, foto.completa, foto.miniatura, foto.creadoEn],
    );
  }

  async buscarPorPublicacion(publicacionId: string): Promise<Foto | null> {
    const r = await consultarCompartido('SELECT * FROM fotos WHERE publicacion_id = $1', [publicacionId]);
    if (!r.rowCount) return null;
    const fila = r.rows[0];
    return new Foto({
      publicacionId: fila.publicacion_id as string,
      completa: fila.completa as Buffer,
      miniatura: fila.miniatura as Buffer,
      creadoEn: new Date(fila.creado_en as string).toISOString(),
    });
  }

  async eliminar(publicacionId: string): Promise<boolean> {
    const r = await consultarCompartido('DELETE FROM fotos WHERE publicacion_id = $1', [publicacionId]);
    return r.rowCount === 1;
  }

  async listarPublicacionIds(limite: number): Promise<string[]> {
    const r = await consultarCompartido('SELECT publicacion_id FROM fotos ORDER BY creado_en ASC LIMIT $1', [limite]);
    return r.rows.map((fila) => fila.publicacion_id as string);
  }
}
