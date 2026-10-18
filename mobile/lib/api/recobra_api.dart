import 'dart:async';
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
    this.autorId,
    this.detalleUbicacion,
    this.motivoCierre,
    this.custodia,
    this.puntoCustodia,
  });

  final String id;
  final String tipo;
  final String descripcion;
  final String categoria;
  final String ubicacion;

  /// Piso, salón o referencia dentro del lugar ("Piso 2 · Salón 204").
  final String? detalleUbicacion;

  /// recuperado · retirado · vencido; solo en publicaciones cerradas (ADR-0017).
  final String? motivoCierre;

  /// Solo encontrados: quien_lo_encontro o punto_de_entrega (ADR-0019).
  final String? custodia;
  final String? puntoCustodia;

  /// "Bloque A1 · Piso 2 · Salón 204", o solo el lugar si no hay detalle.
  String get lugarCompleto => detalleUbicacion == null ? ubicacion : '$ubicacion · $detalleUbicacion';

  /// publicado · en_verificacion · reclamado (ciclo de vida, ADR-0014).
  final String estado;
  final String creadoEn;

  /// Cuenta que la publicó; null en publicaciones anteriores a las cuentas.
  final String? autorId;

  factory Publicacion.fromJson(Map<String, dynamic> json) {
    return Publicacion(
      id: json['id'] as String,
      tipo: json['tipo'] as String,
      descripcion: json['descripcion'] as String,
      categoria: json['categoria'] as String,
      ubicacion: json['ubicacion'] as String,
      estado: json['estado'] as String,
      creadoEn: json['creadoEn'] as String,
      autorId: json['autorId'] as String?,
      detalleUbicacion: json['detalleUbicacion'] as String?,
      motivoCierre: json['motivoCierre'] as String?,
      custodia: json['custodia'] as String?,
      puntoCustodia: json['puntoCustodia'] as String?,
    );
  }
}

/// Lugar del campus con sus pisos (submenú), de `GET /lugares`.
class LugarCampus {
  const LugarCampus(this.nombre, this.niveles);

  final String nombre;
  final List<String> niveles;

  factory LugarCampus.fromJson(Map<String, dynamic> json) =>
      LugarCampus(json['nombre'] as String, (json['niveles'] as List<dynamic>).cast<String>());
}

class Coincidencia {
  Coincidencia({
    required this.id,
    required this.publicacionOrigenId,
    required this.publicacionCoincidenteId,
    required this.score,
  });

  final String id;
  final String publicacionOrigenId;
  final String publicacionCoincidenteId;
  final double score;

  factory Coincidencia.fromJson(Map<String, dynamic> json) {
    return Coincidencia(
      id: json['id'] as String,
      publicacionOrigenId: json['publicacionOrigenId'] as String,
      publicacionCoincidenteId: json['publicacionCoincidenteId'] as String,
      score: (json['score'] as num).toDouble(),
    );
  }
}

class SeccionAviso {
  const SeccionAviso(this.titulo, this.texto);

  final String titulo;
  final String texto;
}

/// Aviso de privacidad versionado que sirve la API.
class AvisoPrivacidad {
  const AvisoPrivacidad({required this.version, required this.secciones});

  final String version;
  final List<SeccionAviso> secciones;

  factory AvisoPrivacidad.fromJson(Map<String, dynamic> json) => AvisoPrivacidad(
        version: json['version'] as String,
        secciones: (json['secciones'] as List<dynamic>)
            .map((e) => SeccionAviso((e as Map<String, dynamic>)['titulo'] as String, e['texto'] as String))
            .toList(),
      );
}

class Cuenta {
  Cuenta({required this.id, required this.correo, required this.nombre});

  final String id;
  final String correo;
  final String nombre;

  factory Cuenta.fromJson(Map<String, dynamic> json) =>
      Cuenta(id: json['id'] as String, correo: json['correo'] as String, nombre: json['nombre'] as String);
}

/// Reclamación vista por quien publicó el objeto: el correo solo llega si se aprobó.
class ReclamacionParaAutor {
  ReclamacionParaAutor({
    required this.id,
    required this.estado,
    required this.prueba,
    required this.reclamanteNombre,
    this.reclamanteCorreo,
    this.motivoRechazo,
    this.entregadaEn,
  });

