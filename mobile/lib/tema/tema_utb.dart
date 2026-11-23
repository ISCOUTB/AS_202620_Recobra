import 'package:flutter/material.dart';

/// Colores del sistema de diseño de Recobra, con los mismos nombres que sus
/// tokens (`tokens.json`). Hay dos juegos, claro y oscuro: el azul UTB y el
/// degradado del encabezado son iguales en los dos; cambian el fondo, las
/// superficies, el texto y los colores de estado.
@immutable
class ColoresRecobra extends ThemeExtension<ColoresRecobra> {
  const ColoresRecobra({
    required this.brillo,
    required this.fondo,
    required this.tarjeta,
    required this.tarjetaAlta,
    required this.ticket,
    required this.separador,
    required this.texto,
    required this.textoSuave,
    required this.enlace,
    required this.naranjaTexto,
    required this.verdeTexto,
    required this.rojoTexto,
    required this.magentaTexto,
    required this.barra,
    required this.sombraBarra,
    required this.sombraHoja,
  });

  final Brightness brillo;
  final Color fondo;
  final Color tarjeta;
  final Color tarjetaAlta;
  final Color ticket;
  final Color separador;
  final Color texto;
  final Color textoSuave;
  final Color enlace;
  final Color naranjaTexto;
  final Color verdeTexto;
  final Color rojoTexto;
  final Color magentaTexto;
  final Color barra;
  final List<BoxShadow> sombraBarra;
  final List<BoxShadow> sombraHoja;

  static const azulUtb = Color(0xFF2545C9);
  static const sobreAzul = Color(0xFFFFFFFF);
  static const encabezado = Color(0xFF1A36CF);
  static const encabezadoMedio = Color(0xFF1232B8);
  static const encabezadoFin = Color(0xFF0B2384);

  static const claro = ColoresRecobra(
    brillo: Brightness.light,
    fondo: Color(0xFFF2F3F7),
    tarjeta: Color(0xFFFFFFFF),
    tarjetaAlta: Color(0xFFEEF0F5),
    ticket: Color(0xFFE9EBF2),
    separador: Color(0xFFE3E5EB),
    texto: Color(0xFF0B0D17),
    textoSuave: Color(0xFF5F6470),
    enlace: Color(0xFF2545C9),
    naranjaTexto: Color(0xFFB45309),
    verdeTexto: Color(0xFF157F3C),
    rojoTexto: Color(0xFFC4261D),
    magentaTexto: Color(0xFF8A12C2),
    barra: Color(0xFFFFFFFF),
    sombraBarra: [BoxShadow(color: Color(0x140B0D17), blurRadius: 20, offset: Offset(0, 6))],
    sombraHoja: [BoxShadow(color: Color(0x1F0B0D17), blurRadius: 30, offset: Offset(0, -6))],
  );

  static const oscuro = ColoresRecobra(
    brillo: Brightness.dark,
    fondo: Color(0xFF010208),
    tarjeta: Color(0xFF19181B),
    tarjetaAlta: Color(0xFF2C2B30),
    ticket: Color(0xFF343338),
    separador: Color(0xFF2A2A2E),
    texto: Color(0xFFFFFFFF),
    textoSuave: Color(0xFF98989F),
    enlace: Color(0xFF4F86FF),
    naranjaTexto: Color(0xFFF5A35A),
    verdeTexto: Color(0xFF4CD07D),
    rojoTexto: Color(0xFFFF6961),
    magentaTexto: Color(0xFFD08CFF),
    barra: Color(0xFF141414),
    sombraBarra: [],
    sombraHoja: [],
  );

  /// Juego de colores en uso. Lo fija la app cada vez que cambia el brillo
  /// (ver `RecobraApp`), para que los widgets lean `ColoresUtb` sin contexto.
  static ColoresRecobra actual = oscuro;

  static ColoresRecobra para(Brightness brillo) => brillo == Brightness.light ? claro : oscuro;

  @override
  ColoresRecobra copyWith() => this;

  @override
  ColoresRecobra lerp(ThemeExtension<ColoresRecobra>? other, double t) =>
      other is ColoresRecobra && t >= 0.5 ? other : this;
}

