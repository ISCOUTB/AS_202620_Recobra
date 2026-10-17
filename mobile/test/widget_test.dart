import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:recobra_mobile/api/recobra_api.dart';
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

/// Servidor simulado con las rutas que usa la app.
MockClient _servidor({List<http.Request>? registro}) => MockClient((request) async {
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
      if (request.method == 'GET' && ruta == '/publicaciones') return _resp('[${_publicacion()}]', 200);
      if (request.method == 'POST' && ruta == '/publicaciones') {
        return request.headers['Authorization'] == 'Bearer tok-123'
            ? _resp(_publicacion(id: 'nueva', tipo: 'perdido', autorId: 'yo'), 201)
            : _resp('{"statusCode":401,"message":"Debes iniciar sesión"}', 401);
      }
      if (ruta == '/coincidencias') return _resp('[]', 200);
      if (request.method == 'GET' && ruta == '/notificaciones') return _resp(_bandeja, 200);
      if (request.method == 'POST' && ruta.startsWith('/notificaciones/')) return http.Response('', 204);
      if (request.method == 'GET' && ruta == '/publicaciones/abc') return _resp(_publicacion(), 200);
      if (ruta == '/publicaciones/mias' || ruta == '/reclamaciones/mias') return _resp('[]', 200);
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

    testWidgets('Inicio muestra el título y las publicaciones sin pedir cuenta', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor())));
      await tester.pumpAndSettle();

      expect(find.text('Recobra'), findsOneWidget);
      expect(find.text('Termo azul'), findsOneWidget);
    });

    testWidgets('Publicar sin sesión muestra el acceso con correo institucional', (tester) async {
      pantallaAlta(tester);
      await tester.pumpWidget(RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor())));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Publicar').last);
      await tester.pumpAndSettle();

      expect(find.text('Tu cuenta'), findsOneWidget);
      expect(find.text('Entrar'), findsOneWidget);
    });

    testWidgets('Iniciar sesión, publicar y volver a Inicio', (tester) async {
      pantallaAlta(tester);
      final peticiones = <http.Request>[];
      await tester.pumpWidget(
        RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor(registro: peticiones))),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Publicar').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo institucional'), 'ana@utb.edu.co');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'contrasena-1');
      await tester.tap(find.text('Entrar'));
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'Descripción'), 'Termo');
      await tester.tap(find.widgetWithText(ChoiceChip, 'otros'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String?>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Biblioteca').last);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Publicar'));
      await tester.pumpAndSettle();

      expect(find.text('Publicación creada'), findsOneWidget);
      final crear = peticiones.firstWhere((r) => r.method == 'POST' && r.url.path == '/publicaciones');
      expect(crear.headers['Authorization'], 'Bearer tok-123');
      expect(find.textContaining('Ana'), findsWidgets); // saludo en Inicio
    });

    testWidgets('La campana muestra los avisos y abrir uno lo marca como leído', (tester) async {
      pantallaAlta(tester);
      final semantica = tester.ensureSemantics();
      final peticiones = <http.Request>[];
      await tester.pumpWidget(
        RecobraApp(api: RecobraApi(baseUrl: 'http://localhost:3000', client: _servidor(registro: peticiones))),
      );
      await tester.pumpAndSettle();
      expect(find.byType(CampanaAvisos), findsNothing); // sin sesión no hay campana

      await tester.tap(find.text('Perfil').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Correo institucional'), 'ana@utb.edu.co');
      await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'contrasena-1');
      await tester.tap(find.text('Entrar'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Inicio').last);
      await tester.pumpAndSettle();

      expect(find.byType(CampanaAvisos), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.bySemanticsLabel('Avisos, 1 sin leer'), findsOneWidget);
      await tester.tap(find.byType(CampanaAvisos));
      await tester.pumpAndSettle();
      expect(find.text('Encontraron algo que podría ser tuyo'), findsOneWidget);

      await tester.tap(find.text('Encontraron algo que podría ser tuyo'));
      await tester.pumpAndSettle();

      expect(
        peticiones.where((r) => r.method == 'POST' && r.url.path.endsWith('/leida')),
        hasLength(1),
      );
      expect(find.text('Coincidencias'), findsOneWidget); // abrió el detalle de la publicación encontrada
      semantica.dispose();
    });
  });
}