  final String id;
  final String estado;
  final String prueba;
  final String reclamanteNombre;
  final String? reclamanteCorreo;
  final String? motivoRechazo;

  /// Cuándo se confirmó la entrega; null si todavía no (ADR-0017).
  final String? entregadaEn;

  factory ReclamacionParaAutor.fromJson(Map<String, dynamic> json) {
    final reclamante = json['reclamante'] as Map<String, dynamic>;
    return ReclamacionParaAutor(
      id: json['id'] as String,
      estado: json['estado'] as String,
      prueba: json['prueba'] as String,
      reclamanteNombre: reclamante['nombre'] as String,
      reclamanteCorreo: reclamante['correo'] as String?,
      motivoRechazo: json['motivoRechazo'] as String?,
      entregadaEn: json['entregadaEn'] as String?,
    );
  }
}

/// Reclamación vista por quien la hizo: el contacto llega solo si se aprobó.
class ReclamacionPropia {
  ReclamacionPropia({
    required this.id,
    required this.publicacionId,
    required this.estado,
    required this.creadoEn,
    this.motivoRechazo,
    this.contactoNombre,
    this.contactoCorreo,
    this.entregadaEn,
  });

  final String id;
  final String publicacionId;
  final String estado;
  final String creadoEn;
  final String? motivoRechazo;
  final String? contactoNombre;
  final String? contactoCorreo;
  final String? entregadaEn;

  factory ReclamacionPropia.fromJson(Map<String, dynamic> json) {
    final contacto = json['contactoQuienEncontro'] as Map<String, dynamic>?;
    return ReclamacionPropia(
      id: json['id'] as String,
      publicacionId: json['publicacionId'] as String,
      estado: json['estado'] as String,
      creadoEn: json['creadoEn'] as String,
      motivoRechazo: json['motivoRechazo'] as String?,
      contactoNombre: contacto?['nombre'] as String?,
      contactoCorreo: contacto?['correo'] as String?,
      entregadaEn: json['entregadaEn'] as String?,
    );
  }
}

/// Aviso de la bandeja (ADR-0015): coincidencia con algo que perdiste o
/// novedades de una reclamación.
class Notificacion {
  Notificacion({
    required this.id,
    required this.tipo,
    required this.titulo,
    required this.mensaje,
    required this.publicacionId,
    required this.leida,
    required this.creadoEn,
  });

  final String id;

  /// coincidencia, reclamacion_nueva, reclamacion_aprobada o reclamacion_rechazada.
  final String tipo;
  final String titulo;
  final String mensaje;
  final String publicacionId;
  final bool leida;
  final String creadoEn;

  factory Notificacion.fromJson(Map<String, dynamic> json) => Notificacion(
        id: json['id'] as String,
        tipo: json['tipo'] as String,
        titulo: json['titulo'] as String,
        mensaje: json['mensaje'] as String,
        publicacionId: json['publicacionId'] as String,
        leida: json['leida'] as bool,
        creadoEn: json['creadoEn'] as String,
      );
}

class BandejaAvisos {
  const BandejaAvisos({required this.noLeidas, required this.notificaciones});

  static const vacia = BandejaAvisos(noLeidas: 0, notificaciones: []);

  final int noLeidas;
  final List<Notificacion> notificaciones;
}

class RecobraApiException implements Exception {
  RecobraApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  /// La sesión falta o venció: la interfaz debe volver a pedir inicio de sesión.
  bool get sinSesion => statusCode == 401;

  @override
  String toString() => message;
}

/// Cliente HTTP de la API de Recobra (contrato 5.0.0). La URL base se inyecta
/// para poder apuntar a emulador, web o el despliegue. El token de sesión se
/// guarda solo en memoria: al cerrar la app hay que volver a iniciar sesión.
class RecobraApi {
  RecobraApi({required this.baseUrl, http.Client? client}) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  /// Token opaco de la sesión actual (ADR-0013); null si no hay sesión.
  String? token;

  /// Tiempo máximo de espera de cada petición ("responde tarde"; ver
  /// docs/modos-de-fallo.md).
  static const tiempoMaximo = Duration(seconds: 10);

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$baseUrl$path').replace(queryParameters: query);

