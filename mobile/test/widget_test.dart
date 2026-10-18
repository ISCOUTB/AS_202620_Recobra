import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:recobra_mobile/api/recobra_api.dart';
import 'package:recobra_mobile/estado/almacen_local.dart';
import 'package:recobra_mobile/main.dart';
import 'package:recobra_mobile/pantallas/avisos.dart';

const _json = {'content-type': 'application/json; charset=utf-8'};

String _publicacion({String id = 'abc', String tipo = 'encontrado', String? autorId = 'autor-1'}) => jsonEncode({
      'id': id,
      'tipo': tipo,
      'descripcion': 'Termo azul',
      'categoria': 'otros',
      'ubicacion': 'Biblioteca',
      'estado': 'publicado',
      'creadoEn': '2026-10-17T12:00:00.000Z',
      'autorId': autorId,
    });

final _bandeja = jsonEncode({
  'noLeidas': 1,
  'notificaciones': [
    {
      'id': 'coincidencia:abc__p1:yo',
      'cuentaId': 'yo',
      'tipo': 'coincidencia',
      'titulo': 'Encontraron algo que podría ser tuyo',
      'mensaje': '«Termo azul» en Biblioteca se parece a lo que perdiste.',
      'publicacionId': 'abc',
      'leida': false,
      'creadoEn': '2026-10-17T12:00:00.000Z',
    },
  ],
});

http.Response _resp(String cuerpo, int estado) => http.Response.bytes(utf8.encode(cuerpo), estado, headers: _json);

final _reclamacionPendiente = jsonEncode([
  {
    'id': 'r1',
    'publicacionId': 'abc',
    'estado': 'pendiente',
    'prueba': 'Tiene una calcomanía de la UTB por dentro',
    'creadoEn': '2026-10-17T12:00:00.000Z',
    'resueltaEn': null,
    'motivoRechazo': null,
    'reclamante': {'nombre': 'Bea Ruiz'},
  },
]);

