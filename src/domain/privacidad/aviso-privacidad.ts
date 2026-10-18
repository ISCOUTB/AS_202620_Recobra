/**
 * Aviso de privacidad de Recobra (ADR-0021). Es la única fuente del texto: la
 * API lo sirve en `GET /privacidad` y la vitrina y la app lo muestran, así
 * nunca dicen cosas distintas. Debe describir lo que el sistema hace de verdad;
 * si cambia el tratamiento de datos, cambia aquí y sube la versión.
 *
 * Borrador del equipo (proyecto académico de la UTB): pendiente de revisión por
 * quien corresponda en la universidad antes de un uso institucional (Ley 1581
 * de 2012 y Decreto 1377 de 2013).
 */
export const VERSION_AVISO_PRIVACIDAD = '2026-10-18';

export interface SeccionAviso {
  titulo: string;
  texto: string;
}

export interface AvisoPrivacidad {
  version: string;
  titulo: string;
  secciones: SeccionAviso[];
}

/** Días que se guardan los avisos antes de borrarse solos. */
export const DIAS_RETENCION_AVISOS = 90;

export function avisoDePrivacidad(contacto: string): AvisoPrivacidad {
  return {
    version: VERSION_AVISO_PRIVACIDAD,
    titulo: 'Aviso de privacidad de Recobra',
    secciones: [
      {
        titulo: 'Quién trata tus datos',
        texto:
          'Recobra es un proyecto académico del curso de Arquitectura de Software de la Universidad Tecnológica de Bolívar, ' +
          `hecho por estudiantes. El responsable del tratamiento es el equipo del proyecto. Contacto: ${contacto}.`,
      },
      {
        titulo: 'Qué datos guardamos',
        texto:
          'Tu correo institucional y tu nombre; tu contraseña, solo como un resumen cifrado (nunca la contraseña); ' +
          'lo que publicas (descripción, categoría, lugar y fechas); las pruebas que escribes al reclamar un objeto; ' +
          'los reportes que haces de una publicación; ' +
          'los avisos que te generamos; y un identificador de tu sesión (también cifrado). ' +
          'No guardamos tu ubicación, tus contactos ni fotos.',
      },
      {
        titulo: 'Para qué los usamos',
        texto:
          'Solo para que el servicio funcione: publicar, buscar, comparar lo perdido con lo encontrado, verificar quién ' +
          'reclama un objeto y avisarte. No los vendemos, no los usamos para publicidad y no los compartimos con terceros.',
      },
      {
        titulo: 'Quién ve qué',
        texto:
          'Las publicaciones las puede ver cualquier persona, sin cuenta (descripción, lugar, fecha y estado), pero no tu ' +
          'nombre ni tu correo. Tu nombre y tu correo solo los ve la otra persona cuando se aprueba una entrega entre ' +
          'ustedes. La prueba que escribes al reclamar solo la ve quien publicó el objeto.',
      },
      {
        titulo: 'Cuánto tiempo los guardamos',
        texto:
          'Tu cuenta, mientras la tengas. Las sesiones duran 7 días. Los avisos se borran a los ' +
          `${DIAS_RETENCION_AVISOS} días. Una publicación sin movimiento se cierra sola a los 60 días. Las publicaciones ` +
          'cerradas o entregadas se conservan sin tus datos personales, solo para el historial. Si eliminas tu cuenta, ' +
          'borramos tus avisos y tus sesiones, y quitamos tu nombre, tu correo y el texto de tus pruebas y reportes.',
      },
      {
        titulo: 'Tus derechos',
        texto:
          'Puedes conocer qué datos tenemos de ti (botón "Descargar mis datos"), pedir que se corrijan, revocar tu ' +
          'autorización y pedir que se supriman (botón "Eliminar mi cuenta"), según la Ley 1581 de 2012. Para corregir un ' +
          'dato o resolver una duda, escríbenos al contacto de arriba. Para eliminar la cuenta no debes tener ' +
          'reclamaciones ni entregas en curso, para no dejar a otra persona esperando.',
      },
      {
        titulo: 'Cómo los protegemos',
        texto:
          'La conexión va cifrada (HTTPS), las contraseñas y las sesiones se guardan solo como resúmenes cifrados, ' +
          'y los accesos se limitan por cuenta. Aun así es un proyecto académico: no ofrece garantías de disponibilidad ' +
          'ni de seguridad de un servicio comercial.',
      },
      {
        titulo: 'Cambios en este aviso',
        texto:
          `Si cambia, subimos la versión (esta es la ${VERSION_AVISO_PRIVACIDAD}) y te lo mostramos al crear una cuenta nueva.`,
      },
    ],
  };
}
