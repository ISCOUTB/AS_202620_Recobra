import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import {
  Custodia,
  EstadoPublicacion,
  ESTADOS_ACTIVOS,
  MotivoCierre,
  Publicacion,
  TipoPublicacion,
} from '../../domain/entities/publicacion';
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
      // "Responde tarde": la base corta la sentencia a los 2 s y el cliente
      // deja de esperar a los 2,5 s. Es 5 veces el presupuesto de S1 (400 ms)
      // y cientos de veces lo observado (~13 ms en el servidor); ver
      // docs/modos-de-fallo.md.
      statement_timeout: 2000,
      query_timeout: 2500,
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
        codigo === '57014' || // sentencia cancelada por statement_timeout
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
    // Cuentas (ADR-0013): columna nueva, nula en las publicaciones anteriores.
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS autor_id TEXT');
    await this.pool.query('CREATE INDEX IF NOT EXISTS idx_publicaciones_autor ON publicaciones (autor_id)');
    // Lugares en dos niveles: piso, salón o referencia; nulo en las anteriores.
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS detalle_ubicacion TEXT');
    // Cierre y vencimiento (ADR-0017).
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS motivo_cierre TEXT');
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS cerrado_en TIMESTAMPTZ');
    // Dónde está un objeto encontrado (ADR-0019).
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS custodia TEXT');
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS punto_custodia TEXT');
    // Qué reclamación se aprobó, para retomar una aprobación interrumpida (ADR-0020).
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS reclamacion_aprobada_id TEXT');
    // Si tiene foto (ADR-0023); los bytes viven en la tabla `fotos`.
    await this.pool.query('ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS tiene_foto BOOLEAN NOT NULL DEFAULT FALSE');
    this.esquemaListo = true;
  }

  async guardar(publicacion: Publicacion): Promise<Publicacion> {
    await this.consultar(
      `INSERT INTO publicaciones
         (id, tipo, descripcion, categoria, ubicacion, estado, creado_en, autor_id, detalle_ubicacion, custodia, punto_custodia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        publicacion.id,
        publicacion.tipo,
        publicacion.descripcion,
        publicacion.categoria,
        publicacion.ubicacion,
        publicacion.estado,
        publicacion.creadoEn,
        publicacion.autorId,
        publicacion.detalleUbicacion,
        publicacion.custodia,
        publicacion.puntoCustodia,
      ],
    );
    return publicacion;
  }

  /** Atómico gracias a la clave primaria: dos inserciones simultáneas del mismo id dejan una sola fila. */
  async guardarSiNoExiste(publicacion: Publicacion): Promise<boolean> {
    const resultado = await this.consultar(
      `INSERT INTO publicaciones
         (id, tipo, descripcion, categoria, ubicacion, estado, creado_en, autor_id, detalle_ubicacion, custodia, punto_custodia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        publicacion.id,
        publicacion.tipo,
        publicacion.descripcion,
        publicacion.categoria,
        publicacion.ubicacion,
        publicacion.estado,
        publicacion.creadoEn,
        publicacion.autorId,
        publicacion.detalleUbicacion,
        publicacion.custodia,
        publicacion.puntoCustodia,
      ],
    );
    return resultado.rowCount === 1;
  }

  /** Comparar y fijar; guarda además la reclamación aprobada en el mismo `UPDATE` (atómico). */
  async cambiarEstado(
    id: string,
    de: EstadoPublicacion,
    a: EstadoPublicacion,
    reclamacionAprobadaId?: string,
  ): Promise<boolean> {
    const resultado = await this.consultar(
      `UPDATE publicaciones
       SET estado = $3, reclamacion_aprobada_id = COALESCE($4, reclamacion_aprobada_id)
       WHERE id = $1 AND estado = $2`,
      [id, de, a, reclamacionAprobadaId ?? null],
    );
    return resultado.rowCount === 1;
  }

  async listarPorEstado(estado: EstadoPublicacion, limite: number): Promise<Publicacion[]> {
    const resultado = await this.consultar(
      'SELECT * FROM publicaciones WHERE estado = $1 ORDER BY creado_en ASC LIMIT $2',
      [estado, limite],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
  }

  async cerrar(id: string, motivo: MotivoCierre, fecha: string): Promise<boolean> {
    const resultado = await this.consultar(
      `UPDATE publicaciones SET estado = 'cerrado', motivo_cierre = $2, cerrado_en = $3
       WHERE id = $1 AND estado = 'publicado'`,
      [id, motivo, fecha],
    );
    return resultado.rowCount === 1;
  }

  async cambiarCustodia(id: string, custodia: Custodia, punto: string | null): Promise<boolean> {
    const resultado = await this.consultar('UPDATE publicaciones SET custodia = $2, punto_custodia = $3 WHERE id = $1', [
      id,
      custodia,
      punto,
    ]);
    return resultado.rowCount === 1;
  }

  async marcarFoto(id: string, tiene: boolean): Promise<boolean> {
    const resultado = await this.consultar('UPDATE publicaciones SET tiene_foto = $2 WHERE id = $1', [id, tiene]);
    return resultado.rowCount === 1;
  }

  async cerrarVencidas(creadasAntesDe: string, fecha: string): Promise<number> {
    const resultado = await this.consultar(
      `UPDATE publicaciones SET estado = 'cerrado', motivo_cierre = 'vencido', cerrado_en = $2
       WHERE estado = 'publicado' AND creado_en < $1`,
      [creadasAntesDe, fecha],
    );
    return resultado.rowCount ?? 0;
  }

  async listarPorAutor(autorId: string): Promise<Publicacion[]> {
    const resultado = await this.consultar(
      'SELECT * FROM publicaciones WHERE autor_id = $1 ORDER BY creado_en DESC LIMIT 100',
      [autorId],
    );
    return resultado.rows.map((fila) => this.aEntidad(fila));
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
         AND estado = ANY($5::text[])
       ORDER BY creado_en DESC
       LIMIT $4`,
      [tipo ?? null, categoria ?? null, ubicacion ?? null, limite, [...ESTADOS_ACTIVOS]],
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
      detalleUbicacion: (fila.detalle_ubicacion as string | null) ?? null,
      creadoEn: new Date(fila.creado_en as string).toISOString(),
      estado: fila.estado as EstadoPublicacion,
      autorId: (fila.autor_id as string | null) ?? null,
      motivoCierre: (fila.motivo_cierre as MotivoCierre | null) ?? null,
      cerradoEn: fila.cerrado_en ? new Date(fila.cerrado_en as string).toISOString() : null,
      custodia: (fila.custodia as Custodia | null) ?? null,
      puntoCustodia: (fila.punto_custodia as string | null) ?? null,
      reclamacionAprobadaId: (fila.reclamacion_aprobada_id as string | null) ?? null,
      tieneFoto: fila.tiene_foto === true,
    });
  }
}