/// Servidor simulado con las rutas que usa la app. Con `soyAutor`, la cuenta
/// es la autora de "Termo azul" y tiene una reclamación pendiente por revisar.
MockClient _servidor({
  List<http.Request>? registro,
  bool soyAutor = false,
  String? mias,
  String? reclamosPropios,
  String? lista,
}) =>
    MockClient((request) async {
      registro?.add(request);
      final ruta = request.url.path;
      if (request.method == 'POST' && ruta == '/sesiones') {
        return _resp(
          jsonEncode({
            'token': 'tok-123',
            'expiraEn': '2026-10-24T00:00:00.000Z',
            'cuenta': {'id': 'yo', 'correo': 'ana@utb.edu.co', 'nombre': 'Ana Pérez'},
          }),
          201,
        );
      }
      if (request.method == 'GET' && ruta == '/privacidad') {
        return _resp(
          jsonEncode({
            'version': '2026-10-18',
            'titulo': 'Aviso de privacidad de Recobra',
            'secciones': [
              {'titulo': 'Qué datos guardamos', 'texto': 'Tu correo y tu nombre.'},
              {'titulo': 'Tus derechos', 'texto': 'Puedes pedir que se supriman.'},
            ],
          }),
          200,
        );
      }
      if (request.method == 'POST' && ruta == '/cuentas') {
        final cuerpo = jsonDecode(request.body) as Map<String, dynamic>;
        return cuerpo['aceptoPrivacidad'] == true
            ? _resp(jsonEncode({'id': 'yo', 'correo': cuerpo['correo'], 'nombre': cuerpo['nombre']}), 201)
            : _resp('{"statusCode":400,"message":"debes aceptar el aviso de privacidad"}', 400);
      }
      if (request.method == 'DELETE' && ruta == '/cuentas/yo') {
        return (jsonDecode(request.body) as Map<String, dynamic>)['contrasena'] == 'contrasena-1'
            ? http.Response('', 204)
            : _resp('{"statusCode":403,"message":"la contraseña no coincide"}', 403);
      }
      if (request.method == 'GET' && ruta == '/cuentas/yo') {
        return request.headers['Authorization'] == 'Bearer tok-123'
            ? _resp(jsonEncode({'id': 'yo', 'correo': 'ana@utb.edu.co', 'nombre': 'Ana Pérez'}), 200)
            : _resp('{"statusCode":401,"message":"Debes iniciar sesión"}', 401);
      }
      if (request.method == 'GET' && ruta == '/publicaciones') return _resp(lista ?? '[${_publicacion()}]', 200);
      if (request.method == 'POST' && ruta == '/publicaciones/p5/lo-tengo') {
        return _resp(_publicacion(id: 'h1', autorId: 'yo'), 201);
      }
      if (request.method == 'POST' && ruta == '/publicaciones') {
        return request.headers['Authorization'] == 'Bearer tok-123'
            ? _resp(_publicacion(id: 'nueva', tipo: 'perdido', autorId: 'yo'), 201)
            : _resp('{"statusCode":401,"message":"Debes iniciar sesión"}', 401);
      }
      if (ruta == '/coincidencias') return _resp('[]', 200);
      if (ruta == '/lugares') {
        return _resp('[{"nombre":"Biblioteca","niveles":["Piso 1","Piso 2"]},{"nombre":"Cafetería central","niveles":[]}]', 200);
      }
      if (request.method == 'GET' && ruta == '/notificaciones') return _resp(_bandeja, 200);
      if (request.method == 'POST' && ruta.startsWith('/notificaciones/')) return http.Response('', 204);
      if (request.method == 'GET' && ruta == '/publicaciones/abc') return _resp(_publicacion(), 200);
      if (request.method == 'POST' && ruta == '/publicaciones/abc/reclamaciones') return _resp('{}', 201);
      if (request.method == 'POST' && ruta == '/publicaciones/abc/reportar') return _resp('{}', 201);
      if (ruta == '/publicaciones/mias') {
        return _resp(mias ?? (soyAutor ? '[${_publicacion(autorId: 'yo')}]' : '[]'), 200);
      }
      if (request.method == 'POST' && ruta == '/publicaciones/p9/cerrar') {
        return _resp(
          jsonEncode({
            ...jsonDecode(_publicacion(id: 'p9', tipo: 'perdido', autorId: 'yo')) as Map<String, dynamic>,
            'estado': 'cerrado',
            'motivoCierre': 'recuperado',
          }),
          200,
        );
      }
      if (request.method == 'POST' && ruta == '/reclamaciones/r7/entregada') return _resp('{}', 200);
      if (ruta == '/publicaciones/abc/reclamaciones') return _resp(_reclamacionPendiente, 200);
      if (request.method == 'POST' && ruta == '/reclamaciones/r1/aprobar') return _resp('{}', 200);
      if (ruta == '/reclamaciones/mias') return _resp(reclamosPropios ?? '[]', 200);
      return _resp('{"statusCode":404,"message":"no"}', 404);
    });

