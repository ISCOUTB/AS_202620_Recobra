import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:recobra_mobile/api/recobra_api.dart';
import 'package:recobra_mobile/main.dart';

void main() {
  test('RecobraApi parsea una publicación creada', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/publicaciones');
      return http.Response(
        '{"id":"abc","tipo":"perdido","descripcion":"Cargador",'
        '"categoria":"electronica","ubicacion":"Bloque 3",'
        '"estado":"publicado","creadoEn":"2026-09-05T12:00:00.000Z"}',
        201,
        headers: {'content-type': 'application/json'},
      );
    });

    final api = RecobraApi(baseUrl: 'http://localhost:3000', client: client);
    final pub = await api.crearPublicacion(
      tipo: 'perdido',
      descripcion: 'Cargador',
      categoria: 'electronica',
      ubicacion: 'Bloque 3',
    );

    expect(pub.id, 'abc');
    expect(pub.estado, 'publicado');
  });

  testWidgets('La pantalla principal muestra el título Recobra', (tester) async {
    final client = MockClient((_) async => http.Response('{}', 500));
    final api = RecobraApi(baseUrl: 'http://localhost:3000', client: client);

    await tester.pumpWidget(RecobraApp(api: api));

    expect(find.text('Recobra'), findsOneWidget);
    expect(find.text('Crear publicación'), findsOneWidget);
  });

  test('RecobraApi.listarCoincidencias parsea la lista', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/coincidencias');
      expect(request.url.queryParameters['publicacionId'], 'abc');
      return http.Response(
        '[{"id":"1","publicacionOrigenId":"abc","publicacionCoincidenteId":"xyz",'
        '"score":0.6,"estado":"detectada","creadoEn":"2026-09-27T00:00:00.000Z"}]',
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final api = RecobraApi(baseUrl: 'http://localhost:3000', client: client);
    final coincidencias = await api.listarCoincidencias('abc');

    expect(coincidencias, hasLength(1));
    expect(coincidencias.first.publicacionCoincidenteId, 'xyz');
    expect(coincidencias.first.score, 0.6);
  });

  testWidgets('Tras crear una publicación se muestra la sección de coincidencias', (tester) async {
    final client = MockClient((request) async {
      if (request.method == 'POST' && request.url.path == '/publicaciones') {
        return http.Response(
          '{"id":"abc","tipo":"perdido","descripcion":"Cargador",'
          '"categoria":"electronica","ubicacion":"Bloque 3",'
          '"estado":"publicado","creadoEn":"2026-09-05T12:00:00.000Z"}',
          201,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/coincidencias') {
        return http.Response('[]', 200, headers: {'content-type': 'application/json'});
      }
      return http.Response('{}', 404);
    });
    final api = RecobraApi(baseUrl: 'http://localhost:3000', client: client);

    // Viewport más alto que el default de test: la tarjeta de resultado y
    // la sección de coincidencias quedan más abajo en el formulario nuevo,
    // y el ListView (Sliver) no monta lo que está fuera de vista + caché.
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(RecobraApp(api: api));

    await tester.enterText(find.widgetWithText(TextFormField, 'Descripción'), 'Cargador');
    await tester.enterText(find.widgetWithText(TextFormField, 'Categoría'), 'electronica');
    await tester.enterText(find.widgetWithText(TextFormField, 'Ubicación'), 'Bloque 3');
    await tester.tap(find.text('Crear publicación'));
    await tester.pumpAndSettle();

    expect(find.text('Coincidencias'), findsOneWidget);
    expect(find.text('Todavía no hay coincidencias para esta publicación.'), findsOneWidget);
  });
}
