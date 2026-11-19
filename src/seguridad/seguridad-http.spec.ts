import { Request, Response } from 'express';
import { calcularPoliticas, crearCabecerasDeSeguridad, politicaPara } from './cabeceras-de-seguridad';
import { rechazarCuerpoComprimido, saltosDeProxy } from './configurar-seguridad';
import { origenPermitido } from './cors';
import { esDeCloudflare, usarOrigenDeCloudflare } from './origen-del-cliente';

describe('Seguridad HTTP (ADR-0029)', () => {
  describe('Política de contenido (CSP)', () => {
    it('cada ruta recibe la política que le toca: app web o API (la raíz solo redirige, ADR-0031)', () => {
      const p = calcularPoliticas();
      expect(politicaPara('/', p)).toBe(p.api);
      expect(politicaPara('/index.html', p)).toBe(p.api);
      expect(politicaPara('/app/', p)).toBe(p.app);
      expect(politicaPara('/app/main.dart.js', p)).toBe(p.app);
      expect(politicaPara('/publicaciones', p)).toBe(p.api);
      expect(politicaPara('/apple', p)).toBe(p.api); // empieza con "/app" pero no es /app/
    });

    it('la app web solo ejecuta sus propios archivos: ningún script en línea ni de otro sitio, y no puede ser enmarcada', () => {
      const { app } = calcularPoliticas();
      expect(app).toContain("script-src 'self' 'wasm-unsafe-eval'");
      expect(app).not.toMatch(/script-src[^;]*unsafe-inline/);
      expect(app).not.toMatch(/script-src[^;]*\s'unsafe-eval'/);
      expect(app).not.toMatch(/script-src[^;]*https?:/);
      expect(app).toContain("frame-ancestors 'none'");
    });
  });

  describe('Cabeceras en cada respuesta', () => {
    function responder(ruta: string, secure = false): Record<string, string> {
      const cabeceras: Record<string, string> = {};
      const peticion = { originalUrl: ruta, secure } as unknown as Request;
      const respuesta = { setHeader: (n: string, v: string) => (cabeceras[n] = v) } as unknown as Response;
      const siguiente = jest.fn();
      crearCabecerasDeSeguridad()(peticion, respuesta, siguiente);
      expect(siguiente).toHaveBeenCalledTimes(1);
      return cabeceras;
    }

    it('toda respuesta lleva nosniff, sin marcos, sin referente y sin sensores', () => {
      const h = responder('/publicaciones?tipo=perdido');
      expect(h['X-Content-Type-Options']).toBe('nosniff');
      expect(h['X-Frame-Options']).toBe('DENY');
      expect(h['Referrer-Policy']).toBe('no-referrer');
      expect(h['Permissions-Policy']).toContain('geolocation=()');
      expect(h['Content-Security-Policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    });

    it('HSTS solo cuando la conexión llegó por HTTPS (tras el proxy de confianza), y sin subdominios ni precarga', () => {
      expect(responder('/', false)['Strict-Transport-Security']).toBeUndefined();
      expect(responder('/', true)['Strict-Transport-Security']).toBe('max-age=15552000');
    });
  });

  describe('Cuerpos comprimidos', () => {
    function enviar(contentEncoding?: string) {
      const peticion = { headers: contentEncoding === undefined ? {} : { 'content-encoding': contentEncoding } } as unknown as Request;
      const json = jest.fn();
      const respuesta = { status: jest.fn().mockReturnThis(), json } as unknown as Response;
      const siguiente = jest.fn();
      rechazarCuerpoComprimido(peticion, respuesta, siguiente);
      return { siguiente, respuesta, json };
    }

    it.each(['gzip', 'deflate', 'br', 'GZIP', ' gzip '])('rechaza "%s" con 415 y no lo deja llegar al lector de cuerpos', (valor) => {
      const { siguiente, respuesta, json } = enviar(valor);
      expect(siguiente).not.toHaveBeenCalled();
      expect(respuesta.status).toHaveBeenCalledWith(415);
      expect(json).toHaveBeenCalledWith({ statusCode: 415, message: expect.stringContaining('comprimidos') });
    });

    it.each([undefined, '', 'identity'])('deja pasar el cuerpo sin comprimir (%p)', (valor) => {
      expect(enviar(valor).siguiente).toHaveBeenCalledTimes(1);
    });
  });

  describe('CORS con lista blanca', () => {
    const produccion = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;

    it('en producción ningún origen de otro sitio puede leer la API, salvo los listados', () => {
      expect(origenPermitido('https://sitio-malicioso.example', produccion)).toBe(false);
      expect(origenPermitido('http://localhost:8080', produccion)).toBe(false);
      const conLista = { ...produccion, CORS_ORIGENES: 'https://aliado.utb.edu.co, https://otro.example' };
      expect(origenPermitido('https://aliado.utb.edu.co', conLista)).toBe(true);
      expect(origenPermitido('https://sitio-malicioso.example', conLista)).toBe(false);
    });

    it('sin cabecera Origen (apps móviles, curl, mismo origen) no hay nada que restringir', () => {
      expect(origenPermitido(undefined, produccion)).toBe(true);
    });

    it('fuera de producción se permite localhost para desarrollar, y solo localhost', () => {
      const desarrollo = {} as NodeJS.ProcessEnv;
      expect(origenPermitido('http://localhost:8080', desarrollo)).toBe(true);
      expect(origenPermitido('http://127.0.0.1:5173', desarrollo)).toBe(true);
      expect(origenPermitido('https://localhost.sitio-malicioso.example', desarrollo)).toBe(false);
      expect(origenPermitido('https://sitio-malicioso.example', desarrollo)).toBe(false);
    });
  });

  describe('Origen de la petición detrás del proxy', () => {
    const peticion = (ip: string, cabeceras: Record<string, string> = {}) => ({ ip, headers: cabeceras }) as unknown as Request;
    const origenTras = (ip: string, cabeceras: Record<string, string>) => {
      const req = peticion(ip, cabeceras);
      usarOrigenDeCloudflare(req, {} as Response, () => undefined);
      return req.ip;
    };

    it('reconoce las direcciones de Cloudflare (IPv4, IPv6 y la IPv4 escrita como IPv6) y no las demás', () => {
      expect(esDeCloudflare('162.158.1.10')).toBe(true);
      expect(esDeCloudflare('172.69.0.1')).toBe(true);
      expect(esDeCloudflare('2606:4700::1')).toBe(true);
      expect(esDeCloudflare('::ffff:104.16.0.1')).toBe(true);
      expect(esDeCloudflare('203.0.113.9')).toBe(false);
      expect(esDeCloudflare('10.0.1.5')).toBe(false);
      expect(esDeCloudflare('no-es-una-ip')).toBe(false);
      expect(esDeCloudflare(undefined)).toBe(false);
    });

    it('si la conexión vino de Cloudflare, el origen es la dirección que Cloudflare declara', () => {
      expect(origenTras('162.158.1.10', { 'cf-connecting-ip': '190.1.2.3' })).toBe('190.1.2.3');
      expect(origenTras('2606:4700::1', { 'cf-connecting-ip': '2800:484::1' })).toBe('2800:484::1');
    });

    it('si NO vino de Cloudflare, el encabezado se ignora: nadie elige su origen escribiéndolo', () => {
      expect(origenTras('203.0.113.9', { 'cf-connecting-ip': '1.1.1.1' })).toBe('203.0.113.9');
      expect(origenTras('172.18.0.5', { 'cf-connecting-ip': '1.1.1.1' })).toBe('172.18.0.5');
    });

    it('sin encabezado, o con basura en él, se queda con la dirección de la conexión', () => {
      expect(origenTras('162.158.1.10', {})).toBe('162.158.1.10');
      expect(origenTras('162.158.1.10', { 'cf-connecting-ip': 'no-es-una-ip' })).toBe('162.158.1.10');
    });

    it('en producción se confía en un salto (Traefik); fuera de producción, en ninguno; y se puede configurar', () => {
      expect(saltosDeProxy({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(1);
      expect(saltosDeProxy({} as NodeJS.ProcessEnv)).toBe(0);
      expect(saltosDeProxy({ NODE_ENV: 'production', PROXY_CONFIABLES: '2' } as NodeJS.ProcessEnv)).toBe(2);
      expect(saltosDeProxy({ NODE_ENV: 'production', PROXY_CONFIABLES: '0' } as NodeJS.ProcessEnv)).toBe(0);
      expect(saltosDeProxy({ NODE_ENV: 'production', PROXY_CONFIABLES: 'basura' } as NodeJS.ProcessEnv)).toBe(1);
      // El compose de producción reenvía la variable vacía cuando no se define: debe valer lo mismo que no estar.
      expect(saltosDeProxy({ NODE_ENV: 'production', PROXY_CONFIABLES: '' } as NodeJS.ProcessEnv)).toBe(1);
      expect(saltosDeProxy({ NODE_ENV: 'production', PROXY_CONFIABLES: '  ' } as NodeJS.ProcessEnv)).toBe(1);
    });
  });
});