void main() {
  group('RecobraApi', () {
    test('iniciar sesión guarda el token y las peticiones siguientes lo envían', () async {
      final peticiones = <http.Request>[];
      final api = RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor(registro: peticiones));

      final cuenta = await api.iniciarSesion(correo: 'ana@utb.edu.co', contrasena: 'contrasena-1');
      await api.crearPublicacion(
        tipo: 'perdido',
        descripcion: 'Termo',
        categoria: 'otros',
        ubicacion: 'Biblioteca',
        claveIdempotencia: 'clave-de-prueba-01',
      );

      expect(cuenta.nombre, 'Ana Pérez');
      expect(api.token, 'tok-123');
      final crear = peticiones.last;
      expect(crear.headers['Authorization'], 'Bearer tok-123');
      expect(crear.headers['Idempotency-Key'], 'clave-de-prueba-01');
    });

    test('publicar sin sesión lanza un error que marca la sesión como faltante', () async {
      final api = RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor());
      expect(
        () => api.crearPublicacion(tipo: 'perdido', descripcion: 'x', categoria: 'otros', ubicacion: 'y'),
        throwsA(isA<RecobraApiException>().having((e) => e.sinSesion, 'sinSesion', true)),
      );
    });

    test('acepta el 200 de un reintento con la misma clave', () async {
      final api = RecobraApi(
        baseUrl: 'http://localhost:3000',
        client: MockClient((_) async => _resp(_publicacion(), 200)),
      );
      final p = await api.crearPublicacion(
        tipo: 'encontrado',
        descripcion: 'Termo azul',
        categoria: 'otros',
        ubicacion: 'Biblioteca',
        claveIdempotencia: 'clave-de-prueba-01',
      );
      expect(p.id, 'abc');
      expect(p.autorId, 'autor-1');
    });

    test('reclamar envía la prueba con la sesión', () async {
      http.Request? recibida;
      final api = RecobraApi(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          recibida = request;
          return _resp('{}', 201);
        }),
      )..token = 'tok-123';

      await api.reclamar('abc', 'Tiene una calcomanía de la UTB por dentro');

      expect(recibida!.url.path, '/publicaciones/abc/reclamaciones');
      expect(recibida!.headers['Authorization'], 'Bearer tok-123');
      expect(jsonDecode(recibida!.body)['prueba'], 'Tiene una calcomanía de la UTB por dentro');
    });

    test('la bandeja de avisos se lee con la sesión y se marca como leída', () async {
      final peticiones = <http.Request>[];
      final api = RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor(registro: peticiones))
        ..token = 'tok-123';

      final bandeja = await api.notificaciones();
      await api.marcarLeida(bandeja.notificaciones.single.id);

      expect(bandeja.noLeidas, 1);
      expect(bandeja.notificaciones.single.tipo, 'coincidencia');
      expect(peticiones.first.headers['Authorization'], 'Bearer tok-123');
      expect(peticiones.last.method, 'POST');
      expect(peticiones.last.url.path, '/notificaciones/coincidencia:abc__p1:yo/leida');
    });

    test('listarCoincidencias parsea la lista', () async {
      final api = RecobraApi(
        baseUrl: 'http://localhost:3000',
        client: MockClient((request) async {
          expect(request.url.queryParameters['publicacionId'], 'abc');
          return _resp(
            '[{"id":"1","publicacionOrigenId":"abc","publicacionCoincidenteId":"xyz",'
            '"score":0.6,"estado":"detectada","creadoEn":"2026-09-27T00:00:00.000Z"}]',
            200,
          );
        }),
      );
      final coincidencias = await api.listarCoincidencias('abc');
      expect(coincidencias.single.score, 0.6);
    });
  });

  group('Aplicación', () {
    void pantallaAlta(WidgetTester tester) {
      tester.view.physicalSize = const Size(800, 2000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }

    Widget app(MockClient cliente) =>
        RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: cliente), mostrarBienvenida: false);

    Future<void> entrar(WidgetTester tester) async {
      await tester.tap(find.text('Perfil').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo institucional'), 'ana@utb.edu.co');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'contrasena-1');
      await tester.tap(find.text('Entrar'));
      await tester.pumpAndSettle();
    }

    testWidgets('La sesión guardada se restaura al abrir la app', (tester) async {
      pantallaAlta(tester);
      final almacen = AlmacenMemoria({'recobra.sesion.token': 'tok-123'});
      await tester.pumpWidget(
        RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor()), almacen: almacen),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Ana', findRichText: true), findsOneWidget);
      expect(find.text('Lo que se pierde en el campus, aparece aquí'), findsNothing);
    });

    testWidgets('Una sesión guardada que ya venció se olvida y se entra como visitante', (tester) async {
      pantallaAlta(tester);
      final almacen = AlmacenMemoria({'recobra.sesion.token': 'token-viejo'});
      await tester.pumpWidget(
        RecobraApp(
          api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor()),
          almacen: almacen,
          mostrarBienvenida: false,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Recobra'), findsOneWidget); // sin saludo: visitante
      expect(await almacen.leer('recobra.sesion.token'), isNull);
    });

    testWidgets('Iniciar sesión guarda el token y cerrar sesión lo borra', (tester) async {
      pantallaAlta(tester);
      final almacen = AlmacenMemoria();
      await tester.pumpWidget(
        RecobraApp(
          api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor()),
          almacen: almacen,
          mostrarBienvenida: false,
        ),
      );
      await tester.pumpAndSettle();
      await entrar(tester);
      expect(await almacen.leer('recobra.sesion.token'), 'tok-123');

      // Otra "apertura" de la app con el mismo almacenamiento: ya hay sesión.
      await tester.pumpWidget(
        RecobraApp(
          key: UniqueKey(),
          api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor()),
          almacen: almacen,
          mostrarBienvenida: false,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Ana', findRichText: true), findsOneWidget);

      await tester.tap(find.text('Perfil').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cerrar sesión'));
      await tester.pumpAndSettle();
      expect(await almacen.leer('recobra.sesion.token'), isNull);
    });

    testWidgets('Crear una cuenta exige aceptar el aviso de privacidad y lo envía al servidor', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Perfil').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Crear cuenta').first);
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'Nombre'), 'Ana Pérez');
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo institucional'), 'ana@utb.edu.co');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'contrasena-1');
      await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
      await tester.pumpAndSettle();
      expect(find.textContaining('debes aceptar el aviso de privacidad'), findsOneWidget);
      expect(peticiones.where((r) => r.method == 'POST' && r.url.path == '/cuentas'), isEmpty);

      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Crear cuenta'));
      await tester.pumpAndSettle();

      final registro = peticiones.singleWhere((r) => r.method == 'POST' && r.url.path == '/cuentas');
      expect(jsonDecode(registro.body)['aceptoPrivacidad'], true);
    });

    testWidgets('El aviso de privacidad se lee desde el perfil y se puede eliminar la cuenta con la contraseña', (
      tester,
    ) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      final almacen = AlmacenMemoria();
      await tester.pumpWidget(
        RecobraApp(
          api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor(registro: peticiones)),
          almacen: almacen,
          mostrarBienvenida: false,
        ),
      );
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.drag(find.byType(ListView).first, const Offset(0, -600));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Aviso de privacidad'));
      await tester.pumpAndSettle();
      expect(find.text('Tus derechos'), findsOneWidget);
      await tester.tap(find.byTooltip('Cerrar'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Eliminar mi cuenta'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Tu contraseña'), 'equivocada-1');
      await tester.pump();
      await tester.tap(find.widgetWithText(OutlinedButton, 'Eliminar mi cuenta'));
      await tester.pumpAndSettle();
      expect(find.text('la contraseña no coincide'), findsOneWidget);
      expect(await almacen.leer('recobra.sesion.token'), 'tok-123'); // sigue con sesión

      await tester.enterText(find.widgetWithText(TextField, 'Tu contraseña'), 'contrasena-1');
      await tester.pump();
      await tester.tap(find.widgetWithText(OutlinedButton, 'Eliminar mi cuenta'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Tu cuenta fue eliminada'), findsOneWidget);
      expect(await almacen.leer('recobra.sesion.token'), isNull);
      expect(find.text('Tu cuenta'), findsOneWidget); // vuelve a la pantalla de acceso, como visitante
    });

    testWidgets('La bienvenida se muestra una sola vez', (tester) async {
      pantallaAlta(tester);
      final almacen = AlmacenMemoria();
      Widget abrir() => RecobraApp(
            key: UniqueKey(),
            api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor()),
            almacen: almacen,
          );

      await tester.pumpWidget(abrir());
      await tester.pumpAndSettle();
      expect(find.text('Lo que se pierde en el campus, aparece aquí'), findsOneWidget);
      await tester.tap(find.text('Solo quiero buscar'));
      await tester.pumpAndSettle();

      await tester.pumpWidget(abrir()); // la segunda vez ya la vio
      await tester.pumpAndSettle();
      expect(find.text('Lo que se pierde en el campus, aparece aquí'), findsNothing);
      expect(find.text('Termo azul'), findsOneWidget);
    });

    testWidgets('La bienvenida explica el recorrido y deja buscar sin cuenta', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor())));
      await tester.pumpAndSettle();

      expect(find.text('Lo que se pierde en el campus, aparece aquí'), findsOneWidget);
      await tester.tap(find.text('Solo quiero buscar'));
      await tester.pumpAndSettle();

      expect(find.text('Termo azul'), findsOneWidget);
    });

    testWidgets('Inicio muestra el título y las publicaciones sin pedir cuenta', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(app(_servidor()));
      await tester.pumpAndSettle();

      expect(find.text('Recobra'), findsOneWidget);
      expect(find.text('Termo azul'), findsOneWidget);
    });

    testWidgets('Sin cuenta se ve cómo se publica; al enviar se explica por qué hace falta y se vuelve al formulario', (
      tester,
    ) async {
      pantallaAlta(tester);
      await tester.pumpWidget(app(_servidor()));
      await tester.pumpAndSettle();

      await tester.tap(find.byTooltip('Publicar'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Estás explorando sin cuenta'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextFormField, '¿Qué es? Descríbelo'), 'Termo azul');

      await tester.tap(find.widgetWithText(FilledButton, 'Publicar objeto perdido'));
      await tester.pumpAndSettle();
      expect(find.text('Para publicar necesitas una cuenta'), findsOneWidget);
      expect(find.text('Cada reclamo tiene un responsable'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Iniciar sesión'));
      await tester.pumpAndSettle();
      expect(find.text('Tu cuenta'), findsOneWidget);
      expect(find.text('¿Por qué necesito una cuenta?'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo institucional'), 'ana@utb.edu.co');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'contrasena-1');
      await tester.tap(find.text('Entrar'));
      await tester.pumpAndSettle();

      // Vuelve al formulario con lo que había escrito, ya con sesión.
      expect(find.textContaining('Estás explorando sin cuenta'), findsNothing);
      expect(find.widgetWithText(FilledButton, 'Publicar objeto perdido'), findsOneWidget);
      expect(find.text('Termo azul'), findsOneWidget);
    });

    testWidgets('Sin cuenta, reclamar explica por qué hace falta y deja seguir explorando', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(app(_servidor()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Termo azul'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Es mío: reclamar'));
      await tester.pumpAndSettle();
      expect(find.text('Para reclamar necesitas una cuenta'), findsOneWidget);

      await tester.tap(find.text('Seguir explorando'));
      await tester.pumpAndSettle();
      expect(find.text('Es mío: reclamar'), findsOneWidget); // el detalle sigue abierto
    });

    testWidgets('Sin cuenta, reportar explica por qué hace falta una cuenta', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(app(_servidor()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Termo azul'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reportar esta publicación'));
      await tester.pumpAndSettle();
      expect(find.text('Para reportar necesitas una cuenta'), findsOneWidget);
    });

    testWidgets('Con cuenta, reportar pide un motivo y lo envía', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones)));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Termo azul'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reportar esta publicación'));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Enviar reporte')).onPressed, isNull);

      await tester.tap(find.text('Es spam o publicidad'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Enviar reporte'));
      await tester.pumpAndSettle();

      final reporte = peticiones.singleWhere((r) => r.url.path == '/publicaciones/abc/reportar');
      expect(jsonDecode(reporte.body), containsPair('motivo', 'spam'));
      expect(reporte.headers['Authorization'], 'Bearer tok-123');
      expect(find.text('Gracias, un administrador lo revisará.'), findsOneWidget);
    });

    testWidgets('Los accesos rápidos son botones de color con la palabra Publicar', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(app(_servidor()));
      await tester.pumpAndSettle();

      expect(find.text('PUBLICAR'), findsNWidgets(2));
      final perdi = find.ancestor(of: find.text('Perdí algo'), matching: find.byType(Material)).first;
      expect(tester.widget<Material>(perdi).color, const Color(0xFFF28C28)); // relleno sólido, no solo texto
      await tester.tap(find.text('Encontré algo'));
      await tester.pumpAndSettle();
      expect(find.widgetWithText(FilledButton, 'Publicar objeto encontrado'), findsOneWidget);
    });

    testWidgets('Iniciar sesión, publicar y volver a Inicio', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones)));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Perdí algo')); // acceso rápido: abre Publicar con "Lo perdí"
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, '¿Qué es? Descríbelo'), 'Termo');
      await tester.tap(find.widgetWithText(ChoiceChip, 'Otros'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String?>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Biblioteca').last);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ChoiceChip, 'Piso 2')); // submenú de pisos del lugar elegido
      await tester.enterText(find.widgetWithText(TextFormField, 'Otro piso, salón o referencia (opcional)'), 'Sala de estudio');
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Publicar objeto perdido'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Publicación creada'), findsOneWidget);
      final crear = peticiones.firstWhere((r) => r.method == 'POST' && r.url.path == '/publicaciones');
      expect(crear.headers['Authorization'], 'Bearer tok-123');
      expect(jsonDecode(crear.body)['ubicacion'], 'Biblioteca');
      expect(jsonDecode(crear.body)['detalleUbicacion'], 'Piso 2 · Sala de estudio');
      expect(find.textContaining('Ana'), findsWidgets); // saludo en Inicio
    });

    testWidgets('La campana muestra los avisos y abrir uno lo marca como leído', (tester) async {
      pantallaAlta(tester);
      final semantica = tester.ensureSemantics();
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones)));
      await tester.pumpAndSettle();
      expect(find.byType(CampanaAvisos), findsNothing); // sin sesión no hay campana

      await entrar(tester);
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();

      expect(find.byType(CampanaAvisos), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.bySemanticsLabel('Avisos, 1 sin leer'), findsOneWidget);
      // La coincidencia sin leer también se destaca en el encabezado de Inicio.
      expect(find.text('POSIBLE COINCIDENCIA'), findsOneWidget);
      await tester.tap(find.byType(CampanaAvisos));
      await tester.pumpAndSettle();
      expect(find.text('NUEVOS'), findsOneWidget);

      await tester.tap(find.text('Encontraron algo que podría ser tuyo').last);
      await tester.pumpAndSettle();

      expect(
        peticiones.where((r) => r.method == 'POST' && r.url.path.endsWith('/leida')),
        hasLength(1),
      );
      expect(find.text('Coincidencias'), findsOneWidget); // abrió el detalle de la publicación encontrada
      semantica.dispose();
    });

    testWidgets('Reclamar explica la prueba y se habilita con 20 caracteres', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones)));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Termo azul'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Es mío: reclamar'));
      await tester.pumpAndSettle();

      expect(find.text('¿QUÉ ES LA PRUEBA?'), findsOneWidget);
      final enviar = find.widgetWithText(FilledButton, 'Enviar reclamación');
      expect(tester.widget<FilledButton>(enviar).onPressed, isNull);

      await tester.enterText(find.byType(TextField), 'Tiene una calcomanía de la UTB por dentro');
      await tester.pump();
      expect(find.textContaining('Suficiente'), findsOneWidget);
      await tester.tap(enviar);
      await tester.pumpAndSettle();

      final reclamo = peticiones.singleWhere((r) => r.url.path == '/publicaciones/abc/reclamaciones');
      expect(jsonDecode(reclamo.body)['prueba'], 'Tiene una calcomanía de la UTB por dentro');
      expect(find.text('No has reclamado nada'), findsOneWidget); // quedó en "Lo que reclamé"
    });

    testWidgets('Aprobar pide confirmar a quién se entrega', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones, soyAutor: true)));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Mis cosas').last);
      await tester.pumpAndSettle();

      expect(find.text('Tienes 1 reclamación por revisar'), findsOneWidget);
      expect(find.text('Bea Ruiz dice que es suyo'), findsOneWidget);
      await tester.tap(find.text('Aprobar entrega'));
      await tester.pumpAndSettle();

      expect(find.text('¿Entregar «Termo azul» a Bea?'), findsOneWidget);
      expect(find.text('Esta acción no se puede deshacer.'), findsOneWidget);
      expect(peticiones.where((r) => r.url.path.endsWith('/aprobar')), isEmpty);

      await tester.tap(find.text('Sí, entregar a Bea'));
      await tester.pumpAndSettle();
      expect(peticiones.where((r) => r.url.path == '/reclamaciones/r1/aprobar'), hasLength(1));
    });

    testWidgets('Publicar un encontrado dejado en la portería envía dónde está', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(app(_servidor(registro: peticiones)));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Encontré algo'));
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, '¿Qué es? Descríbelo'), 'Paraguas gris');
      await tester.tap(find.widgetWithText(ChoiceChip, 'Otros'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String?>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Biblioteca').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lo dejé en un punto'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, '¿Dónde lo dejaste?'), 'Portería principal');
      await tester.tap(find.widgetWithText(FilledButton, 'Publicar objeto encontrado'));
      await tester.pumpAndSettle();

      final crear = peticiones.singleWhere((r) => r.method == 'POST' && r.url.path == '/publicaciones');
      expect(jsonDecode(crear.body)['custodia'], 'punto_de_entrega');
      expect(jsonDecode(crear.body)['puntoCustodia'], 'Portería principal');
    });

    testWidgets('"Lo tengo yo" sobre un perdido ajeno avisa al dueño', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      final perdido = jsonEncode({
        ...jsonDecode(_publicacion(id: 'p5', tipo: 'perdido', autorId: 'otra')) as Map<String, dynamic>,
        'descripcion': 'Calculadora Casio',
      });
      await tester.pumpWidget(app(_servidor(registro: peticiones, lista: '[$perdido]')));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Calculadora Casio'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lo tengo yo'));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, '¿Qué tienes?'), 'Calculadora científica');
      await tester.tap(find.byType(DropdownButtonFormField<String?>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Biblioteca').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Avisar que lo tengo'));
      await tester.pumpAndSettle();

      final reporte = peticiones.singleWhere((r) => r.url.path == '/publicaciones/p5/lo-tengo');
      expect(jsonDecode(reporte.body), containsPair('descripcion', 'Calculadora científica'));
      expect(jsonDecode(reporte.body), containsPair('ubicacion', 'Biblioteca'));
      expect(find.text('Lo que publiqué'), findsOneWidget); // quedó en Mis cosas
    });

    testWidgets('Quien perdió algo lo marca como recuperado desde Mis cosas', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      final perdido = _publicacion(id: 'p9', tipo: 'perdido', autorId: 'yo');
      await tester.pumpWidget(app(_servidor(registro: peticiones, mias: '[$perdido]')));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Mis cosas').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Ya lo recuperé'));
      await tester.pumpAndSettle();
      expect(find.text('¿Ya lo recuperaste?'), findsOneWidget);
      await tester.tap(find.text('Sí, ya lo tengo'));
      await tester.pumpAndSettle();

      final cierre = peticiones.singleWhere((r) => r.url.path == '/publicaciones/p9/cerrar');
      expect(jsonDecode(cierre.body)['motivo'], 'recuperado');
    });

    testWidgets('Con la reclamación aprobada, quien reclamó confirma que lo recibió', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      final aprobada = jsonEncode([
        {
          'id': 'r7',
          'publicacionId': 'abc',
          'estado': 'aprobada',
          'creadoEn': '2026-10-17T12:00:00.000Z',
          'resueltaEn': '2026-10-17T13:00:00.000Z',
          'motivoRechazo': null,
          'entregadaEn': null,
          'contactoQuienEncontro': {'nombre': 'Leo', 'correo': 'leo@utb.edu.co'},
        },
      ]);
      await tester.pumpWidget(app(_servidor(registro: peticiones, reclamosPropios: aprobada)));
      await tester.pumpAndSettle();
      await entrar(tester);
      await tester.tap(find.text('Mis cosas').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lo que reclamé'));
      await tester.pumpAndSettle();

      expect(find.text('leo@utb.edu.co'), findsOneWidget);
      await tester.tap(find.text('Ya lo recibí'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sí, ya lo recibí'));
      await tester.pumpAndSettle();

      expect(peticiones.where((r) => r.url.path == '/reclamaciones/r7/entregada'), hasLength(1));
    });
  });
}
