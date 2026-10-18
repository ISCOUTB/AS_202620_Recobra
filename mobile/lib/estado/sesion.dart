import 'package:flutter/widgets.dart';

import '../api/recobra_api.dart';
import 'almacen_local.dart';

/// Estado de la sesión compartido por todas las pantallas (ADR-0013). El token
/// se guarda en el dispositivo (`AlmacenLocal`) para no pedir la contraseña en
/// cada apertura: al abrir la app se restaura y se comprueba con el servidor.
/// También recuerda si ya se vio la bienvenida.
class SesionApp extends ChangeNotifier {
  SesionApp(this.api, {AlmacenLocal? almacen}) : _almacen = almacen ?? AlmacenMemoria();

  static const _claveToken = 'recobra.sesion.token';
  static const _claveBienvenida = 'recobra.bienvenida.vista';

  final RecobraApi api;
  final AlmacenLocal _almacen;
  Cuenta? cuenta;

  /// true mientras se lee lo guardado y se comprueba la sesión con el servidor.
  bool restaurando = true;
  bool bienvenidaVista = false;

  bool get activa => cuenta != null;

  /// Lee el token guardado y lo valida con `GET /cuentas/yo`. Si el servidor
  /// dice que venció, se olvida; si no responde, se queda sin sesión pero se
  /// conserva el token para reintentar en la próxima apertura.
  Future<void> restaurar() async {
    try {
      bienvenidaVista = await _almacen.leer(_claveBienvenida) == 'si';
      final token = await _almacen.leer(_claveToken);
      if (token != null) {
        api.token = token;
        try {
          cuenta = await api.miCuenta();
        } on RecobraApiException catch (e) {
          api.token = null;
          if (e.sinSesion) await _almacen.borrar(_claveToken);
        }
      }
    } catch (_) {
      api.token = null;
    } finally {
      restaurando = false;
      notifyListeners();
    }
  }

  Future<void> marcarBienvenidaVista() async {
    if (bienvenidaVista) return;
    bienvenidaVista = true;
    await _almacen.escribir(_claveBienvenida, 'si');
  }

  Future<void> entrar(String correo, String contrasena) async {
    cuenta = await api.iniciarSesion(correo: correo, contrasena: contrasena);
    final token = api.token;
    if (token != null) await _almacen.escribir(_claveToken, token);
    notifyListeners();
  }

  Future<void> registrarYEntrar(String nombre, String correo, String contrasena) async {
    await api.registrar(correo: correo, nombre: nombre, contrasena: contrasena);
    await entrar(correo, contrasena);
  }

  Future<void> salir() async {
    try {
      await api.cerrarSesion();
    } catch (_) {
      // Aunque el servidor no responda, la sesión local se cierra igual.
    }
    await _almacen.borrar(_claveToken);
    cuenta = null;
    notifyListeners();
  }

  /// Si la API dice que la sesión venció, se cierra localmente y se olvida el token.
  void revisarError(Object error) {
    if (error is RecobraApiException && error.sinSesion && activa) {
      api.token = null;
      cuenta = null;
      _almacen.borrar(_claveToken);
      notifyListeners();
    }
  }
}

class AlcanceSesion extends InheritedNotifier<SesionApp> {
  const AlcanceSesion({super.key, required SesionApp sesion, required super.child}) : super(notifier: sesion);

  static SesionApp de(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AlcanceSesion>()!.notifier!;
}
