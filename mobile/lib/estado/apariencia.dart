import 'package:flutter/material.dart';

import 'almacen_local.dart';

/// Apariencia elegida en Perfil: Sistema, Claro u Oscuro. Se recuerda en el
/// dispositivo; por omisión sigue al sistema.
class AparienciaApp extends ValueNotifier<ThemeMode> {
  AparienciaApp({this.almacen, ThemeMode inicial = ThemeMode.system}) : super(inicial);

  final AlmacenLocal? almacen;

  static const _clave = 'recobra.apariencia';

  Future<void> restaurar() async {
    final guardada = await almacen?.leer(_clave);
    final modo = ThemeMode.values.where((m) => m.name == guardada);
    if (modo.isNotEmpty) value = modo.first;
  }

  Future<void> elegir(ThemeMode modo) async {
    value = modo;
    await almacen?.escribir(_clave, modo.name);
  }
}

class AlcanceApariencia extends InheritedNotifier<AparienciaApp> {
  const AlcanceApariencia({super.key, required AparienciaApp apariencia, required super.child})
      : super(notifier: apariencia);

  static AparienciaApp? de(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AlcanceApariencia>()?.notifier;
}
