import 'dart:async';

import 'package:flutter/widgets.dart';

import '../api/recobra_api.dart';
import 'sesion.dart';

/// Bandeja de avisos compartida por la campana y la tarjeta destacada de
/// Inicio (escenario S3, ADR-0015). Mientras hay sesión, consulta cada 20 s.
class AvisosApp extends ChangeNotifier {
  AvisosApp(this._sesion) {
    _sesion.addListener(_alCambiarSesion);
    _alCambiarSesion();
  }

  static const intervalo = Duration(seconds: 20);

  final SesionApp _sesion;
  Timer? _temporizador;
  BandejaAvisos bandeja = BandejaAvisos.vacia;

  /// El aviso de coincidencia más reciente sin leer, para destacarlo en Inicio.
  Notificacion? get coincidenciaSinLeer {
    for (final n in bandeja.notificaciones) {
      if (n.tipo == 'coincidencia' && !n.leida) return n;
    }
    return null;
  }

  void _alCambiarSesion() {
    _temporizador?.cancel();
    _temporizador = null;
    if (!_sesion.activa) {
      bandeja = BandejaAvisos.vacia;
      notifyListeners();
      return;
    }
    _temporizador = Timer.periodic(intervalo, (_) => cargar());
    cargar();
  }

  Future<void> cargar() async {
    if (!_sesion.activa) return;
    try {
      bandeja = await _sesion.api.notificaciones();
      notifyListeners();
    } catch (e) {
      // Un fallo de los avisos no debe estorbar el resto de la app (S4a).
      _sesion.revisarError(e);
    }
  }

  Future<void> marcarLeida(Notificacion aviso) async {
    if (aviso.leida) return;
    try {
      await _sesion.api.marcarLeida(aviso.id);
    } catch (e) {
      _sesion.revisarError(e);
    }
    await cargar();
  }

  Future<void> marcarTodas() async {
    try {
      await _sesion.api.marcarTodasLeidas();
    } catch (e) {
      _sesion.revisarError(e);
    }
    await cargar();
  }

  @override
  void dispose() {
    _temporizador?.cancel();
    _sesion.removeListener(_alCambiarSesion);
    super.dispose();
  }
}

class AlcanceAvisos extends InheritedNotifier<AvisosApp> {
  const AlcanceAvisos({super.key, required AvisosApp avisos, required super.child}) : super(notifier: avisos);

  static AvisosApp de(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AlcanceAvisos>()!.notifier!;
}
