import 'dart:async';

import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

const _chipAviso = {
  'coincidencia': 'Posible coincidencia',
  'reclamacion_nueva': 'Reclamación nueva',
  'reclamacion_aprobada': 'Reclamación aprobada',
  'reclamacion_rechazada': 'Reclamación rechazada',
};

Color colorAviso(String tipo) => switch (tipo) {
      'reclamacion_nueva' => ColoresUtb.naranja,
      'reclamacion_aprobada' => ColoresUtb.verde,
      'reclamacion_rechazada' => ColoresUtb.rojo,
      _ => ColoresUtb.azulClaro,
    };

/// Campana del encabezado con el número de avisos sin leer (escenario S3,
/// ADR-0015). Consulta la bandeja al aparecer y cada 20 s mientras hay sesión.
class CampanaAvisos extends StatefulWidget {
  const CampanaAvisos({super.key, required this.alAbrirAviso});

  /// Qué hacer al tocar un aviso (abrir la publicación o ir a "Mis cosas").
  final void Function(Notificacion aviso) alAbrirAviso;

  static const intervalo = Duration(seconds: 20);

  @override
  State<CampanaAvisos> createState() => _CampanaAvisosState();
}

class _CampanaAvisosState extends State<CampanaAvisos> {
  BandejaAvisos _bandeja = BandejaAvisos.vacia;
  Timer? _temporizador;
  late SesionApp _sesion;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sesion = AlcanceSesion.de(context);
    _temporizador ??= Timer.periodic(CampanaAvisos.intervalo, (_) => _cargar());
    _cargar();
  }

  @override
  void dispose() {
    _temporizador?.cancel();
    super.dispose();
  }

  Future<void> _cargar() async {
    if (!_sesion.activa) return;
    try {
      final bandeja = await _sesion.api.notificaciones();
      if (mounted) setState(() => _bandeja = bandeja);
    } catch (e) {
      // Un fallo de los avisos no debe estorbar el resto de la app (S4a).
      _sesion.revisarError(e);
    }
  }

  Future<void> _abrirBandeja() async {
    await _cargar();
    if (!mounted) return;
    final elegido = await showModalBottomSheet<Notificacion>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ColoresUtb.fondo,
      showDragHandle: true,
      builder: (_) => AlcanceSesion(sesion: _sesion, child: HojaAvisos(inicial: _bandeja)),
    );
    await _cargar();
    if (elegido != null) widget.alAbrirAviso(elegido);
  }

  @override
  Widget build(BuildContext context) {
    final n = _bandeja.noLeidas;
    return Semantics(
      container: true,
      button: true,
      label: n == 0 ? 'Avisos' : 'Avisos, $n sin leer',
      excludeSemantics: true,
      child: Material(
        color: Colors.white.withValues(alpha: 0.14),
        shape: const CircleBorder(side: BorderSide(color: Color(0x59FFFFFF))),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: _abrirBandeja,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Badge(
              isLabelVisible: n > 0,
              label: Text(n > 9 ? '9+' : '$n'),
              backgroundColor: ColoresUtb.naranja,
              textColor: ColoresUtb.fondo,
              child: const Icon(Icons.notifications_none_rounded, color: Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}

/// Lista de avisos. Tocar uno lo marca como leído y lo devuelve a quien abrió la hoja.
class HojaAvisos extends StatefulWidget {
  const HojaAvisos({super.key, required this.inicial});

  final BandejaAvisos inicial;

  @override
  State<HojaAvisos> createState() => _HojaAvisosState();
}

class _HojaAvisosState extends State<HojaAvisos> {
  late BandejaAvisos _bandeja = widget.inicial;

  Future<void> _abrir(Notificacion aviso) async {
    final sesion = AlcanceSesion.de(context);
    final navegador = Navigator.of(context);
    if (!aviso.leida) {
      try {
        await sesion.api.marcarLeida(aviso.id);
      } catch (e) {
        sesion.revisarError(e);
      }
    }
    navegador.pop(aviso);
  }

  Future<void> _leerTodas() async {
    final sesion = AlcanceSesion.de(context);
    try {
      await sesion.api.marcarTodasLeidas();
      final bandeja = await sesion.api.notificaciones();
      if (mounted) setState(() => _bandeja = bandeja);
    } catch (e) {
      sesion.revisarError(e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      maxChildSize: 0.95,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('Avisos', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              ),
              if (_bandeja.noLeidas > 0)
                TextButton(onPressed: _leerTodas, child: const Text('Marcar todo como leído')),
            ],
          ),
          const SizedBox(height: 8),
          if (_bandeja.notificaciones.isEmpty)
            const EstadoVacio(
              icono: Icons.notifications_off_outlined,
              titulo: 'Sin avisos',
              texto: 'Te contaremos aquí si aparece algo que perdiste o si reclaman lo que publicaste.',
            )
          else
            for (final aviso in _bandeja.notificaciones)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TarjetaAviso(aviso: aviso, onTap: () => _abrir(aviso)),
              ),
        ],
      ),
    );
  }
}

/// Tarjeta de un aviso, con la barra de color a la izquierda como en la app UTB.
class TarjetaAviso extends StatelessWidget {
  const TarjetaAviso({super.key, required this.aviso, this.onTap});

  final Notificacion aviso;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: aviso.leida ? 0.6 : 1,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 4, color: colorAviso(aviso.tipo)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${(_chipAviso[aviso.tipo] ?? 'Aviso').toUpperCase()} · ${fechaCorta(aviso.creadoEn)}',
                          style: const TextStyle(
                            color: ColoresUtb.textoSuave,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(aviso.titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 2),
                        Text(aviso.mensaje, style: const TextStyle(color: ColoresUtb.textoSuave)),
                      ],
                    ),
                  ),
                ),
                if (!aviso.leida)
                  const Padding(
                    padding: EdgeInsets.only(right: 14),
                    child: Center(child: CircleAvatar(radius: 4, backgroundColor: ColoresUtb.naranja)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
