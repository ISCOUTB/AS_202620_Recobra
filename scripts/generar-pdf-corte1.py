"""Genera el PDF de 2 paginas del reto de corte 1 para Moodle."""
from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parents[1] / "docs" / "entrega-corte1-moodle.pdf"


def ascii(text: str) -> str:
    replacements = {
        "—": "-",
        "–": "-",
        "→": "->",
        "≤": "<=",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ñ": "n",
        "Á": "A",
        "É": "E",
        "Í": "I",
        "Ó": "O",
        "Ú": "U",
        "Ñ": "N",
        "ü": "u",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text


class Pdf(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 8, ascii(f"Recobra - Corte 1 - Pagina {self.page_no()}/{{nb}}"), align="C")


pdf = Pdf()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=16)
pdf.add_page()
pdf.set_font("Helvetica", "B", 14)
pdf.multi_cell(0, 7, ascii("Recobra - Reto de corte 1 (linea base / stack obligatorio)"))
pdf.set_font("Helvetica", "", 10)
pdf.ln(2)
pdf.multi_cell(
    0,
    5,
    ascii(
        "Equipo: Camilo Conde, Fernando Conde, Miguel Jacome, Veronica Ubarne\n"
        "Repo: https://github.com/ISCOUTB/AS_202620_Recobra\n"
        "ADR del reto: docs/adr/0003-reto-corte1-stack-obligatorio.md\n"
        "Medicion: docs/medicion-corte1.md"
    ),
)
pdf.ln(3)

pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 6, ascii("1. Diagnostico de la restriccion"), new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.multi_cell(
    0,
    5,
    ascii(
        "El curso fija un espacio cerrado de tecnologias: backend NestJS o FastAPI; "
        "frontend Flutter o NextJS. No se asigno otra restriccion de calidad aparte del stack. "
        "Impacto: el backend previo en Express quedaba fuera del espacio permitido; el C4 ya "
        "nombraba Flutter pero no habia cliente en el repositorio. El escenario ancla es S5 "
        "(mantenibilidad): migrar el framework sin reescribir el dominio ni romper el corte vertical."
    ),
)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 6, ascii("2. Alternativas y decision"), new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.multi_cell(
    0,
    5,
    ascii(
        "A) NestJS + Flutter - experiencia previa del equipo en Node/Flutter; Nest materializa "
        "puertos/adaptadores con DI; Flutter encaja con uso en campus (camara/push).\n"
        "B) FastAPI + NextJS - OpenAPI util, pero obliga a Python y a un cliente web sin experiencia "
        "previa fuerte del equipo.\n"
        "C) Mantener Express - costo cero, pero incumple el requisito del curso.\n"
        "Decision: NestJS + Flutter, conservando arquitectura hexagonal (ADR-0002 / ADR-0003)."
    ),
)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 6, ascii("3. Cambio aplicado sobre el corte vertical"), new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.multi_cell(
    0,
    5,
    ascii(
        "Composition root y adaptador HTTP migrados a NestJS (src/main.ts, publicaciones/, salud/). "
        "Dominio y casos de uso en TypeScript dependen solo del puerto PublicacionRepository "
        "(persistencia en memoria reemplazable). Cliente Flutter en mobile/ crea y consulta "
        "publicaciones via REST. CI en .github/workflows/ci.yml ejecuta npm test, e2e y flutter test. "
        "Limites C4 conservados: API + cliente; PostgreSQL/auth/notificaciones siguen como objetivo."
    ),
)

pdf.add_page()
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 6, ascii("4. Linea base, resultado y contraste con el umbral"), new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Helvetica", "", 10)
pdf.multi_cell(
    0,
    5,
    ascii(
        "Linea base (Express hexagonal previo): pruebas del vertical slice en verde; contenedor API "
        "fuera del stack permitido; cliente movil ausente; latencia POST /publicaciones en orden "
        "de 8-15 ms en local.\n\n"
        "Resultado (NestJS + Flutter, 2026-09-05):\n"
        "- npm test y npm run test:e2e en verde (dominio + corte e2e).\n"
        "- flutter test en verde.\n"
        "- Contenedor API = NestJS (permitido); cliente Flutter presente.\n"
        "- Latencia POST /publicaciones (N=50, script npm run measure:post): p50=0.67 ms, "
        "p95=2.02 ms (objetivo local <=100 ms).\n"
        "- Reglas de Publicacion intactas (S5 cumplido: cambio de framework sin reescribir dominio).\n\n"
        "Procedimiento reproducible: npm install && npm run start; en otra terminal "
        "npm run measure:post. Detalle en docs/medicion-corte1.md."
    ),
)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 11)
pdf.cell(
    0,
    6,
    ascii("5. Trazabilidad (aspecto -> requisito -> C4 -> ADR -> codigo -> pruebas -> evidencia)"),
    new_x="LMARGIN",
    new_y="NEXT",
)
pdf.set_font("Helvetica", "", 10)
pdf.multi_cell(
    0,
    5,
    ascii(
        "Aspecto A2 (docs/aspectos.md) -> escenario S5 -> contenedor API NestJS / app Flutter "
        "(docs/c4/README.md) -> ADR-0002 y ADR-0003 -> src/domain, src/application, "
        "src/publicaciones, mobile/ -> npm test, npm run test:e2e, flutter test, CI GitHub Actions "
        "-> docs/medicion-corte1.md y este PDF.\n\n"
        "Uso de IA del corte registrado en docs/ia.md (aceptado ADR/CI/Flutter; rechazado FastAPI/NextJS)."
    ),
)
pdf.ln(3)
pdf.set_font("Helvetica", "I", 9)
pdf.multi_cell(
    0,
    4,
    ascii(
        "Etiqueta git esperada: corte-1 sobre el commit de esta entrega. "
        "Sustentacion: la restriccion fue solo el stack obligatorio; la medicion demuestra S5 "
        "y latencia del POST del corte vertical."
    ),
)

OUT.parent.mkdir(parents=True, exist_ok=True)
pdf.output(OUT)
print(f"PDF escrito en {OUT}")
