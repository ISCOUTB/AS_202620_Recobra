import 'package:flutter/widgets.dart';

import '../servicios/fotos.dart';

/// Da a las pantallas el selector de fotos (el del dispositivo, o uno falso en las pruebas).
class AlcanceFotos extends InheritedWidget {
  const AlcanceFotos({super.key, required this.selector, required super.child});

  final SelectorFoto selector;

  static SelectorFoto de(BuildContext context) {
    final alcance = context.dependOnInheritedWidgetOfExactType<AlcanceFotos>();
    assert(alcance != null, 'Falta un AlcanceFotos sobre este widget');
    return alcance!.selector;
  }

  @override
  bool updateShouldNotify(AlcanceFotos anterior) => selector != anterior.selector;
}
