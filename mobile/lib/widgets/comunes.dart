import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../tema/tema_utb.dart';
import 'foto.dart';

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

/// Iniciales para el avatar ("Ana Martínez" → "AM").
String iniciales(String nombre) {
  final partes = nombre.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
  return partes.map((p) => p[0].toUpperCase()).join();
}

const textosEstado = {
  'publicado': 'Publicado',
  'en_verificacion': 'En verificación',
  'por_entregar': 'Por entregar',
  'reclamado': 'Entregado',
  'cerrado': 'Cerrado',
};

/// Qué significa cada estado, dicho para quien no conoce el sistema.
const ayudaEstado = {
  'en_verificacion': 'Alguien dijo que es suyo. Quien lo encontró está revisando.',
  'por_entregar': 'Ya apareció su dueño; falta que se lo entreguen.',
  'reclamado': 'Ya volvió a su dueño.',
};

/// Por qué se cerró una publicación (ADR-0017).
const textosCierre = {
  'recuperado': 'Su dueño ya lo recuperó.',
  'retirado': 'Quien la publicó la retiró.',
  'vencido': 'Se cerró sola tras 60 días sin movimiento.',
  'moderado': 'Un administrador la ocultó por no cumplir las normas.',
};

/// Estados en los que todavía se puede reclamar un objeto encontrado.
const estadosReclamables = {'publicado', 'en_verificacion'};

String? ayudaDe(Publicacion p) =>
    p.estado == 'cerrado' ? textosCierre[p.motivoCierre] ?? 'Publicación cerrada.' : ayudaEstado[p.estado];

Color colorTipo(String tipo) => tipo == 'perdido' ? ColoresUtb.naranja : ColoresUtb.verde;

Color colorEstado(String estado) => switch (estado) {
      'en_verificacion' || 'por_entregar' => ColoresUtb.naranja,
      'reclamado' => ColoresUtb.verde,
      'cerrado' => ColoresUtb.textoSuave,
      _ => ColoresUtb.azulTexto,
    };

IconData iconoEstado(String estado) => switch (estado) {
      'en_verificacion' => Icons.hourglass_top_rounded,
      'por_entregar' => Icons.handshake_outlined,
      'reclamado' => Icons.check_rounded,
      'cerrado' => Icons.archive_outlined,
      _ => Icons.campaign_outlined,
    };

Color colorEstadoReclamacion(String estado) => switch (estado) {
      'aprobada' => ColoresUtb.verde,
      'rechazada' => ColoresUtb.rojoTexto,
      _ => ColoresUtb.naranja,
    };

/// Encabezado con el degradado azul de la app UTB: fecha en mayúsculas, título
/// grande (con un saludo opcional en azul claro), una acción a la derecha y,
/// si hace falta, una tarjeta destacada dentro del degradado.
class EncabezadoUtb extends StatelessWidget {
  const EncabezadoUtb({
    super.key,
    required this.titulo,
    this.sobretitulo,
    this.saludo,
    this.subtitulo,
    this.accion,
    this.inferior,
  });

  final String titulo;
  final String? sobretitulo;

  /// Primera parte del título en azul claro ("Buenas tardes,").
  final String? saludo;
  final String? subtitulo;
  final Widget? accion;
  final Widget? inferior;

  @override
  Widget build(BuildContext context) {
    final arriba = MediaQuery.of(context).padding.top;
    return Container(
      decoration: const BoxDecoration(
        gradient: ColoresUtb.degradado,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(20, arriba + 24, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (sobretitulo != null) ...[
                      Text(
                        sobretitulo!,
                        style: const TextStyle(
                          color: Color(0xCCFFFFFF),
                          fontSize: 11,
                          letterSpacing: 1.3,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                    ],
                    Text.rich(
                      TextSpan(
                        children: [
                          if (saludo != null)
                            TextSpan(text: '$saludo ', style: const TextStyle(color: ColoresUtb.azulSaludo)),
                          TextSpan(text: titulo),
                        ],
                      ),
                      style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, height: 1.15),
                    ),
                    if (subtitulo != null) ...[
                      const SizedBox(height: 6),
                      Text(subtitulo!, style: const TextStyle(color: Color(0xFFDCE3FF), fontSize: 14, height: 1.4)),
                    ],
                  ],
                ),
              ),
              if (accion != null) ...[const SizedBox(width: 12), accion!],
            ],
          ),
          if (inferior != null) ...[const SizedBox(height: 18), inferior!],
        ],
      ),
    );
  }
}

