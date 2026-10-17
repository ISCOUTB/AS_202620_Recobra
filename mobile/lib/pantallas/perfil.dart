import 'package:flutter/material.dart';

import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'acceso.dart';

/// Perfil de la cuenta, con el estilo de la pantalla "Perfil" de la app UTB.
class PerfilPantalla extends StatelessWidget {
  const PerfilPantalla({super.key});

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    if (!sesion.activa) return const AccesoPantalla(motivo: 'Inicia sesión con tu correo institucional.');
    final cuenta = sesion.cuenta!;
    final iniciales = cuenta.nombre.trim().split(RegExp(r'\s+')).take(2).map((p) => p[0].toUpperCase()).join();
    final arriba = MediaQuery.of(context).padding.top;
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Container(
          decoration: const BoxDecoration(
            gradient: ColoresUtb.degradado,
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
          ),
          padding: EdgeInsets.fromLTRB(20, arriba + 24, 20, 28),
          child: Column(
            children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Perfil', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 16),
              CircleAvatar(
                radius: 44,
                backgroundColor: Colors.white.withValues(alpha: 0.15),
                child: Text(iniciales, style: const TextStyle(fontSize: 30, color: Colors.white, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 12),
              Text(cuenta.nombre, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
              Text(cuenta.correo, style: const TextStyle(color: Color(0xFFDCE3FF))),
              const SizedBox(height: 10),
              const Etiqueta('Cuenta institucional', color: Colors.white),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const TituloSeccion('Cómo funciona'),
              const Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: Icon(Icons.inventory_2_outlined, color: ColoresUtb.verde),
                      title: Text('Si encontraste algo'),
                      subtitle: Text('Publícalo. Cuando alguien lo reclame, verás lo que dice saber del objeto y decides.'),
                    ),
                    Divider(height: 1),
                    ListTile(
                      leading: Icon(Icons.search, color: ColoresUtb.naranja),
                      title: Text('Si perdiste algo'),
                      subtitle: Text('Publícalo y busca en Inicio. Si lo ves como encontrado, pulsa "Es mío".'),
                    ),
                    Divider(height: 1),
                    ListTile(
                      leading: Icon(Icons.verified_user_outlined, color: ColoresUtb.azulClaro),
                      title: Text('Tu correo, solo al final'),
                      subtitle: Text('Se comparte únicamente cuando quien encontró el objeto aprueba la reclamación.'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(foregroundColor: ColoresUtb.rojo, minimumSize: const Size.fromHeight(50)),
                icon: const Icon(Icons.logout),
                label: const Text('Cerrar sesión'),
                onPressed: () => sesion.salir(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
