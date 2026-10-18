import 'package:shared_preferences/shared_preferences.dart';

/// Dónde se guardan, en el dispositivo, el token de la sesión y las
/// preferencias de arranque. El token es opaco, vence a los 7 días y se revoca
/// en el servidor al cerrar sesión (ADR-0013); aun así, quien tenga acceso al
/// dispositivo desbloqueado podría leerlo (riesgo igual al de la vitrina, que
/// lo guarda en `localStorage`).
abstract class AlmacenLocal {
  Future<String?> leer(String clave);
  Future<void> escribir(String clave, String valor);
  Future<void> borrar(String clave);
}

/// Para pruebas y para cuando no hay dónde guardar: se pierde al cerrar la app.
class AlmacenMemoria implements AlmacenLocal {
  AlmacenMemoria([Map<String, String>? inicial]) : _datos = {...?inicial};

  final Map<String, String> _datos;

  @override
  Future<String?> leer(String clave) async => _datos[clave];

  @override
  Future<void> escribir(String clave, String valor) async => _datos[clave] = valor;

  @override
  Future<void> borrar(String clave) async => _datos.remove(clave);
}

/// `SharedPreferences`: `localStorage` en web y preferencias del sistema en
/// Android e iOS. Si el almacenamiento falla, la app sigue funcionando sin
/// recordar la sesión.
class AlmacenPreferencias implements AlmacenLocal {
  Future<SharedPreferences?> _abrir() async {
    try {
      return await SharedPreferences.getInstance();
    } catch (_) {
      return null;
    }
  }

  @override
  Future<String?> leer(String clave) async => (await _abrir())?.getString(clave);

  @override
  Future<void> escribir(String clave, String valor) async {
    await (await _abrir())?.setString(clave, valor);
  }

  @override
  Future<void> borrar(String clave) async {
    await (await _abrir())?.remove(clave);
  }
}
