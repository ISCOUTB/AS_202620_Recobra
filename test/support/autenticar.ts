import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export interface UsuarioDePrueba {
  token: string;
  id: string;
  correo: string;
  nombre: string;
}

/**
 * Registra una cuenta institucional nueva e inicia sesión (ADR-0013). Cada
 * llamada usa un correo distinto, así las pruebas no dependen del orden.
 */
export async function crearUsuario(app: INestApplication, nombre = 'Usuario de prueba'): Promise<UsuarioDePrueba> {
  const correo = `prueba-${randomUUID().slice(0, 8)}@utb.edu.co`;
  const contrasena = 'contrasena-segura-1';
  const registro = await request(app.getHttpServer()).post('/cuentas').send({ correo, nombre, contrasena });
  if (registro.status !== 201) throw new Error(`registro falló: ${registro.status}`);
  const sesion = await request(app.getHttpServer()).post('/sesiones').send({ correo, contrasena });
  if (sesion.status !== 201) throw new Error(`inicio de sesión falló: ${sesion.status}`);
  return { token: sesion.body.token, id: registro.body.id, correo, nombre };
}

/** Atajo: solo el token de una cuenta nueva. */
export async function autenticar(app: INestApplication): Promise<string> {
  return (await crearUsuario(app)).token;
}
