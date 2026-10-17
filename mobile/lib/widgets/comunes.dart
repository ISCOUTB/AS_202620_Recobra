import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../tema/tema_utb.dart';

const _dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const _meses = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

/// "SÁBADO, 17 DE OCTUBRE", como el encabezado de la app UTB.
String fechaLarga(DateTime f) => '${_dias[f.weekday - 1]}, ${f.day} DE ${_meses[f.month - 1]}';

String saludo(DateTime f) {
  if (f.hour < 12) return 'Buenos días';
  if (f.hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/// Fecha corta legible a partir de un ISO 8601: "17 oct · 14:38".
String fechaCorta(String iso) {
  final f = DateTime.tryParse(iso)?.toLocal();
  if (f == null) return '';
  final mes = _meses[f.month - 1].substring(0, 3).toLowerCase();
  final hora = '${f.hour.toString().padLeft(2, '0')}:${f.minute.toString().padLeft(2, '0')}';
  return '${f.day} $mes · $hora';
}

const textosEstado = {'publicado': 'Publicado', 'en_verificacion': 'En verificación', 'reclamado': 'Entregado'};

Color colorTipo(String tipo) => tipo == 'perdido' ? ColoresUtb.naranja : ColoresUtb.verde;

Color colorEstado(String estado) => switch (estado) {
      'en_verificacion' => ColoresUtb.naranja,
      'reclamado' => ColoresUtb.verde,
      _ => ColoresUtb.textoSuave,
    };

/// Encabezado con el degradado azul de la app UTB y título grande.
class EncabezadoUtb extends StatelessWidget {
  const EncabezadoUtb({super.key, required this.titulo, this.sobretitulo, this.subtitulo, this.accion});

  final String titulo;
  final String? sobretitulo;
  final String? subtitulo;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    final arriba = MediaQuery.of(context).padding.top;
    return Container(
      decoration: const BoxDecoration(
        gradient: ColoresUtb.degradado,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(20, arriba + 24, 20, 24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (sobretitulo != null)
                  Text(
                    sobretitulo!,
                    style: const TextStyle(
                      color: Color(0xFFCFD8FF),
                      fontSize: 12,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                if (sobretitulo != null) const SizedBox(height: 4),
                Text(
                  titulo,
                  style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800),
                ),
                if (subtitulo != null) ...[
                  const SizedBox(height: 6),
                  Text(subtitulo!, style: const TextStyle(color: Color(0xFFDCE3FF), fontSize: 14)),
                ],
              ],
            ),
          ),
          if (accion != null) accion!,
        ],
      ),
    );
  }
}

/// Etiqueta pequeña en mayúsculas ("ENCONTRADO", "EN VERIFICACIÓN").
class Etiqueta extends StatelessWidget {
  const Etiqueta(this.texto, {super.key, required this.color});

  final String texto;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(999)),
      child: Text(
        texto.toUpperCase(),
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8),
      ),
    );
  }
}

/// Tarjeta oscura de una publicación, con la barra de color del tipo a la izquierda.
class TarjetaPublicacion extends StatelessWidget {
  const TarjetaPublicacion({super.key, required this.publicacion, this.onTap, this.pie});

  final Publicacion publicacion;
  final VoidCallback? onTap;
  final Widget? pie;

  @override
  Widget build(BuildContext context) {
    final p = publicacion;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(width: 4, color: colorTipo(p.tipo)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Etiqueta(p.tipo, color: colorTipo(p.tipo)),
                          const SizedBox(width: 8),
                          Etiqueta(textosEstado[p.estado] ?? p.estado, color: colorEstado(p.estado)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(p.descripcion, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 14,
                        runSpacing: 4,
                        children: [
                          _Dato(icono: Icons.sell_outlined, texto: p.categoria),
                          _Dato(icono: Icons.place_outlined, texto: p.ubicacion),
                          _Dato(icono: Icons.schedule, texto: fechaCorta(p.creadoEn)),
                        ],
                      ),
                      if (pie != null) ...[const SizedBox(height: 12), pie!],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dato extends StatelessWidget {
  const _Dato({required this.icono, required this.texto});

  final IconData icono;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icono, size: 15, color: ColoresUtb.textoSuave),
        const SizedBox(width: 4),
        Text(texto, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13)),
      ],
    );
  }
}

class EstadoVacio extends StatelessWidget {
  const EstadoVacio({super.key, required this.icono, required this.titulo, required this.texto});

  final IconData icono;
  final String titulo;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(icono, color: ColoresUtb.azulClaro, size: 32),
            const SizedBox(height: 10),
            Text(titulo, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(texto, textAlign: TextAlign.center, style: const TextStyle(color: ColoresUtb.textoSuave)),
          ],
        ),
      ),
    );
  }
}

/// Título de sección con subtítulo, como "Eventos >" en la app UTB.
class TituloSeccion extends StatelessWidget {
  const TituloSeccion(this.titulo, {super.key, this.subtitulo});

  final String titulo;
  final String? subtitulo;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titulo, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          if (subtitulo != null)
            Text(subtitulo!, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13)),
        ],
      ),
    );
  }
}

class ElementoNavegacion {
  const ElementoNavegacion(this.icono, this.iconoActivo, this.etiqueta);

  final IconData icono;
  final IconData iconoActivo;
  final String etiqueta;
}

/// Barra flotante en forma de píldora, como la navegación de la app UTB.
class BarraNavegacionUtb extends StatelessWidget {
  const BarraNavegacionUtb({super.key, required this.indice, required this.alCambiar, required this.elementos});

  final int indice;
  final ValueChanged<int> alCambiar;
  final List<ElementoNavegacion> elementos;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Container(
        height: 68,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: const Color(0xF2131417),
          borderRadius: BorderRadius.circular(34),
          border: Border.all(color: ColoresUtb.borde),
          boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 24, offset: Offset(0, 8))],
        ),
        child: Row(
          children: [
            for (var i = 0; i < elementos.length; i++)
              Expanded(
                child: Semantics(
                  selected: i == indice,
                  button: true,
                  label: elementos[i].etiqueta,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(28),
                    onTap: () => alCambiar(i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      decoration: BoxDecoration(
                        color: i == indice ? ColoresUtb.azul.withValues(alpha: 0.28) : Colors.transparent,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            i == indice ? elementos[i].iconoActivo : elementos[i].icono,
                            color: i == indice ? ColoresUtb.azulClaro : ColoresUtb.textoSuave,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            elementos[i].etiqueta,
                            style: TextStyle(
                              fontSize: 11,
                              color: i == indice ? ColoresUtb.azulClaro : ColoresUtb.textoSuave,
                              fontWeight: i == indice ? FontWeight.w700 : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
