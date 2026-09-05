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
}