  Map<String, String> _cabeceras({bool json = false, Map<String, String>? extra}) => {
        if (json) 'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
        ...?extra,
      };

  Future<http.Response> _enviar(Future<http.Response> peticion) async {
    try {
      return await peticion.timeout(tiempoMaximo);
    } on TimeoutException {
      throw RecobraApiException('El servidor tardó demasiado. Puedes reintentar.');
    }
  }

  dynamic _cuerpoO(http.Response r, Set<int> esperados, String porDefecto) {
    if (!esperados.contains(r.statusCode)) {
      throw RecobraApiException(_extractError(r.body) ?? porDefecto, statusCode: r.statusCode);
    }
    return r.body.isEmpty ? null : jsonDecode(r.body);
  }

  // ---------------- Identidad ----------------

  /// Crear la cuenta exige aceptar el aviso de privacidad (ADR-0021).
  Future<Cuenta> registrar({
    required String correo,
    required String nombre,
    required String contrasena,
    required bool aceptoPrivacidad,
  }) async {
    final r = await _enviar(_client.post(
      _uri('/cuentas'),
      headers: _cabeceras(json: true),
      body: jsonEncode({
        'correo': correo,
        'nombre': nombre,
        'contrasena': contrasena,
        'aceptoPrivacidad': aceptoPrivacidad,
      }),
    ));
    return Cuenta.fromJson(_cuerpoO(r, {201}, 'No se pudo crear la cuenta') as Map<String, dynamic>);
  }

  /// Inicia sesión y deja el token listo para las siguientes peticiones.
  Future<Cuenta> iniciarSesion({required String correo, required String contrasena}) async {
    final r = await _enviar(_client.post(
      _uri('/sesiones'),
      headers: _cabeceras(json: true),
      body: jsonEncode({'correo': correo, 'contrasena': contrasena}),
    ));
    final cuerpo = _cuerpoO(r, {201}, 'No se pudo iniciar sesión') as Map<String, dynamic>;
    token = cuerpo['token'] as String;
    return Cuenta.fromJson(cuerpo['cuenta'] as Map<String, dynamic>);
  }

  /// El aviso de privacidad vigente (público).
  Future<AvisoPrivacidad> avisoPrivacidad() async {
    final r = await _enviar(_client.get(_uri('/privacidad')));
    return AvisoPrivacidad.fromJson(_cuerpoO(r, {200}, 'No se pudo cargar el aviso') as Map<String, dynamic>);
  }

  /// Todo lo que Recobra guarda de la cuenta, como texto JSON con sangría.
  Future<String> misDatos() async {
    final r = await _enviar(_client.get(_uri('/cuentas/yo/datos'), headers: _cabeceras()));
    final datos = _cuerpoO(r, {200}, 'No se pudieron cargar tus datos');
    return const JsonEncoder.withIndent('  ').convert(datos);
  }

  /// Elimina la cuenta (pide la contraseña); falla con 409 si hay algo en curso.
  Future<void> eliminarCuenta(String contrasena) async {
    final r = await _enviar(_client.delete(
      _uri('/cuentas/yo'),
      headers: _cabeceras(json: true),
      body: jsonEncode({'contrasena': contrasena}),
    ));
    _cuerpoO(r, {204}, 'No se pudo eliminar la cuenta');
    token = null;
  }

  /// La cuenta de la sesión actual; falla con 401 si el token venció (se usa al restaurar la sesión).
  Future<Cuenta> miCuenta() async {
    final r = await _enviar(_client.get(_uri('/cuentas/yo'), headers: _cabeceras()));
    return Cuenta.fromJson(_cuerpoO(r, {200}, 'No se pudo comprobar la sesión') as Map<String, dynamic>);
  }

  Future<void> cerrarSesion() async {
    if (token == null) return;
    try {
      await _enviar(_client.delete(_uri('/sesiones'), headers: _cabeceras()));
    } finally {
      token = null;
    }
  }

  // ---------------- Publicaciones ----------------

