import 'package:flutter/material.dart';

/// Paleta tomada de la app institucional de la UTB (medida en capturas de la
/// app actual): fondo casi negro, tarjetas gris oscuro, encabezado con
/// degradado azul y acentos de color solo para estados. Los contrastes están
/// medidos sobre `superficie` (ver docs/diseno-ui.md).
class ColoresUtb {
  static const fondo = Color(0xFF05060B);
  static const fondoProfundo = Color(0xFF0F1015);
  static const superficie = Color(0xFF17181B);
  static const superficieAlta = Color(0xFF22242A);
  static const borde = Color(0xFF2C2E35);
  static const agarradera = Color(0xFF3A3D46);
  static const azul = Color(0xFF0A39D0);
  static const azulOscuro = Color(0xFF0C288D);
  static const azulMarino = Color(0xFF081A5E);
  static const azulClaro = Color(0xFF7B9BFF);

  /// Texto azul sobre fondos oscuros (etiquetas "PUBLICADO", enlaces).
  static const azulTexto = Color(0xFF9DB4FF);

  /// Primera parte del saludo, sobre el degradado.
  static const azulSaludo = Color(0xFFB9C8FF);
  static const texto = Color(0xFFF5F6F8);
  static const textoSuave = Color(0xFF9AA0AB);
  static const textoApagado = Color(0xFF6B707A);
  static const naranja = Color(0xFFF28C28);
  static const verde = Color(0xFF3CCB6E);
  static const magenta = Color(0xFFB620E0);
  static const rojo = Color(0xFFFF6B6B);

  /// Texto oscuro sobre botones naranja y verde (contraste 8:1 o más).
  static const textoSobreNaranja = Color(0xFF1A0E02);
  static const textoSobreVerde = Color(0xFF05260F);

  /// Rojo para texto pequeño (más claro, para mantener el contraste).
  static const rojoTexto = Color(0xFFFF8A8A);

  /// Degradado del encabezado de cada pantalla (155°).
  static const degradado = LinearGradient(
    begin: Alignment(-0.6, -1),
    end: Alignment(0.6, 1),
    stops: [0, 0.55, 1],
    colors: [azul, azulOscuro, azulMarino],
  );

  /// Única sombra del sistema: barra flotante y hojas inferiores.
  static const sombra = [BoxShadow(color: Color(0x8C000000), blurRadius: 32, offset: Offset(0, 12))];
}

OutlineInputBorder _borde(Color color, double ancho) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: color, width: ancho),
    );

ThemeData temaUtb() {
  const esquema = ColorScheme.dark(
    primary: ColoresUtb.azul,
    onPrimary: Colors.white,
    secondary: ColoresUtb.azulClaro,
    surface: ColoresUtb.superficie,
    onSurface: ColoresUtb.texto,
    surfaceContainerHigh: ColoresUtb.superficieAlta,
    outline: ColoresUtb.borde,
    error: ColoresUtb.rojo,
  );
  final base = ThemeData(
    colorScheme: esquema,
    useMaterial3: true,
    brightness: Brightness.dark,
    // La fuente va empaquetada (pubspec.yaml): la app no le pide nada a terceros al abrir.
    fontFamily: 'Roboto',
  );
  return base.copyWith(
    scaffoldBackgroundColor: ColoresUtb.fondo,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    textTheme: base.textTheme.apply(bodyColor: ColoresUtb.texto, displayColor: ColoresUtb.texto),
    cardTheme: CardThemeData(
      color: ColoresUtb.superficie,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: ColoresUtb.borde),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: ColoresUtb.superficieAlta,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: const TextStyle(color: ColoresUtb.textoSuave),
      hintStyle: const TextStyle(color: ColoresUtb.textoApagado),
      helperStyle: const TextStyle(color: ColoresUtb.textoSuave),
      border: _borde(ColoresUtb.borde, 1),
      enabledBorder: _borde(ColoresUtb.borde, 1),
      focusedBorder: _borde(ColoresUtb.azulClaro, 2),
      errorBorder: _borde(ColoresUtb.rojo, 2),
      focusedErrorBorder: _borde(ColoresUtb.rojo, 2),
      errorStyle: const TextStyle(color: ColoresUtb.rojoTexto),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: ColoresUtb.azul,
        foregroundColor: Colors.white,
        disabledBackgroundColor: ColoresUtb.superficieAlta,
        disabledForegroundColor: ColoresUtb.textoApagado,
        minimumSize: const Size.fromHeight(52),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ColoresUtb.texto,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: ColoresUtb.borde),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: ColoresUtb.azulTexto,
        minimumSize: const Size(44, 44),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: ColoresUtb.superficie,
      selectedColor: ColoresUtb.azul,
      side: const BorderSide(color: ColoresUtb.borde),
      shape: const StadiumBorder(),
      labelStyle: const TextStyle(color: ColoresUtb.texto, fontSize: 14, fontWeight: FontWeight.w500),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: ColoresUtb.superficie,
      showDragHandle: true,
      dragHandleColor: ColoresUtb.agarradera,
      dragHandleSize: Size(40, 5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: ColoresUtb.superficieAlta,
      contentTextStyle: TextStyle(color: ColoresUtb.texto),
      behavior: SnackBarBehavior.floating,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: ColoresUtb.azulClaro),
    dividerColor: ColoresUtb.borde,
    dividerTheme: const DividerThemeData(color: ColoresUtb.borde, thickness: 1, space: 1),
  );
}
