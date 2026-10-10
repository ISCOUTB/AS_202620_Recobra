import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { Publicacion, TipoPublicacion } from '../../domain/entities/publicacion';
import { FiltrosBusqueda, PublicacionRepository } from '../../domain/ports/publicacion-repository';
import { AlmacenamientoNoDisponibleError } from '../../domain/errors/almacenamiento-no-disponible.error';

const CODIGOS_DE_CONEXION = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE']);
const ESPERA_REINTENTO_MS = 5000;

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
export class PostgresPublicacionRepository
  extends PublicacionRepository
  implements OnModuleInit, OnModuleDestroy
{
  readonly almacenamiento = 'postgres';
  private readonly pool: Pool;
  private readonly logger = new Logger(PostgresPublicacionRepository.name);
  private reintento?: NodeJS.Timeout;
  /** Verdadero cuando la tabla y el índice existen: conectar no basta para servir. */
  private esquemaListo = false;

  constructor() {
    super();
    // Una base gestionada fuera de la red del servicio (Neon) exige TLS; una
    // base interna del mismo proyecto de Dokploy no lo ofrece y el handshake
    // fallaría al arrancar. DATABASE_SSL=false lo desactiva; por omisión se
    // mantiene el comportamiento seguro.
    const sinTls = process.env.DATABASE_SSL === 'false';
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sinTls ? false : { rejectUnauthorized: false },
      // Sin esto una base que no contesta deja las peticiones colgadas.
      connectionTimeoutMillis: 3000,
    });
  }

  /**
   * Un fallo al crear el esquema (la base aún no resuelve o no contesta) NO
   * debe impedir que el proceso arranque: si lo impidiera, una dependencia
   * caída tumbaría hasta /health y el enrutamiento. Se registra, se sigue
   * reintentando en segundo plano y las operaciones responden 503 mientras
   * tanto.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.crearEsquema();
    } catch (error) {
      this.logger.warn(`No se pudo preparar el esquema (${this.describir(error)}); se reintentará`);
      this.programarReintento();
    }
  }

  onModuleDestroy(): void {
    if (this.reintento) clearTimeout(this.reintento);
  }

  /**
   * Disponible = la base contesta Y el esquema está preparado. Con solo
   * `SELECT 1` una base que acepta conexiones pero donde falló la creación de
   * la tabla pasaría por sana mientras toda operación real falla. Si el
   * esquema falta, se intenta crear aquí mismo y, si no se logra, se informa
   * como no disponible.
   */
  async verificarDisponibilidad(): Promise<void> {
    await this.consultar('SELECT 1');
    if (this.esquemaListo) return;
    try {
      await this.crearEsquema();
    } catch {
      throw new AlmacenamientoNoDisponibleError('El esquema de la base no está preparado');
    }
  }

  private programarReintento(): void {
    this.reintento = setTimeout(() => {
      this.crearEsquema()
        .then(() => this.logger.log('Esquema preparado tras reintentar'))
        .catch((error: unknown) => {
          this.logger.warn(`Reintento fallido (${this.describir(error)})`);
          this.programarReintento();
        });
    }, ESPERA_REINTENTO_MS);
    this.reintento.unref();
  }

  private describir(error: unknown): string {
    const codigo = (error as { code?: string })?.code;
    return codigo ?? (error instanceof Error ? error.name : 'error desconocido');
  }

  /** Ejecuta una consulta y traduce las caídas de conexión al error de dominio. */
  private async consultar(sql: string, parametros?: unknown[]) {
    try {
      return await this.pool.query(sql, parametros);
    } catch (error) {
      const codigo = (error as { code?: string })?.code ?? '';
      const mensaje = error instanceof Error ? error.message : '';
      if (
        CODIGOS_DE_CONEXION.has(codigo) ||
        codigo.startsWith('08') ||
        codigo.startsWith('57P') ||
        codigo === '42P01' || // la tabla aún no existe: esquema sin preparar
        /Connection terminated|timeout/i.test(mensaje)
      ) {
        throw new AlmacenamientoNoDisponibleError();
      }
      throw error;
    }
  }

  private async crearEsquema(): Promise<void> {
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
    await this.pool.query(
      'CREATE INDEX IF NOT EXISTS idx_publicaciones_creado_en ON publicaciones (creado_en DESC)',
    );
    this.esquemaListo = true;
  }

  async guardar(publicacion: Publicacion): Promise<Publicacion> {
    await this.consultar(
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
    const resultado = await this.consultar('SELECT * FROM publicaciones WHERE id = $1', [id]);
    if (resultado.rowCount === 0) return null;
    return this.aEntidad(resultado.rows[0]);
  }

  async listarPorTipo(tipo: TipoPublicacion): Promise<Publicacion[]> {
    const resultado = await this.consultar('SELECT * FROM publicaciones WHERE tipo = $1', [tipo]);
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async buscar({ tipo, categoria, ubicacion, limite }: FiltrosBusqueda): Promise<Publicacion[]> {
    // Consulta fija y parametrizada: los valores del usuario viajan solo como
    // parámetros ($1..$4), nunca concatenados al SQL.
    const resultado = await this.consultar(
      `SELECT * FROM publicaciones
       WHERE ($1::text IS NULL OR tipo = $1)
         AND ($2::text IS NULL OR lower(trim(categoria)) = $2)
         AND ($3::text IS NULL OR lower(trim(ubicacion)) = $3)
       ORDER BY creado_en DESC
       LIMIT $4`,
      [tipo ?? null, categoria ?? null, ubicacion ?? null, limite],
    );
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
