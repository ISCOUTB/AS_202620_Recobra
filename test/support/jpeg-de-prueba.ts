/**
 * Arma un JPEG mínimo (solo la estructura de segmentos, sin imagen decodificable)
 * para probar la validación de fotos sin depender de archivos ni de librerías.
 */
export interface OpcionesJpeg {
  ancho: number;
  alto: number;
  /** Agrega un segmento EXIF con este texto (por ejemplo, unas coordenadas de mentira). */
  exif?: string;
  /** Agrega un comentario. */
  comentario?: string;
  /** Bytes de relleno en los datos de la imagen, para probar el límite de peso. */
  relleno?: number;
}

function segmento(marcador: number, carga: Buffer): Buffer {
  const cabecera = Buffer.alloc(4);
  cabecera.writeUInt8(0xff, 0);
  cabecera.writeUInt8(marcador, 1);
  cabecera.writeUInt16BE(carga.length + 2, 2);
  return Buffer.concat([cabecera, carga]);
}

export function jpegDePrueba({ ancho, alto, exif, comentario, relleno = 0 }: OpcionesJpeg): Buffer {
  const medidas = Buffer.alloc(6);
  medidas.writeUInt8(8, 0);
  medidas.writeUInt16BE(alto, 1);
  medidas.writeUInt16BE(ancho, 3);
  medidas.writeUInt8(0, 5);
  const sof = Buffer.concat([medidas.subarray(0, 5), Buffer.from([1, 1, 0x11, 0])]);

  const partes: Buffer[] = [
    Buffer.from([0xff, 0xd8]),
    segmento(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
  ];
  if (exif) partes.push(segmento(0xe1, Buffer.from(`Exif\0\0${exif}`, 'latin1')));
  if (comentario) partes.push(segmento(0xfe, Buffer.from(comentario, 'latin1')));
  partes.push(segmento(0xc0, sof));
  partes.push(segmento(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])));
  // Datos de imagen: sin 0xFF para no parecer marcadores.
  partes.push(Buffer.alloc(8 + relleno, 0x11));
  partes.push(Buffer.from([0xff, 0xd9]));
  return Buffer.concat(partes);
}
