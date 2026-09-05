import 'dart:convert';

import 'package:http/http.dart' as http;

class Publicacion {
  Publicacion({
    required this.id,
    required this.tipo,
    required this.descripcion,
    required this.categoria,
    required this.ubicacion,
    required this.estado,
    required this.creadoEn,
  });

  final String id;
  final String tipo;
  final String descripcion;
  final String categoria;
  final String ubicacion;
  final String estado;
  final String creadoEn;

  factory Publicacion.fromJson(Map<String, dynamic> json) {
    return Publicacion(
      id: json['id'] as String,
      tipo: json['tipo'] as String,
      descripcion: json['descripcion'] as String,
      categoria: json['categoria'] as String,
      ubicacion: json['ubicacion'] as String,
      estado: json['estado'] as String,
      creadoEn: json['creadoEn'] as String,
    );
  }
}

class RecobraApiException implements Exception {
  RecobraApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Cliente HTTP del corte vertical. La URL base se inyecta para poder
/// apuntar a emulador Android (`10.0.2.2`), iOS/web (`localhost`) o un host remoto.
class RecobraApi {
  RecobraApi({required this.baseUrl, http.Client? client})
      : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Future<Publicacion> crearPublicacion({
    required String tipo,
    required String descripcion,
    required String categoria,
    required String ubicacion,
  }) async {
    final response = await _client.post(
      _uri('/publicaciones'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'tipo': tipo,
        'descripcion': descripcion,
        'categoria': categoria,
        'ubicacion': ubicacion,
      }),
    );

    if (response.statusCode != 201) {
      throw RecobraApiException(
        _extractError(response.body) ?? 'No se pudo crear la publicación',
        statusCode: response.statusCode,
      );
    }

    return Publicacion.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  Future<Publicacion> consultarPublicacion(String id) async {
    final response = await _client.get(_uri('/publicaciones/$id'));

    if (response.statusCode == 404) {
      throw RecobraApiException(
        'Publicación no encontrada',
        statusCode: 404,
      );
    }

    if (response.statusCode != 200) {
      throw RecobraApiException(
        _extractError(response.body) ?? 'No se pudo consultar la publicación',
        statusCode: response.statusCode,
      );
    }

    return Publicacion.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  String? _extractError(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        return decoded['error'] as String? ?? decoded['message'] as String?;
      }
    } catch (_) {
      return null;
    }
    return null;
  }
}
