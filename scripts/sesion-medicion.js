/**
 * Publicar exige sesión desde ADR-0013. Los scripts de medición obtienen un
 * token así: si existe la variable TOKEN la usan; si no, registran una cuenta
 * institucional desechable (`medicion-<aleatorio>@utb.edu.co`) e inician
 * sesión. No imprime nada de las respuestas.
 */
const { randomBytes } = require('node:crypto');

async function obtenerToken(baseUrl) {
  if (process.env.TOKEN) return process.env.TOKEN;
  const correo = `medicion-${randomBytes(4).toString('hex')}@utb.edu.co`;
  const contrasena = randomBytes(12).toString('base64url');
  const enviar = (ruta, cuerpo) =>
    fetch(new URL(ruta, baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });

  const registro = await enviar('/cuentas', { correo, nombre: 'Medición', contrasena, aceptoPrivacidad: true });
  if (registro.status !== 201) throw new Error('No se pudo registrar la cuenta de medición');
  const sesion = await enviar('/sesiones', { correo, contrasena });
  if (sesion.status !== 201) throw new Error('No se pudo iniciar sesión para medir');
  const { token } = await sesion.json();
  return token;
}

module.exports = { obtenerToken };