/// Etiqueta pequeña en mayúsculas ("ENCONTRADO", "EN VERIFICACIÓN"), con el
/// fondo del mismo color al 16 %, como "IMPORTANTE" en la app UTB.
class Etiqueta extends StatelessWidget {
  const Etiqueta(this.texto, {super.key, required this.color, this.icono});

  final String texto;
  final Color color;
  final IconData? icono;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icono != null) ...[Icon(icono, size: 13, color: color), const SizedBox(width: 4)],
          Text(
            texto.toUpperCase(),
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.7),
          ),
        ],
      ),
    );
  }
}

/// Estado de la publicación: siempre ícono y texto, nunca solo color.
class EtiquetaEstado extends StatelessWidget {
  const EtiquetaEstado(this.estado, {super.key});

  final String estado;

  @override
  Widget build(BuildContext context) =>
      Etiqueta(textosEstado[estado] ?? estado, color: colorEstado(estado), icono: iconoEstado(estado));
}

/// Barra de color de 4 px dentro de la tarjeta, como "Próxima clase". Es
/// decorativa: el tipo también va escrito en la etiqueta.
class BarraLateral extends StatelessWidget {
  const BarraLateral({super.key, required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Container(
        width: 4,
        margin: const EdgeInsets.fromLTRB(12, 16, 12, 16),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
      ),
    );
  }
}

/// Tarjeta oscura de una publicación con la barra de color del tipo.
class TarjetaPublicacion extends StatelessWidget {
  const TarjetaPublicacion({super.key, required this.publicacion, this.onTap, this.pie});

  final Publicacion publicacion;
  final VoidCallback? onTap;
  final Widget? pie;

  @override
  Widget build(BuildContext context) {
    final p = publicacion;
    final ayuda = ayudaDe(p);
    return Opacity(
      opacity: p.estado == 'reclamado' || p.estado == 'cerrado' ? 0.6 : 1,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                BarraLateral(color: colorTipo(p.tipo)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(0, 16, 12, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [Etiqueta(p.tipo, color: colorTipo(p.tipo)), EtiquetaEstado(p.estado)],
                        ),
                        const SizedBox(height: 8),
                        Text(p.descripcion, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, height: 1.3)),
                        const SizedBox(height: 6),
                        Text(
                          '${p.categoria} · ${p.lugarCompleto} · ${fechaCorta(p.creadoEn)}',
                          style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                        if (ayuda != null && pie == null) ...[
                          const SizedBox(height: 6),
                          Text(ayuda, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12)),
                        ],
                        if (pie != null) ...[const SizedBox(height: 12), pie!],
                      ],
                    ),
                  ),
                ),
                if (p.tieneFoto)
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: Align(alignment: Alignment.center, child: MiniaturaFoto(publicacionId: p.id)),
                  ),
                if (onTap != null)
                  const Padding(
                    padding: EdgeInsets.only(right: 12),
                    child: Icon(Icons.chevron_right_rounded, color: ColoresUtb.textoApagado),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Estado vacío que propone el siguiente paso en vez de solo decir "nada".
class EstadoVacio extends StatelessWidget {
  const EstadoVacio({super.key, required this.icono, required this.titulo, required this.texto, this.acciones = const []});

  final IconData icono;
  final String titulo;
  final String texto;
  final List<Widget> acciones;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: ColoresUtb.azulClaro.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icono, color: ColoresUtb.azulClaro, size: 28),
            ),
            const SizedBox(height: 12),
            Text(titulo, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(texto, textAlign: TextAlign.center, style: const TextStyle(color: ColoresUtb.textoSuave, height: 1.45)),
            for (final a in acciones) ...[const SizedBox(height: 10), SizedBox(width: double.infinity, child: a)],
          ],
        ),
      ),
    );
  }
}

/// Error que dice qué pasó y qué hacer, nunca un código.
class ErrorConReintento extends StatelessWidget {
  const ErrorConReintento({super.key, required this.alReintentar, this.texto});

  final VoidCallback alReintentar;
  final String? texto;

  @override
  Widget build(BuildContext context) {
    return EstadoVacio(
      icono: Icons.cloud_off_rounded,
      titulo: 'No pudimos conectar con Recobra',
      texto: texto ?? 'Revisa tu conexión o intenta de nuevo en un momento.',
      acciones: [FilledButton(onPressed: alReintentar, child: const Text('Reintentar'))],
    );
  }
}

/// Esqueleto con la misma forma que las tarjetas reales, sin animación (así
/// respeta "reducir movimiento" sin más lógica).
class EsqueletoTarjetas extends StatelessWidget {
  const EsqueletoTarjetas({super.key, this.cantidad = 3});

  final int cantidad;

