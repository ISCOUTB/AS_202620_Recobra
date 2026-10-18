import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';

/// La foto y su miniatura, ya reducidas y sin los datos ocultos que traen las
/// fotos de celular (como la ubicación): se vuelven a codificar desde cero.
class FotoPreparada {
  const FotoPreparada({required this.completa, required this.miniatura});

  final Uint8List completa;

  /// De 24 px: es lo único que ve el público de un objeto encontrado (ADR-0023).
  final Uint8List miniatura;
}

enum OrigenFoto { galeria, camara }

/// Elegir una foto y dejarla lista para subir. Es una interfaz para que las
/// pruebas no abran el selector del sistema.
abstract class SelectorFoto {
  Future<FotoPreparada?> elegir(OrigenFoto origen);
}

const ladoMaximoFoto = 1280;
const ladoMaximoMiniatura = 24;

img.Image _reducir(img.Image imagen, int lado) {
  if (max(imagen.width, imagen.height) <= lado) return imagen;
  return imagen.width >= imagen.height ? img.copyResize(imagen, width: lado) : img.copyResize(imagen, height: lado);
}

/// Reduce, endereza según su orientación y vuelve a codificar como JPEG. Las
/// imágenes con transparencia se pintan sobre fondo blanco. Lanza
/// [FormatException] si los bytes no son una imagen que se pueda leer.
FotoPreparada prepararFotoDesdeBytes(Uint8List bytes) {
  final leida = img.decodeImage(bytes);
  if (leida == null) throw const FormatException('No se pudo leer esa imagen. Prueba con una foto JPG o PNG.');
  var imagen = img.bakeOrientation(leida);
  if (imagen.numChannels == 4) {
    final fondo = img.Image(width: imagen.width, height: imagen.height, numChannels: 3)
      ..clear(img.ColorRgb8(255, 255, 255));
    imagen = img.compositeImage(fondo, imagen);
  }
  return FotoPreparada(
    completa: Uint8List.fromList(img.encodeJpg(_reducir(imagen, ladoMaximoFoto), quality: 80)),
    miniatura: Uint8List.fromList(img.encodeJpg(_reducir(imagen, ladoMaximoMiniatura), quality: 50)),
  );
}

/// Selector real: la galería o la cámara del dispositivo (en web, el selector de archivos).
class SelectorFotoDispositivo implements SelectorFoto {
  final _picker = ImagePicker();

  @override
  Future<FotoPreparada?> elegir(OrigenFoto origen) async {
    final archivo = await _picker.pickImage(
      source: origen == OrigenFoto.camara ? ImageSource.camera : ImageSource.gallery,
      maxWidth: 1600,
      maxHeight: 1600,
      imageQuality: 85,
    );
    if (archivo == null) return null;
    return compute(prepararFotoDesdeBytes, await archivo.readAsBytes());
  }
}
