# Generador de CSV ficticios

Utilidad independiente del backend y del frontend para crear respuestas de prueba a partir de las plantillas CSV sintéticas versionadas y de las preguntas/opciones definidas en `form/`.

La herramienta no lee ni necesita la carpeta privada `/data`. Sus plantillas públicas están en `tools/generadores_csv_random/salida/` y no contienen respuestas reales.

No modifica los CSV originales. Conserva el orden de columnas y también los encabezados repetidos del CSV de titulados. Las respuestas de selección se toman del formulario real; los textos libres se generan como respuestas plausibles relacionadas con la pregunta.

En las columnas duplicadas del CSV de titulados, cada fila deja un único encabezado duplicado con respuesta y vacía los demás, simulando que solo una rama condicional fue contestada.

## Requisitos

- Python 3.10 o superior.
- No necesita instalar dependencias externas: utiliza únicamente la biblioteca estándar (`csv`, `random`, `argparse`, etc.).

## Uso

Desde la raíz del repositorio:

```powershell
python tools/generadores_csv_random/generar_csv_random.py --tipo ambos --seed 20261009
```

El comando anterior genera:

- `tools/generadores_csv_random/salida/titulados_random_12.csv`
- `tools/generadores_csv_random/salida/empleadores_random_6.csv`

Para generar solamente un tipo:

```powershell
python tools/generadores_csv_random/generar_csv_random.py --tipo titulados --cantidad 12
python tools/generadores_csv_random/generar_csv_random.py --tipo empleadores --cantidad 6
```

También se puede indicar otra carpeta de salida:

```powershell
python tools/generadores_csv_random/generar_csv_random.py --tipo ambos --salida C:\temp\csv-prueba
```

Los datos son ficticios y están pensados para pruebas de importación y analítica. No deben interpretarse como respuestas reales.

## Formulario de titulados

El generador carga `form/form_export_titulados00.json` para obtener las opciones actuales. La pregunta sobre formar parte de la red de contactos oficial de la carrera se genera con las opciones del formulario: `SI` o `No`.
