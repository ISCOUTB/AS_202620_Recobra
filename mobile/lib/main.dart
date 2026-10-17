import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'api/recobra_api.dart';
import 'estado/sesion.dart';
import 'pantallas/inicio.dart';
import 'pantallas/mis_cosas.dart';
import 'pantallas/perfil.dart';
import 'pantallas/publicar.dart';
import 'tema/tema_utb.dart';
import 'widgets/comunes.dart';

/// Se puede sobrescribir en tiempo de compilación con
/// `--dart-define=API_BASE_URL=https://recobra.iscoutb.dev` para
/// apuntar al backend desplegado en vez de local (ver README, sección
/// Despliegue). Sin ese flag, usa localhost (desarrollo).
const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');

/// En web/desktop: localhost. En Android: 127.0.0.1 tras `adb reverse tcp:3000 tcp:3000`
/// (evita cleartext a 10.0.2.2, que Sonar marca como vulnerabilidad).
String defaultApiBaseUrl() {
  if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
  if (kIsWeb) return 'http://localhost:3000';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return 'http://127.0.0.1:3000';
    default:
      return 'http://localhost:3000';
  }
}

void main() {
  runApp(RecobraApp(api: RecobraApi(baseUrl: defaultApiBaseUrl())));
}

/// Aplicación con el estilo de la app UTB (tema oscuro, encabezados con
/// degradado azul y barra de navegación flotante).
class RecobraApp extends StatefulWidget {
  const RecobraApp({super.key, required this.api});

  final RecobraApi api;

  @override
  State<RecobraApp> createState() => _RecobraAppState();
}

class _RecobraAppState extends State<RecobraApp> {
  late final SesionApp _sesion = SesionApp(widget.api);

  @override
  void dispose() {
    _sesion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlcanceSesion(
      sesion: _sesion,
      child: MaterialApp(
        title: 'Recobra',
        debugShowCheckedModeBanner: false,
        theme: temaUtb(),
        home: const Navegacion(),
      ),
    );
  }
}

class Navegacion extends StatefulWidget {
  const Navegacion({super.key});

  @override
  State<Navegacion> createState() => _NavegacionState();
}

class _NavegacionState extends State<Navegacion> {
  int _indice = 0;
  final _inicio = GlobalKey<InicioPantallaState>();

  static const _elementos = [
    ElementoNavegacion(Icons.home_outlined, Icons.home, 'Inicio'),
    ElementoNavegacion(Icons.add_circle_outline, Icons.add_circle, 'Publicar'),
    ElementoNavegacion(Icons.inventory_2_outlined, Icons.inventory_2, 'Mis cosas'),
    ElementoNavegacion(Icons.person_outline, Icons.person, 'Perfil'),
  ];

  void _ir(int i) => setState(() => _indice = i);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: IndexedStack(
        index: _indice,
        children: [
          InicioPantalla(key: _inicio, alPedirCuenta: () => _ir(3)),
          PublicarPantalla(
            alPublicar: () {
              _inicio.currentState?.recargar();
              _ir(0);
            },
          ),
          const MisCosasPantalla(),
          const PerfilPantalla(),
        ],
      ),
      bottomNavigationBar: BarraNavegacionUtb(indice: _indice, alCambiar: _ir, elementos: _elementos),
    );
  }
}
