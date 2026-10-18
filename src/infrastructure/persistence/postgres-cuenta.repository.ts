import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import { CuentaRepository } from '../../domain/ports/cuenta-repository';
import { consultarCompartido, obtenerPoolCompartido, prepararEsquemaTolerante } from './postgres-comun';

/** Adaptador PostgreSQL de cuentas (ADR-0013). El correo es único en la tabla. */
@Injectable()
export class PostgresCuentaRepository extends CuentaRepository implements OnModuleInit {
  onModuleInit(): void {
    prepararEsquemaTolerante(PostgresCuentaRepository.name, async () => {
      await obtenerPoolCompartido().query(`
        CREATE TABLE IF NOT EXISTS cuentas (
          id TEXT PRIMARY KEY,
          correo TEXT NOT NULL UNIQUE,
          nombre TEXT NOT NULL,
          hash_contrasena TEXT NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL
        )
      `);
      // Privacidad (ADR-0021): autorización dada y anonimización a petición.
      const pool = obtenerPoolCompartido();
      await pool.query('ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS privacidad_aceptada_en TIMESTAMPTZ');
      await pool.query('ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS privacidad_version TEXT');
      await pool.query('ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS eliminada_en TIMESTAMPTZ');
    });
  }

  async guardarSiCorreoLibre(cuenta: Cuenta): Promise<boolean> {
    const resultado = await consultarCompartido(
      `INSERT INTO cuentas (id, correo, nombre, hash_contrasena, creado_en, privacidad_aceptada_en, privacidad_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (correo) DO NOTHING`,
      [
        cuenta.id,
        cuenta.correo,
        cuenta.nombre,
        cuenta.hashContrasena,
        cuenta.creadoEn,
        cuenta.privacidadAceptadaEn,
        cuenta.privacidadVersion,
      ],
    );
    return resultado.rowCount === 1;
  }

  async buscarPorCorreo(correo: string): Promise<Cuenta | null> {
    const resultado = await consultarCompartido('SELECT * FROM cuentas WHERE correo = $1', [correo]);
    return resultado.rowCount ? this.aEntidad(resultado.rows[0]) : null;
  }

  async buscarPorId(id: string): Promise<Cuenta | null> {
    const resultado = await consultarCompartido('SELECT * FROM cuentas WHERE id = $1', [id]);
    return resultado.rowCount ? this.aEntidad(resultado.rows[0]) : null;
  }

  async anonimizar(id: string, fecha: string): Promise<void> {
    await consultarCompartido(
      `UPDATE cuentas
       SET correo = $2, nombre = $3, hash_contrasena = '', eliminada_en = $4
       WHERE id = $1`,
      [id, Cuenta.correoAnonimo(id), Cuenta.NOMBRE_ANONIMO, fecha],
    );
  }

  private aEntidad(fila: Record<string, unknown>): Cuenta {
    const fecha = (valor: unknown) => (valor ? new Date(valor as string).toISOString() : null);
    return new Cuenta({
      id: fila.id as string,
      correo: fila.correo as string,
      nombre: fila.nombre as string,
      hashContrasena: fila.hash_contrasena as string,
      creadoEn: new Date(fila.creado_en as string).toISOString(),
      privacidadAceptadaEn: fecha(fila.privacidad_aceptada_en),
      privacidadVersion: (fila.privacidad_version as string | null) ?? null,
      eliminadaEn: fecha(fila.eliminada_en),
    });
  }
}