  Future<List<Publicacion>> buscarPublicaciones({String? tipo, String? categoria, String? ubicacion}) async {
    final query = <String, String>{
      'limite': '30',
      if (tipo != null) 'tipo': tipo,
      if (categoria != null && categoria.isNotEmpty) 'categoria': categoria,
      if (ubicacion != null && ubicacion.trim().isNotEmpty) 'ubicacion': ubicacion.trim(),
    };
    final r = await _enviar(_client.get(_uri('/publicaciones', query)));
    final lista = _cuerpoO(r, {200}, 'No se pudo cargar la lista') as List<dynamic>;
    return lista.map((e) => Publicacion.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Con [claveIdempotencia], reintentar la misma creación no la duplica: el
  /// backend responde 200 con la publicación original. Exige sesión.
  Future<Publicacion> crearPublicacion({
    required String tipo,
    required String descripcion,
    required String categoria,
    required String ubicacion,
    String? detalleUbicacion,
    String? custodia,
    String? puntoCustodia,
    String? claveIdempotencia,
  }) async {
    final r = await _enviar(_client.post(
      _uri('/publicaciones'),
      headers: _cabeceras(
        json: true,
        extra: {if (claveIdempotencia != null) 'Idempotency-Key': claveIdempotencia},
      ),
      body: jsonEncode({
        'tipo': tipo,
        'descripcion': descripcion,
        'categoria': categoria,
        'ubicacion': ubicacion,
        if (detalleUbicacion != null && detalleUbicacion.isNotEmpty) 'detalleUbicacion': detalleUbicacion,
        if (custodia != null) 'custodia': custodia,
        if (custodia == 'punto_de_entrega') 'puntoCustodia': puntoCustodia,
      }),
    ));
    return Publicacion.fromJson(_cuerpoO(r, {201, 200}, 'No se pudo crear la publicación') as Map<String, dynamic>);
  }

  /// Quien encontró el objeto dice dónde está ahora (ADR-0019).
  Future<Publicacion> cambiarCustodia(String id, String custodia, String? puntoCustodia) async {
    final r = await _enviar(_client.post(
      _uri('/publicaciones/$id/custodia'),
      headers: _cabeceras(json: true),
      body: jsonEncode({'custodia': custodia, if (custodia == 'punto_de_entrega') 'puntoCustodia': puntoCustodia}),
    ));
    return Publicacion.fromJson(_cuerpoO(r, {200}, 'No se pudo actualizar') as Map<String, dynamic>);
  }

  /// "Lo tengo yo" sobre un objeto perdido: crea el encontrado enlazado (ADR-0019).
  Future<Publicacion> reportarHallazgo(
    String perdidoId, {
    required String descripcion,
    required String ubicacion,
    String? detalleUbicacion,
    String custodia = 'quien_lo_encontro',
    String? puntoCustodia,
  }) async {
    final r = await _enviar(_client.post(
      _uri('/publicaciones/$perdidoId/lo-tengo'),
      headers: _cabeceras(json: true),
      body: jsonEncode({
        'descripcion': descripcion,
        'ubicacion': ubicacion,
        if (detalleUbicacion != null && detalleUbicacion.isNotEmpty) 'detalleUbicacion': detalleUbicacion,
        'custodia': custodia,
        if (custodia == 'punto_de_entrega') 'puntoCustodia': puntoCustodia,
      }),
    ));
    return Publicacion.fromJson(_cuerpoO(r, {201}, 'No se pudo avisar') as Map<String, dynamic>);
  }

  /// Catálogo de lugares con sus pisos; es la misma lista para la app y la vitrina.
  Future<List<LugarCampus>> lugares() async {
    final r = await _enviar(_client.get(_uri('/lugares')));
    final lista = _cuerpoO(r, {200}, 'No se pudieron cargar los lugares') as List<dynamic>;
    return lista.map((e) => LugarCampus.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Publicacion> consultarPublicacion(String id) async {
    final r = await _enviar(_client.get(_uri('/publicaciones/$id')));
    if (r.statusCode == 404) throw RecobraApiException('Publicación no encontrada', statusCode: 404);
    return Publicacion.fromJson(_cuerpoO(r, {200}, 'No se pudo consultar la publicación') as Map<String, dynamic>);
  }

  Future<List<Publicacion>> misPublicaciones() async {
    final r = await _enviar(_client.get(_uri('/publicaciones/mias'), headers: _cabeceras()));
    final lista = _cuerpoO(r, {200}, 'No se pudieron cargar tus publicaciones') as List<dynamic>;
    return lista.map((e) => Publicacion.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Coincidencia>> listarCoincidencias(String publicacionId) async {
    final response = await _enviar(_client.get(_uri('/coincidencias', {'publicacionId': publicacionId})));
    if (response.statusCode != 200) return const [];
    final decoded = jsonDecode(response.body);
    if (decoded is! List) return const [];
    return decoded.map((item) => Coincidencia.fromJson(item as Map<String, dynamic>)).toList();
  }

  // ---------------- Reclamaciones ----------------

  Future<void> reclamar(String publicacionId, String prueba) async {
    final r = await _enviar(_client.post(
      _uri('/publicaciones/$publicacionId/reclamaciones'),
      headers: _cabeceras(json: true),
      body: jsonEncode({'prueba': prueba}),
    ));
    _cuerpoO(r, {201}, 'No se pudo enviar la reclamación');
  }

  Future<List<ReclamacionParaAutor>> reclamacionesDe(String publicacionId) async {
    final r = await _enviar(_client.get(_uri('/publicaciones/$publicacionId/reclamaciones'), headers: _cabeceras()));
    final lista = _cuerpoO(r, {200}, 'No se pudieron cargar las reclamaciones') as List<dynamic>;
    return lista.map((e) => ReclamacionParaAutor.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ReclamacionPropia>> misReclamaciones() async {
    final r = await _enviar(_client.get(_uri('/reclamaciones/mias'), headers: _cabeceras()));
    final lista = _cuerpoO(r, {200}, 'No se pudieron cargar tus reclamaciones') as List<dynamic>;
    return lista.map((e) => ReclamacionPropia.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Confirmar la entrega: "lo recibí" o "lo entregué" (ADR-0017).
  Future<void> confirmarEntrega(String reclamacionId) async {
    final r = await _enviar(_client.post(_uri('/reclamaciones/$reclamacionId/entregada'), headers: _cabeceras()));
    _cuerpoO(r, {200}, 'No se pudo confirmar la entrega');
  }

  /// Cerrar una publicación propia: "recuperado" (solo perdidos) o "retirado".
  Future<Publicacion> cerrarPublicacion(String id, String motivo) async {
    final r = await _enviar(_client.post(
      _uri('/publicaciones/$id/cerrar'),
      headers: _cabeceras(json: true),
      body: jsonEncode({'motivo': motivo}),
    ));
    return Publicacion.fromJson(_cuerpoO(r, {200}, 'No se pudo cerrar la publicación') as Map<String, dynamic>);
  }

  Future<void> aprobar(String reclamacionId) async {
    final r = await _enviar(_client.post(_uri('/reclamaciones/$reclamacionId/aprobar'), headers: _cabeceras()));
    _cuerpoO(r, {200}, 'No se pudo aprobar');
  }

  Future<void> rechazar(String reclamacionId, String motivo) async {
    final r = await _enviar(_client.post(
      _uri('/reclamaciones/$reclamacionId/rechazar'),
      headers: _cabeceras(json: true),
      body: jsonEncode({'motivo': motivo}),
    ));
    _cuerpoO(r, {200}, 'No se pudo rechazar');
  }

  // ---------------- Avisos (ADR-0015) ----------------

  Future<BandejaAvisos> notificaciones() async {
    final r = await _enviar(_client.get(_uri('/notificaciones'), headers: _cabeceras()));
    final cuerpo = _cuerpoO(r, {200}, 'No se pudieron cargar los avisos') as Map<String, dynamic>;
    return BandejaAvisos(
      noLeidas: cuerpo['noLeidas'] as int,
      notificaciones: (cuerpo['notificaciones'] as List<dynamic>)
          .map((e) => Notificacion.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<void> marcarLeida(String notificacionId) async {
    final r = await _enviar(_client.post(_uri('/notificaciones/$notificacionId/leida'), headers: _cabeceras()));
    _cuerpoO(r, {204}, 'No se pudo marcar el aviso');
  }

  Future<void> marcarTodasLeidas() async {
    final r = await _enviar(_client.post(_uri('/notificaciones/leidas'), headers: _cabeceras()));
    _cuerpoO(r, {204}, 'No se pudieron marcar los avisos');
  }

  String? _extractError(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded['message'] as String?;
    } catch (_) {
      return null;
    }
    return null;
  }
}
