import 'package:flutter/material.dart';

/// Paleta tomada de la app institucional de la UTB (medida en capturas de la
/// app actual): fondo casi negro, tarjetas gris oscuro, encabezado con
/// degradado azul y acentos de color para estados.
class ColoresUtb {
  static const fondo = Color(0xFF05060B);
  static const superficie = Color(0xFF17181B);
  static const superficieAlta = Color(0xFF22242A);
  static const borde = Color(0xFF2C2E35);
  static const azul = Color(0xFF0A39D0);
  static const azulOscuro = Color(0xFF0C288D);
  static const azulMarino = Color(0xFF081A5E);
  static const azulClaro = Color(0xFF7B9BFF);
  static const texto = Color(0xFFF5F6F8);
  static const textoSuave = Color(0xFF9AA0AB);
  static const naranja = Color(0xFFF28C28);
  static const verde = Color(0xFF3CCB6E);
  static const magenta = Color(0xFFB620E0);
  static const rojo = Color(0xFFFF6B6B);

  /// Degradado del encabezado de cada pantalla.
  static const degradado = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [azul, azulOscuro, azulMarino],
  );
}

ThemeData temaUtb() {
  const esquema = ColorScheme.dark(
    primary: ColoresUtb.azul,
    onPrimary: Colors.white,
    secondary: ColoresUtb.azulClaro,
    surface: ColoresUtb.superficie,
    onSurface: ColoresUtb.texto,
    error: ColoresUtb.rojo,
  );
  final base = ThemeData(colorScheme: esquema, useMaterial3: true, brightness: Brightness.dark);
  final bordeRedondeado = OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: const BorderSide(color: ColoresUtb.borde),
  );
  return base.copyWith(
    scaffoldBackgroundColor: ColoresUtb.fondo,
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
      labelStyle: const TextStyle(color: ColoresUtb.textoSuave),
      border: bordeRedondeado,
      enabledBorder: bordeRedondeado,
      focusedBorder: bordeRedondeado.copyWith(borderSide: const BorderSide(color: ColoresUtb.azulClaro, width: 2)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: ColoresUtb.azul,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ColoresUtb.azulClaro,
        side: const BorderSide(color: ColoresUtb.borde),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        backgroundColor: ColoresUtb.superficie,
        foregroundColor: ColoresUtb.textoSuave,
        selectedBackgroundColor: ColoresUtb.azul,
        selectedForegroundColor: Colors.white,
        side: const BorderSide(color: ColoresUtb.borde),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: ColoresUtb.superficieAlta,
      contentTextStyle: TextStyle(color: ColoresUtb.texto),
      behavior: SnackBarBehavior.floating,
    ),
    dividerColor: ColoresUtb.borde,
    dividerTheme: const DividerThemeData(color: ColoresUtb.borde, thickness: 1, space: 1),
  );
}