  @override
  Widget build(BuildContext context) {
    Widget bloque(double ancho, double alto) => Container(
          width: ancho,
          height: alto,
          decoration: BoxDecoration(color: ColoresUtb.superficieAlta, borderRadius: BorderRadius.circular(8)),
        );
    return Semantics(
      label: 'Cargando',
      child: Column(
        children: [
          for (var i = 0; i < cantidad; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [bloque(84, 22), const SizedBox(width: 6), bloque(96, 22)]),
                      const SizedBox(height: 12),
                      bloque(220, 16),
                      const SizedBox(height: 8),
                      bloque(160, 12),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Título de sección con subtítulo, como "Eventos ›" en la app UTB.
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
          Semantics(
            header: true,
            child: Text(titulo, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          ),
          if (subtitulo != null) ...[
            const SizedBox(height: 2),
            Text(subtitulo!, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

/// Una opción del control segmentado; `contador` > 0 pinta un círculo naranja
/// ("Lo que publiqué 1") para lo que requiere acción.
class OpcionSegmento<T> {
  const OpcionSegmento(this.valor, this.etiqueta, {this.contador = 0, this.descripcionContador});

  final T valor;
  final String etiqueta;
  final int contador;
  final String? descripcionContador;
}

/// Control segmentado en píldora con la opción activa en azul, como
/// "Horario / Eventos" en la app UTB.
class ControlSegmentado<T> extends StatelessWidget {
  const ControlSegmentado({super.key, required this.opciones, required this.valor, required this.alCambiar});

  final List<OpcionSegmento<T>> opciones;
  final T valor;
  final ValueChanged<T> alCambiar;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: ColoresUtb.superficie,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: ColoresUtb.borde),
      ),
      child: Row(
        children: [
          for (final o in opciones)
            Expanded(
              child: Semantics(
                button: true,
                selected: o.valor == valor,
                label: o.contador > 0 && o.descripcionContador != null
                    ? '${o.etiqueta}, ${o.descripcionContador}'
                    : o.etiqueta,
                excludeSemantics: true,
                child: Material(
                  color: o.valor == valor ? ColoresUtb.azul : Colors.transparent,
                  shape: const StadiumBorder(),
                  child: InkWell(
                    customBorder: const StadiumBorder(),
                    onTap: () => alCambiar(o.valor),
                    child: SizedBox(
                      height: 42,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Text(
                              o.etiqueta,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: o.valor == valor ? Colors.white : ColoresUtb.textoSuave,
                              ),
                            ),
                          ),
                          if (o.contador > 0) ...[const SizedBox(width: 6), Contador(o.contador)],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Círculo naranja con un número ("2", "9+"); texto oscuro sobre naranja (8:1).
class Contador extends StatelessWidget {
  const Contador(this.n, {super.key});

  final int n;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 20),
      height: 20,
      padding: const EdgeInsets.symmetric(horizontal: 5),
      alignment: Alignment.center,
      decoration: BoxDecoration(color: ColoresUtb.naranja, borderRadius: BorderRadius.circular(10)),
      child: Text(
        n > 9 ? '9+' : '$n',
        style: const TextStyle(color: Color(0xFF1A0E02), fontSize: 11, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class ElementoNavegacion {
  const ElementoNavegacion(this.indice, this.icono, this.iconoActivo, this.etiqueta);

  /// Pantalla a la que lleva dentro de la pila de la navegación.
  final int indice;
  final IconData icono;
  final IconData iconoActivo;
  final String etiqueta;
}

/// Barra flotante en píldora (Inicio, Mis cosas, Perfil) y, aparte, la burbuja
/// redonda de Publicar: el mismo lugar que el asistente en la app UTB, para
/// que la acción principal esté siempre a un toque.
class BarraNavegacionUtb extends StatelessWidget {
  const BarraNavegacionUtb({
    super.key,
    required this.indice,
    required this.alCambiar,
    required this.elementos,
    required this.alPublicar,
  });

  final int indice;
  final ValueChanged<int> alCambiar;
  final List<ElementoNavegacion> elementos;
  final VoidCallback alPublicar;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: Row(
        children: [
          Expanded(
            child: Container(
              constraints: const BoxConstraints(minHeight: 68),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xEB0E0F14),
                borderRadius: BorderRadius.circular(34),
                border: Border.all(color: ColoresUtb.borde),
                boxShadow: ColoresUtb.sombra,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [for (final e in elementos) _ItemNavegacion(e, activo: e.indice == indice, alTocar: alCambiar)],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Tooltip(
            message: 'Publicar',
            child: Material(
              color: indice == 1 ? ColoresUtb.azulClaro : ColoresUtb.azul,
              shape: const CircleBorder(),
              elevation: 0,
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: alPublicar,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: const BoxDecoration(shape: BoxShape.circle, boxShadow: ColoresUtb.sombra),
                  child: Icon(Icons.add_rounded, size: 30, color: indice == 1 ? ColoresUtb.fondo : Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemNavegacion extends StatelessWidget {
  const _ItemNavegacion(this.elemento, {required this.activo, required this.alTocar});

  final ElementoNavegacion elemento;
  final bool activo;
  final ValueChanged<int> alTocar;

  @override
  Widget build(BuildContext context) {
    final color = activo ? ColoresUtb.azulClaro : ColoresUtb.textoSuave;
    return Semantics(
      selected: activo,
      button: true,
      label: elemento.etiqueta,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => alTocar(elemento.indice),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 78,
          constraints: const BoxConstraints(minHeight: 54),
          padding: const EdgeInsets.symmetric(vertical: 4),
          decoration: BoxDecoration(
            color: activo ? ColoresUtb.azul.withValues(alpha: 0.32) : Colors.transparent,
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(activo ? elemento.iconoActivo : elemento.icono, color: color),
              const SizedBox(height: 2),
              Text(
                elemento.etiqueta,
                style: TextStyle(
                  fontSize: 11,
                  color: activo ? ColoresUtb.texto : ColoresUtb.textoSuave,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Anillo con el porcentaje de parecido, como los anillos de Notas en la app UTB.
class AnilloParecido extends StatelessWidget {
  const AnilloParecido({super.key, required this.score, this.fondo = ColoresUtb.fondoProfundo});

  /// Entre 0 y 1.
  final double score;
  final Color fondo;

  @override
  Widget build(BuildContext context) {
    final porcentaje = (score * 100).round();
    return Semantics(
      label: '$porcentaje por ciento de parecido',
      excludeSemantics: true,
      child: SizedBox(
        width: 56,
        height: 56,
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox.expand(
              child: CircularProgressIndicator(
                value: score,
                strokeWidth: 6,
                color: ColoresUtb.azulClaro,
                backgroundColor: ColoresUtb.borde,
              ),
            ),
            Text('$porcentaje%', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

/// Título de una hoja inferior con el botón de cerrar siempre visible (no
/// depender solo del gesto de arrastrar).
class EncabezadoHoja extends StatelessWidget {
  const EncabezadoHoja({super.key, required this.titulo, this.subtitulo, this.accion});

  final String titulo;
  final String? subtitulo;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(titulo, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, height: 1.25)),
              ),
              if (subtitulo != null) ...[
                const SizedBox(height: 2),
                Text(subtitulo!, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13)),
              ],
            ],
          ),
        ),
        if (accion != null) accion!,
        BotonCerrar(alCerrar: () => Navigator.of(context).pop()),
      ],
    );
  }
}

class BotonCerrar extends StatelessWidget {
  const BotonCerrar({super.key, required this.alCerrar});

  final VoidCallback alCerrar;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Cerrar',
      onPressed: alCerrar,
      style: IconButton.styleFrom(backgroundColor: ColoresUtb.superficieAlta, fixedSize: const Size(44, 44)),
      icon: const Icon(Icons.close_rounded, size: 20),
    );
  }
}

/// Caja informativa azul ("Si es tuyo, te pediremos…").
class CajaInfo extends StatelessWidget {
  const CajaInfo({super.key, required this.child, this.icono = Icons.info_outline_rounded, this.color = ColoresUtb.azulClaro});

  final Widget child;
  final IconData icono;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icono, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: DefaultTextStyle.merge(
              style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFFD3DCFF)),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

/// Pasos numerados ("Qué pasa después", "Cómo funciona").
class PasosNumerados extends StatelessWidget {
  const PasosNumerados({super.key, required this.pasos});

  final List<String> pasos;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < pasos.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: ColoresUtb.azul.withValues(alpha: 0.32),
                    shape: BoxShape.circle,
                  ),
                  child: Text('${i + 1}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(pasos[i], style: const TextStyle(fontSize: 14, height: 1.45)),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Avatar redondo con iniciales.
class AvatarIniciales extends StatelessWidget {
  const AvatarIniciales(this.nombre, {super.key, this.radio = 20});

  final String nombre;
  final double radio;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radio,
      backgroundColor: ColoresUtb.azul.withValues(alpha: 0.4),
      child: Text(
        iniciales(nombre),
        style: TextStyle(fontSize: radio * 0.7, color: Colors.white, fontWeight: FontWeight.w700),
      ),
    );
  }
}
