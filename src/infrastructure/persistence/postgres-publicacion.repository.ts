import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { PublicacionRepository } from '../../domain/ports/publicacion-repository';

/**
 * Adaptador real de persistencia (ADR-0006). Reemplaza a
 * MemoriaPublicacionRepository sin que domain/ ni application/ cambien una
 * sola línea (la promesa de ADR-0002 sobre puertos y adaptadores).
 * Se activa solo si DATABASE_URL está definida (ver
 * publicaciones.module.ts); en su ausencia el composition root usa el
 * adaptador en memoria, así que las pruebas no necesitan una base de datos
 * real.
 */
@Injectable()
export class PostgresPublicacionRepository extends PublicacionRepository implements OnModuleInit {
  private readonly pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS publicaciones (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        categoria TEXT NOT NULL,
        ubicacion TEXT NOT NULL,
        estado TEXT NOT NULL,
        creado_en TIMESTAMPTZ NOT NULL
      )
    `);
  }

  async guardar(publicacion: Publicacion): Promise<Publicacion> {
    await this.pool.query(
      `INSERT INTO publicaciones (id, tipo, descripcion, categoria, ubicacion, estado, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        publicacion.id,
        publicacion.tipo,
        publicacion.descripcion,
        publicacion.categoria,
        publicacion.ubicacion,
        publicacion.estado,
        publicacion.creadoEn,
      ],
    );
    return publicacion;
  }

  async buscarPorId(id: string): Promise<Publicacion | null> {
    const resultado = await this.pool.query('SELECT * FROM publicaciones WHERE id = $1', [id]);
    if (resultado.rowCount === 0) return null;
    return this.aEntidad(resultado.rows[0]);
  }

  async listarPorTipo(tipo: TipoPublicacion): Promise<Publicacion[]> {
    const resultado = await this.pool.query('SELECT * FROM publicaciones WHERE tipo = $1', [tipo]);
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  private aEntidad(fila: Record<string, unknown>): Publicacion {
    return new Publicacion({
      id: fila.id as string,
      tipo: fila.tipo as TipoPublicacion,
      descripcion: fila.descripcion as string,
      categoria: fila.categoria as string,
      ubicacion: fila.ubicacion as string,
      creadoEn: new Date(fila.creado_en as string).toISOString(),
    });
  }
}
