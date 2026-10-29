import { BlockList, isIP } from 'node:net';
import type { NextFunction, Request, Response } from 'express';

/**
 * Rangos de Cloudflare, publicados en https://www.cloudflare.com/ips-v4 y /ips-v6
 * (revisados el 28-oct-2026; cambian muy rara vez). Solo se cree en `CF-Connecting-IP`
 * cuando la conexión que llegó al proxy salió de uno de ellos (ADR-0029).
 */
const RANGOS_IPV4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const RANGOS_IPV6 = ['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'];

const cloudflare = new BlockList();
for (const rango of RANGOS_IPV4) {
  const [red, prefijo] = rango.split('/');
  cloudflare.addSubnet(red, Number(prefijo), 'ipv4');
}
for (const rango of RANGOS_IPV6) {
  const [red, prefijo] = rango.split('/');
  cloudflare.addSubnet(red, Number(prefijo), 'ipv6');
}

/** ¿La dirección pertenece a Cloudflare? Acepta IPv4 escrita como IPv6 (`::ffff:1.2.3.4`). */
export function esDeCloudflare(direccion: string | undefined): boolean {
  if (!direccion) return false;
  const limpia = direccion.startsWith('::ffff:') ? direccion.slice(7) : direccion;
  const familia = isIP(limpia);
  if (familia === 0) return false;
  return cloudflare.check(limpia, familia === 4 ? 'ipv4' : 'ipv6');
}

/**
 * Detrás de Cloudflare y Traefik, `req.ip` es la dirección del borde de Cloudflare, no la
 * de la persona: Traefik reemplaza `X-Forwarded-For` por la dirección de quien le habló. La
 * dirección real viaja en `CF-Connecting-IP`, que se cree **solo si** la conexión vino de un rango de
 * Cloudflare; de cualquier otro origen el encabezado se ignora, así que nadie puede elegir su
 * origen escribiéndolo (los límites de uso y la huella de los registros cuentan por origen).
 */
export function usarOrigenDeCloudflare(peticion: Request, _respuesta: Response, siguiente: NextFunction): void {
  const declarada = peticion.headers['cf-connecting-ip'];
  if (typeof declarada === 'string' && isIP(declarada.trim()) !== 0 && esDeCloudflare(peticion.ip)) {
    Object.defineProperty(peticion, 'ip', { value: declarada.trim(), configurable: true });
  }
  siguiente();
}
