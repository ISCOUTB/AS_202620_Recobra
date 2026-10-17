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
    });
  }

  async guardarSiCorreoLibre(cuenta: Cuenta): Promise<boolean> {
    const resultado = await consultarCompartido(
      `INSERT INTO cuentas (id, correo, nombre, hash_contrasena, creado_en)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (correo) DO NOTHING`,
      [cuenta.id, cuenta.correo, cuenta.nombre, cuenta.hashContrasena, cuenta.creadoEn],
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

  private aEntidad(fila: Record<string, unknown>): Cuenta {
    return new Cuenta({
      id: fila.id as string,
      correo: fila.correo as string,
      nombre: fila.nombre as string,
      hashContrasena: fila.hash_contrasena as string,
      creadoEn: new Date(fila.creado_en as string).toISOString(),
    });
  }
}