/// Nombres que usan las pantallas, resueltos contra el juego de colores en uso.
/// Cada uno corresponde a un token del sistema de diseño.
class ColoresUtb {
  static ColoresRecobra get _c => ColoresRecobra.actual;

  static Color get fondo => _c.fondo;
  static Color get fondoProfundo => _c.fondo;
  static Color get superficie => _c.tarjeta;
  static Color get superficieAlta => _c.tarjetaAlta;
  static Color get ticket => _c.ticket;
  static Color get borde => _c.separador;
  static Color get agarradera => _c.separador;
  static Color get barra => _c.barra;

  /// `azulUtb`: botón principal, segmento activo, botón +, cuadros de icono.
  static const azul = ColoresRecobra.azulUtb;
  static const sobreAzul = ColoresRecobra.sobreAzul;

  /// `enlace`: enlaces, acciones de texto, pestaña activa, estado Publicado.
  static Color get azulClaro => _c.enlace;
  static Color get azulTexto => _c.enlace;
  static Color get enlace => _c.enlace;

  /// Primera parte del saludo, sobre el degradado.
  static const azulSaludo = Color(0xFFDCE3FF);

  static Color get texto => _c.texto;
  static Color get textoSuave => _c.textoSuave;
  static Color get textoApagado => _c.textoSuave;

  /// Estados: siempre junto a su palabra, nunca solo color.
  static Color get naranja => _c.naranjaTexto;
  static Color get verde => _c.verdeTexto;
  static Color get magenta => _c.magentaTexto;
  static Color get rojo => _c.rojoTexto;
  static Color get rojoTexto => _c.rojoTexto;

  /// Texto sobre un relleno de estado (insignia de avisos).
  static const textoSobreNaranja = sobreAzul;
  static const textoSobreVerde = sobreAzul;

  /// Degradado del encabezado: `encabezado` → `encabezadoMedio` (55 %) →
  /// `encabezadoFin`, igual en los dos modos.
  static const degradado = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0, 0.55, 1],
    colors: [ColoresRecobra.encabezado, ColoresRecobra.encabezadoMedio, ColoresRecobra.encabezadoFin],
  );

  /// Única sombra del sistema (solo en claro): barra flotante y botón +.
  static List<BoxShadow> get sombra => _c.sombraBarra;
}

/// Radios del sistema de diseño.
class RadiosRecobra {
  static const etiqueta = 8.0;
  static const icono = 10.0;
  static const campo = 16.0;
  static const tarjeta = 20.0;
  static const segmentado = 22.0;
  static const encabezado = 28.0;
  static const hoja = 32.0;
}

/// Estilos de texto del sistema de diseño (familia del sistema).
class TextoRecobra {
  static const tituloPestana = TextStyle(fontSize: 34, height: 40 / 34, fontWeight: FontWeight.w800);
  static const seccion = TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w700);
  static const tarjetaBarra = TextStyle(fontSize: 17, height: 22 / 17, fontWeight: FontWeight.w600);
  static const fila = TextStyle(fontSize: 16, height: 21 / 16, fontWeight: FontWeight.w400);
  static const secundario = TextStyle(fontSize: 14, height: 19 / 14, fontWeight: FontWeight.w400);
  static const etiquetaEstado = TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600);
  static const etiqueta = TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w600, letterSpacing: 0.96);
}

OutlineInputBorder _borde(Color color, double ancho) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(RadiosRecobra.campo),
      borderSide: BorderSide(color: color, width: ancho),
    );

OutlineInputBorder _sinBorde() => OutlineInputBorder(
      borderRadius: BorderRadius.circular(RadiosRecobra.campo),
      borderSide: BorderSide.none,
    );

