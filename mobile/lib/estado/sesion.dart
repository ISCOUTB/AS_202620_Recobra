import 'package:flutter/widgets.dart';

import '../api/recobra_api.dart';

/// Estado de la sesión compartido por todas las pantallas (ADR-0013). El token
/// vive solo en memoria, dentro de [RecobraApi]: al cerrar la app hay que
/// volver a iniciar sesión.
class SesionApp extends ChangeNotifier {
  SesionApp(this.api);

  final RecobraApi api;
  Cuenta? cuenta;

  bool get activa => cuenta != null;

  Future<void> entrar(String correo, String contrasena) async {
    cuenta = await api.iniciarSesion(correo: correo, contrasena: contrasena);
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
    cuenta = null;
    notifyListeners();
  }

  /// Si la API dice que la sesión venció, se cierra localmente.
  void revisarError(Object error) {
    if (error is RecobraApiException && error.sinSesion && activa) {
      api.token = null;
      cuenta = null;
      notifyListeners();
    }
  }
}

class AlcanceSesion extends InheritedNotifier<SesionApp> {
  const AlcanceSesion({super.key, required SesionApp sesion, required super.child}) : super(notifier: sesion);

  static SesionApp de(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AlcanceSesion>()!.notifier!;
}
