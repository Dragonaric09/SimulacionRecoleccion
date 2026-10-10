#!/usr/bin/env python3
"""Genera CSV de prueba compatibles con las exportaciones de las encuestas.

La utilidad es independiente de la aplicación. Lee solamente la primera fila
del CSV original para conservar el orden, los nombres y los encabezados
duplicados de Google Forms.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "salida"
TITULADOS_TEMPLATE = DEFAULT_OUTPUT_DIR / "titulados_random_12.csv"
EMPLEADORES_TEMPLATE = DEFAULT_OUTPUT_DIR / "empleadores_random_6.csv"
TITULADOS_FORM = ROOT / "form" / "form_export_titulados00.json"
EMPLEADORES_FORM = ROOT / "form" / "form_export_empleadores00.json"


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto).strip().lower()


def elegir(opciones: list[str]) -> str:
    return random.choice(opciones)


def si_no() -> str:
    return elegir(["Sí", "No"])


def timestamp() -> str:
    inicio = datetime(2026, 1, 1, 8, 0)
    momento = inicio + timedelta(minutes=random.randint(0, 280 * 24 * 60))
    # Se construye manualmente para que funcione igual en Windows y Linux.
    return f"{momento.day}/{momento.month}/{momento.year} {momento.hour}:{momento.minute:02d}:{momento.second:02d}"


def correo(nombre: str) -> str:
    slug = re.sub(r"[^a-z0-9]", ".", normalizar(nombre))
    return f"{slug}{random.randint(10, 999)}@ejemplo.test"


def checkbox(opciones: list[str], minimo: int = 1, maximo: int = 2) -> str:
    cantidad = random.randint(minimo, min(maximo, len(opciones)))
    return ", ".join(random.sample(opciones, cantidad))


def cargar_catalogo(tipo: str) -> list[dict]:
    """Carga preguntas y opciones reales del formulario correspondiente."""
    ruta = TITULADOS_FORM if tipo == "titulados" else EMPLEADORES_FORM
    formulario = json.loads(ruta.read_text(encoding="utf-8"))
    catalogo = []
    for pregunta in formulario.get("preguntas", []):
        registro = {
            "tipo": pregunta.get("tipo", ""),
            "titulo": pregunta.get("titulo", ""),
            "titulo_normalizado": normalizar(pregunta.get("titulo", "")),
            "opciones": [],
            "filas": [normalizar(x) for x in pregunta.get("filas", [])],
            "columnas": pregunta.get("columnas", []),
        }
        opciones = pregunta.get("opciones", [])
        registro["opciones"] = [
            x.get("valor", "") if isinstance(x, dict) else x for x in opciones
        ]
        catalogo.append(registro)
    return catalogo


def plantilla_para(tipo: str) -> Path:
    """Devuelve la plantilla sintética versionada para el tipo de encuesta."""
    plantilla = TITULADOS_TEMPLATE if tipo == "titulados" else EMPLEADORES_TEMPLATE
    if not plantilla.exists():
        raise FileNotFoundError(f"No se encontró la plantilla sintética: {plantilla}")
    return plantilla


def buscar_pregunta(header: str, catalogo: list[dict]) -> dict | None:
    """Relaciona una columna exportada con su pregunta del JSON.

    Los grids exportados agregan ``[texto de la fila]`` al encabezado, por lo
    que primero se intenta identificar la fila y después el título del grid.
    """
    h = normalizar(header)
    filas_header = re.findall(r"\[([^\]]+)\]", header)
    fila_header = normalizar(filas_header[-1]) if filas_header else ""
    candidatos = []
    for pregunta in catalogo:
        if fila_header and fila_header in pregunta["filas"]:
            candidatos.append(pregunta)
        elif pregunta["titulo_normalizado"] and (
            pregunta["titulo_normalizado"] in h or h in pregunta["titulo_normalizado"]
        ):
            candidatos.append(pregunta)
    if not candidatos:
        return None
    return max(candidatos, key=lambda x: len(x["titulo_normalizado"]))


def valor_desde_formulario(header: str, pregunta: dict | None) -> str | None:
    """Genera una respuesta usando el tipo y las opciones del JSON original."""
    if not pregunta:
        return None
    tipo = pregunta["tipo"]
    opciones = [x for x in pregunta["opciones"] if x]
    if tipo in {"SECTION_HEADER", "IMAGE"}:
        return ""
    if tipo in {"MULTIPLE_CHOICE", "LIST"} and opciones:
        return elegir(opciones)
    if tipo == "CHECKBOX" and opciones:
        return checkbox(opciones, 1, min(3, len(opciones)))
    if tipo == "GRID" and pregunta["columnas"]:
        return elegir(pregunta["columnas"])
    return None


def texto_fiel(header: str, tipo: str, fila: int) -> str:
    """Textos libres plausibles, manteniendo el tema de la pregunta."""
    h = normalizar(header)
    if "nombre" in h and "programa" in h:
        return elegir(["Diplomado en Ciencia de Datos", "Maestría en Ingeniería de Software"])
    if "empresa u organizacion" in h:
        return elegir(["TecnoSur Ltda.", "Innovación Andina S.R.L.", "Servicios Digitales Bolivia"])
    if "cargo" in h:
        return elegir(["Analista de sistemas", "Desarrollador de software", "Ingeniero de soporte"])
    if "direccion" in h or "ciudad" in h:
        return elegir(["Calle Bolívar 245, Cochabamba", "Av. Blanco Galindo 1234", "Zona Central, La Paz"])
    if "correo" in h:
        return correo(f"respuesta{fila}")
    if "telefono" in h or "whatsapp" in h:
        return f"591 7{random.randint(1000000, 9999999)}"
    if "pagina web" in h:
        return "https://empresa-ejemplo.test"
    if "competencia" in h or "habilidad" in h or "herramienta" in h or "tecnologia" in h:
        return elegir([
            "Se requiere más práctica con proyectos reales y trabajo en equipo.",
            "Sería útil reforzar nube, datos, ciberseguridad y automatización.",
            "Las tecnologías cambian rápido, por eso se necesita aprendizaje continuo.",
        ])
    if tipo == "PARAGRAPH_TEXT":
        return elegir([
            "La formación fue útil, aunque sería bueno aumentar las prácticas profesionales.",
            "Los contenidos son adecuados y ayudaron a conseguir mejores oportunidades laborales.",
            "Se debería actualizar algunos contenidos de acuerdo con las necesidades actuales.",
        ])
    return elegir(["Respuesta de prueba", "Experiencia positiva", "Actualmente continúa trabajando en el área."])


def valor_titulado(header: str, ocurrencia: int, fila: int, catalogo: list[dict]) -> str:
    h = normalizar(header)

    # Esta pregunta fue incorporada al formulario de titulados y debe usar
    # exactamente sus opciones, aunque el encabezado provenga de una
    # exportación con espacios o saltos de línea distintos.
    if "red de contactos oficial" in h:
        return elegir(["SI", "No"])

    desde_formulario = valor_desde_formulario(header, buscar_pregunta(header, catalogo))
    if desde_formulario is not None:
        if desde_formulario == "" and normalizar(header) not in {"marca temporal", "direccion de correo electronico"}:
            return texto_fiel(header, "TEXT", fila)
        return desde_formulario

    if h == "marca temporal":
        return timestamp()
    if "direccion de correo" in h:
        return correo(f"titulado{fila}")
    if "apellido(s) y nombre(s)" in h:
        return elegir(["Ana Rojas", "Luis Fernandez", "Carla Mendoza", "Diego Vargas"])
    if "edad que tiene" in h:
        return elegir(["21 a 25 años", "26 a 30 años", "31 a 35 años", "36 a 40 años"])
    if "ano de titulacion" in h:
        return str(random.randint(2015, 2025))
    if "sector en el que trabaja" in h or "sector corresponde" in h:
        return elegir(["Público", "Privado", "Independiente", "Mixto"])
    if "genero" in h:
        return elegir(["Femenino", "Masculino", "Prefiero no decirlo"])
    if "titulo de profesion" in h:
        return "Ingeniería de Sistemas"
    if "anos de vida profesional" in h or "cantidad corresponde al total de tiempo" in h:
        return str(random.randint(0, 12))
    if "situacion laboral actual" in h:
        return elegir([
            "Actualmente me encuentro trabajando en una organización",
            "Actualmente NO trabajo",
            "Actualmente dedico mi tiempo COMPLETO a un emprendimiento propio",
        ])
    if "formacion complementaria" in h or "programa de formacion complementaria" in h:
        return si_no()
    if "interes" in h and "posgrado" in h:
        return si_no()
    if "nombre del programa" in h:
        return elegir(["Diplomado en Ciencia de Datos", "Maestría en Ingeniería de Software"])
    if "nivel" in h and "posgrado" in h:
        return elegir(["Diplomado", "Especialidad", "Maestría"])
    if "modalidad" in h:
        return elegir(["Presencial", "Semipresencial", "Virtual"])
    if "area" in h and "posgrado" in h:
        return elegir(["Ciencia de datos", "Desarrollo de software", "Ciberseguridad"])
    if "departamento" in h:
        return elegir(["Cochabamba", "La Paz", "Santa Cruz", "Oruro"])
    if "remuneracion" in h:
        return elegir(["Menos de Bs. 2500", "Bs. 2500 a 5000", "Bs. 5001 a 8000", "Más de Bs. 8000"])
    if "antiguedad" in h:
        return elegir(["Menos de 1 año", "1 a 3 años", "4 a 6 años", "Más de 6 años"])
    if "primer empleo" in h or "trabajo antes" in h or "financiamiento externo" in h:
        return si_no()
    if "cantidad de empleos" in h:
        return str(random.randint(1, 5))
    if "medio" in h and ("obtencion" in h or "consegu" in h):
        return elegir(["Redes de contacto", "Convocatoria pública", "Internet y redes sociales", "Recomendación"])
    if "competencia" in h or "habilidad" in h or "satisfaccion" in h or "concordancia" in h:
        return elegir(["1 - Muy insuficiente", "2 - Insuficiente", "3 - Aceptable", "4 - Suficiente", "5 - Muy suficiente"])
    if "aspectos utiles" in h or "asignaturas" in h:
        return checkbox(["Programación", "Bases de datos", "Redes", "Gestión de proyectos"])
    if "email" in h or "telefono" in h or "linkedin" in h:
        return f"dato-prueba-{fila}"
    if "empresa" in h or "cargo" in h or "vinculo" in h or "area de especializacion" in h or "rubro" in h:
        return elegir(["Empresa de tecnología", "Consultora de software", "Institución pública", "Trabajo independiente"])
    if "comentario" in h or "indique" in h or "nombre" in h or "razon" in h or "competencia que mas les falta" in h:
        return elegir(["Mejorar la experiencia práctica", "Fortalecer habilidades blandas", "Profundizar tecnologías actuales"])
    return elegir(["Sí", "No", "Respuesta de prueba"])


def valor_empleador(header: str, ocurrencia: int, fila: int, catalogo: list[dict]) -> str:
    h = normalizar(header)
    desde_formulario = valor_desde_formulario(header, buscar_pregunta(header, catalogo))
    if desde_formulario is not None:
        if desde_formulario == "" and normalizar(header) not in {"marca temporal", "direccion de correo electronico"}:
            return texto_fiel(header, "TEXT", fila)
        return desde_formulario

    if h == "marca temporal":
        return timestamp()
    if "direccion de correo" in h:
        return correo(f"empleador{fila}")
    if "nombre de la empresa" in h or "razon social" in h or "nombre comercial" in h:
        return elegir(["TecnoSur Ltda.", "Innovación Andina S.R.L.", "Servicios Digitales Bolivia"])
    if h.startswith("nit"):
        return str(random.randint(100000000, 999999999))
    if "tipo de organizacion" in h:
        return elegir(["Privado", "Público", "ONG", "Cooperativa"])
    if "tamano de la organizacion" in h:
        return elegir(["Micro (hasta 10 funcionarios)", "Pequeña (entre 11 a 30 funcionarios)", "Mediana (entre 31 a 99 funcionarios)", "Grande (100 funcionarios o más)"])
    if "rubro o sector principal" in h:
        return elegir(["Desarrollo de software", "Servicios de tecnologías de información (TI)", "Banca y servicios financieros", "Educación e investigación"])
    if "ha contratado" in h:
        return elegir(["SI", "No"])
    if "posibilidad de incorporar" in h:
        return elegir(["Sí, existe una alta probabilidad de contratación", "Sí, dependiendo del crecimiento o nuevos proyectos de la organización", "No se tiene prevista la contratación actualmente"])
    if "nivel de formacion" in h:
        return elegir(["Licenciatura", "Diplomado", "Especialidad", "Maestría"])
    if "medio convoca" in h:
        return elegir(["Internet y Redes sociales", "Postulación competitiva (convocatorias públicas y privadas)", "Recomendación de terceros"])
    if "tipo de cargos" in h:
        return checkbox(["Técnico", "Analista", "Especialista", "Supervisor / Coordinador de área tecnológica"])
    if "departamento" in h:
        return elegir(["Cochabamba", "La Paz", "Santa Cruz"])
    if "presencia de sedes" in h:
        return elegir(["Solo sede central", "Varias sedes en Bolivia"])
    if "redes sociales" in h:
        return checkbox(["Facebook", "LinkedIn", "Instagram"])
    if "ano de inicio" in h:
        return str(random.randint(1995, 2020))
    if "pagina web" in h:
        return "https://empresa-ejemplo.test"
    if "whatsapp" in h:
        return f"591 7{random.randint(1000000, 9999999)}"
    if "representante" in h:
        return elegir(["María Perez", "Jorge Salazar", "Patricia Quiroga"])
    if "cargo del representante" in h:
        return elegir(["Gerente de Recursos Humanos", "Jefe de Tecnología", "Director Ejecutivo"])
    if "competencia" in h or "grid" in h or "carrera" in h:
        return elegir(["1 - Muy insuficiente", "2 - Insuficiente", "3 - Aceptable", "4 - Suficiente", "5 - Muy suficiente", "No observado"])
    if "competencia considera" in h or "nuevas areas" in h or "herramientas tecnologicas" in h or "habilidades" in h:
        return elegir(["Ciberseguridad y nube", "Automatización y datos", "Comunicación y resolución de problemas"])
    return elegir(["Totalmente de acuerdo", "Parcialmente de acuerdo", "No sabe"])


def generar(tipo: str, cantidad: int, salida: Path) -> Path:
    plantilla = plantilla_para(tipo)
    catalogo = cargar_catalogo(tipo)
    with plantilla.open("r", encoding="utf-8-sig", newline="") as archivo:
        encabezados = next(csv.reader(archivo))

    salida.mkdir(parents=True, exist_ok=True)
    destino = salida / f"{tipo}_random_{cantidad}.csv"
    with destino.open("w", encoding="utf-8-sig", newline="") as archivo:
        writer = csv.writer(archivo)
        writer.writerow(encabezados)
        for fila in range(1, cantidad + 1):
            ocurrencias: dict[str, int] = {}
            valores = []
            for encabezado in encabezados:
                clave = normalizar(encabezado)
                ocurrencias[clave] = ocurrencias.get(clave, 0) + 1
                if tipo == "titulados":
                    valor = valor_titulado(encabezado, ocurrencias[clave], fila, catalogo)
                else:
                    valor = valor_empleador(encabezado, ocurrencias[clave], fila, catalogo)
                valores.append(valor)

            # En una exportación con ramas, las columnas homónimas pueden
            # existir dos veces, pero una respuesta solo pertenece a una de
            # las ramas. Dejamos un único valor y vaciamos las demás.
            indices_por_columna: dict[str, list[int]] = {}
            for indice, encabezado in enumerate(encabezados):
                indices_por_columna.setdefault(normalizar(encabezado), []).append(indice)
            for indices in indices_por_columna.values():
                if len(indices) > 1:
                    elegido = random.choice(indices)
                    for indice in indices:
                        if indice != elegido:
                            valores[indice] = ""
            writer.writerow(valores)
    return destino


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera respuestas CSV ficticias para las encuestas.")
    parser.add_argument("--tipo", choices=["titulados", "empleadores", "ambos"], default="ambos")
    parser.add_argument("--cantidad", type=int, help="Cantidad para el tipo seleccionado.")
    parser.add_argument("--salida", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--seed", type=int, help="Semilla opcional para repetir exactamente la generación.")
    args = parser.parse_args()

    if args.cantidad is not None and args.cantidad < 1:
        parser.error("--cantidad debe ser mayor que cero")
    if args.seed is not None:
        random.seed(args.seed)

    trabajos = [("titulados", args.cantidad or 12)] if args.tipo == "titulados" else []
    if args.tipo == "empleadores":
        trabajos = [("empleadores", args.cantidad or 6)]
    if args.tipo == "ambos":
        trabajos = [("titulados", 12), ("empleadores", 6)]

    for tipo, cantidad in trabajos:
        destino = generar(tipo, cantidad, args.salida)
        print(f"Generado: {destino} ({cantidad} registros)")


if __name__ == "__main__":
    main()