/// Tema de la app para un brillo dado. `temaUtb()` sin argumentos da el oscuro.
ThemeData temaUtb([Brightness brillo = Brightness.dark]) {
  final c = ColoresRecobra.para(brillo);
  final esquema = ColorScheme.fromSeed(
    seedColor: ColoresRecobra.azulUtb,
    brightness: brillo,
  ).copyWith(
    primary: ColoresRecobra.azulUtb,
    onPrimary: ColoresRecobra.sobreAzul,
    secondary: c.enlace,
    surface: c.tarjeta,
    onSurface: c.texto,
    onSurfaceVariant: c.textoSuave,
    surfaceContainerHigh: c.tarjetaAlta,
    surfaceContainerHighest: c.tarjetaAlta,
    outline: c.separador,
    outlineVariant: c.separador,
    error: c.rojoTexto,
  );
  final base = ThemeData(
    colorScheme: esquema,
    useMaterial3: true,
    brightness: brillo,
    // La fuente va empaquetada (pubspec.yaml): la app no le pide nada a terceros al abrir.
    fontFamily: 'Roboto',
  );
  return base.copyWith(
    extensions: [c],
    scaffoldBackgroundColor: c.fondo,
    canvasColor: c.fondo,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    textTheme: base.textTheme.apply(bodyColor: c.texto, displayColor: c.texto),
    iconTheme: IconThemeData(color: c.texto),
    cardTheme: CardThemeData(
      color: c.tarjeta,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RadiosRecobra.tarjeta)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      // Campos: tarjetaAlta en oscuro; en claro, superficie blanca con línea de
      // 1 px para que se vean sobre el fondo y dentro de una tarjeta.
      fillColor: c.brillo == Brightness.light ? c.tarjeta : c.tarjetaAlta,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: TextStyle(color: c.textoSuave),
      floatingLabelStyle: TextStyle(color: c.enlace),
      hintStyle: TextStyle(color: c.textoSuave),
      helperStyle: TextStyle(color: c.textoSuave),
      border: c.brillo == Brightness.light ? _borde(c.separador, 1) : _sinBorde(),
      enabledBorder: c.brillo == Brightness.light ? _borde(c.separador, 1) : _sinBorde(),
      focusedBorder: _borde(c.enlace, 2),
      errorBorder: _borde(c.rojoTexto, 2),
      focusedErrorBorder: _borde(c.rojoTexto, 2),
      errorStyle: TextStyle(color: c.rojoTexto),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: ColoresRecobra.azulUtb,
        foregroundColor: ColoresRecobra.sobreAzul,
        disabledBackgroundColor: c.tarjetaAlta,
        disabledForegroundColor: c.textoSuave,
        minimumSize: const Size.fromHeight(52),
        elevation: 0,
        shape: const StadiumBorder(),
        textStyle: TextoRecobra.tarjetaBarra,
      ),
    ),
    // Botón secundario: superficie neutra, con línea de 1 px en claro para que
    // se distinga también sobre el fondo de la pantalla.
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.texto,
        backgroundColor: c.brillo == Brightness.light ? c.tarjeta : c.tarjetaAlta,
        minimumSize: const Size.fromHeight(52),
        side: c.brillo == Brightness.light ? BorderSide(color: c.separador) : BorderSide.none,
        shape: const StadiumBorder(),
        textStyle: TextoRecobra.tarjetaBarra,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: c.enlace,
        minimumSize: const Size(44, 44),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: c.tarjeta,
      selectedColor: c.texto,
      side: BorderSide(color: c.separador),
      shape: const StadiumBorder(),
      labelStyle: TextStyle(color: c.texto, fontSize: 14, fontWeight: FontWeight.w500),
      secondaryLabelStyle: TextStyle(color: c.fondo, fontSize: 14, fontWeight: FontWeight.w600),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.tarjeta,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      showDragHandle: true,
      dragHandleColor: c.separador,
      dragHandleSize: const Size(40, 5),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(RadiosRecobra.hoja)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: c.tarjeta,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RadiosRecobra.tarjeta)),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.texto,
      contentTextStyle: TextStyle(color: c.fondo),
      actionTextColor: c.brillo == Brightness.light ? const Color(0xFF9DB4FF) : ColoresRecobra.azulUtb,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(RadiosRecobra.campo)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: c.enlace),
    dividerColor: c.separador,
    dividerTheme: DividerThemeData(color: c.separador, thickness: 1, space: 1),
    switchTheme: SwitchThemeData(
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? ColoresRecobra.azulUtb : c.tarjetaAlta,
      ),
    ),
  );
}
