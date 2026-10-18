import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'api/recobra_api.dart';
import 'estado/almacen_local.dart';
import 'estado/avisos.dart';
import 'estado/sesion.dart';
import 'pantallas/bienvenida.dart';
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

/// En web servida por la propia API (https://recobra.iscoutb.dev/app/): el
/// mismo origen. En web local y desktop: localhost. En Android: 127.0.0.1 tras
/// `adb reverse tcp:3000 tcp:3000` (evita cleartext a 10.0.2.2, que Sonar
/// marca como vulnerabilidad).
String defaultApiBaseUrl() {
  if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
  if (kIsWeb) {
    final host = Uri.base.host;
    final local = host == 'localhost' || host == '127.0.0.1';
    return local ? 'http://localhost:3000' : Uri.base.origin;
  }
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return 'http://127.0.0.1:3000';
    default:
      return 'http://localhost:3000';
  }
}

void main() {
  runApp(RecobraApp(api: RecobraApi(baseUrl: defaultApiBaseUrl()), almacen: AlmacenPreferencias()));
}

/// Aplicación con el estilo de la app UTB (tema oscuro, encabezados con
/// degradado azul y barra de navegación flotante).
class RecobraApp extends StatefulWidget {
  const RecobraApp({super.key, required this.api, this.almacen, this.mostrarBienvenida = true});

  final RecobraApi api;

  /// Dónde se guarda la sesión en el dispositivo; sin él, solo vive en memoria.
  final AlmacenLocal? almacen;

  /// Mostrar la bienvenida al abrir la app sin sesión (las pruebas la omiten).
  final bool mostrarBienvenida;

  @override
  State<RecobraApp> createState() => _RecobraAppState();
}

class _RecobraAppState extends State<RecobraApp> {
  late final SesionApp _sesion = SesionApp(widget.api, almacen: widget.almacen);
  late final AvisosApp _avisos = AvisosApp(_sesion);

  @override
  void initState() {
    super.initState();
    _sesion.restaurar();
  }

  @override
  void dispose() {
    _avisos.dispose();
    _sesion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlcanceSesion(
      sesion: _sesion,
      child: AlcanceAvisos(
        avisos: _avisos,
        child: MaterialApp(
          title: 'Recobra',
          debugShowCheckedModeBanner: false,
          theme: temaUtb(),
          home: Navegacion(mostrarBienvenida: widget.mostrarBienvenida),
        ),
      ),
    );
  }
}

class Navegacion extends StatefulWidget {
  const Navegacion({super.key, this.mostrarBienvenida = false});

  final bool mostrarBienvenida;

  @override
  State<Navegacion> createState() => _NavegacionState();
}

class _NavegacionState extends State<Navegacion> {
  static const _inicio = 0;
  static const _publicar = 1;
  static const _misCosas = 2;
  static const _perfil = 3;

  int _indice = _inicio;
  bool _bienvenidaTerminada = false;
  bool _registroPrimero = false;

  /// Qué hacer cuando la persona inicia sesión después de que se le pidió la
  /// cuenta (volver al formulario de publicar, reabrir el objeto que quería reclamar).
  VoidCallback? _alVolver;
  bool _estabaActiva = false;
  final _claveInicio = GlobalKey<InicioPantallaState>();
  final _clavePublicar = GlobalKey<PublicarPantallaState>();
  final _claveMisCosas = GlobalKey<MisCosasPantallaState>();

  static const _elementos = [
    ElementoNavegacion(_inicio, Icons.home_outlined, Icons.home_rounded, 'Inicio'),
    ElementoNavegacion(_misCosas, Icons.inventory_2_outlined, Icons.inventory_2_rounded, 'Mis cosas'),
    ElementoNavegacion(_perfil, Icons.person_outline_rounded, Icons.person_rounded, 'Perfil'),
  ];

  void _ir(int i) => setState(() => _indice = i);

  /// Lleva a iniciar sesión o crear la cuenta y, al terminar, a donde estaba.
  void _pedirCuenta({required bool crearCuenta, VoidCallback? alVolver, required int volverA}) {
    _registroPrimero = crearCuenta;
    _alVolver = alVolver ?? () => _ir(volverA);
    _ir(_perfil);
  }

  void _publicarCon(String tipo, {String? categoria}) {
    _ir(_publicar);
    WidgetsBinding.instance.addPostFrameCallback((_) => _clavePublicar.currentState?.preparar(tipo, categoria: categoria));
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    if (sesion.restaurando) {
      // Se está leyendo la sesión guardada: evita mostrar un instante la bienvenida o el acceso.
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (sesion.activa && !_estabaActiva && _alVolver != null) {
      final volver = _alVolver!;
      _alVolver = null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) volver();
      });
    }
    _estabaActiva = sesion.activa;
    final verBienvenida = widget.mostrarBienvenida && !_bienvenidaTerminada && !sesion.bienvenidaVista && !sesion.activa;
    if (verBienvenida) {
      return BienvenidaPantalla(
        alTerminar: ({required bool crearCuenta}) => setState(() {
          _bienvenidaTerminada = true;
          sesion.marcarBienvenidaVista();
          _registroPrimero = crearCuenta;
          _indice = crearCuenta ? _perfil : _inicio;
        }),
      );
    }
    return Scaffold(
      extendBody: true,
      body: IndexedStack(
        index: _indice,
        children: [
          InicioPantalla(
            key: _claveInicio,
            alPedirCuenta: ({required bool crearCuenta, VoidCallback? alVolver}) =>
                _pedirCuenta(crearCuenta: crearCuenta, alVolver: alVolver, volverA: _inicio),
            alIrAMisCosas: ({required bool reclame}) {
              _claveMisCosas.currentState?.mostrar(reclame: reclame);
              _ir(_misCosas);
            },
            alPublicar: _publicarCon,
          ),
          PublicarPantalla(
            key: _clavePublicar,
            alPedirCuenta: ({required bool crearCuenta, VoidCallback? alVolver}) =>
                _pedirCuenta(crearCuenta: crearCuenta, alVolver: alVolver, volverA: _publicar),
            alPublicar: () {
              _claveInicio.currentState?.recargar();
              _ir(_inicio);
            },
          ),
          MisCosasPantalla(key: _claveMisCosas),
          PerfilPantalla(registroInicial: _registroPrimero),
        ],
      ),
      bottomNavigationBar: BarraNavegacionUtb(
        indice: _indice,
        alCambiar: (i) {
          if (i == _misCosas) _claveMisCosas.currentState?.mostrar(reclame: false);
          _ir(i);
        },
        elementos: _elementos,
        alPublicar: () => _ir(_publicar),
      ),
    );
  }
}
