# Especificación de diseño UI: Analizador de Encuestas de la Carrera de Ingeniería en Sistemas (UMSS)

> **Nota para el diseñador:** este es un **proyecto académico de la materia "Taller de Simulación de Sistemas"** (UMSS). La bibliografía de la materia es *Simulación* de Sheldon M. Ross y *Simulación: un enfoque práctico* de Raúl Coss Bu. Se pide una **maqueta de muestra, sin funcionalidad implementada**, con datos ficticios. **No hay que complicarlo**: interfaz simple, componentes estándar, pocas funciones. Lo que no esté en este documento no hace falta diseñarlo.

---

## 1. Qué es (y qué no es) el producto

**Es:** una herramienta web que **solo analiza** los datos de dos encuestas de la Carrera de Ingeniería en Sistemas (proceso de autoevaluación para ARCUSUR):

1. **Encuesta a Titulados**.
2. **Encuesta a Empleadores**.

**No es:** un informe ni un documento. El *documento de Análisis de Mercado* es un **documento aparte**, que el equipo redactará usando los gráficos y tablas que exporte esta herramienta. La web no debe verse como un reporte maquetado: es un **panel de análisis**.

### 1.0 Regla de contenido: NADA de texto de informe

La herramienta **muestra datos; no los interpreta**. Las conclusiones, recomendaciones y justificaciones las escribe el equipo en el documento aparte. Por eso, en ninguna pantalla debe aparecer:

- Conclusiones, "hallazgos", "dictámenes" ni recomendaciones (ejemplo a evitar: *"Justifica la apertura prioritaria de programas…"*).
- Etiquetas de tipo informe como "Análisis estratégico", "Dictamen académico recomendado" o "Hallazgo de…".
- Referencias a criterios o indicadores de acreditación (ARCUSUR, "Criterio 2.4", "Pertinencia de posgrado").
- Reglas o marcos teóricos escritos en la interfaz (por ejemplo "Regla 80/20").
- Párrafos de texto narrativo dentro de tarjetas.
- **Términos internos del documento de la materia o del equipo:** "HU", "HU1" a "HU5", "historia de usuario", "Producto Final", "Enunciado Director", "guía", "entregable", "P12" o cualquier número de pregunta. Son jerga de gestión del proyecto y no tienen sentido para quien usa la herramienta. Tampoco van en títulos de pantalla, pestañas, menús, tooltips ni datos de ejemplo. Las pantallas se llaman por lo que muestran ("Perfil y empleabilidad", "Financiamiento"), nunca por un código.
- Etiquetas o categorías puestas sobre respuestas abiertas (por ejemplo "Cloud / DevOps", "Ciberseguridad"): el formulario no las trae y clasificarlas sería otro análisis que la herramienta no hace.

**Sí debe aparecer:** cifras, gráficos, tablas, filtros y etiquetas cortas y neutras. Los títulos de tarjeta son **descriptivos, no interpretativos**: "Áreas de posgrado de interés (n = 14)", no "Hallazgo de concentración temática". Una tarjeta no lleva más texto que su título, su cifra o gráfico y una nota "n = X". La única excepción es un tooltip (i) que define qué mide el gráfico, sin conclusiones.

La herramienta debe permitir *experimentar y analizar diferentes escenarios*. En la UI esto se resuelve con **filtros** (ver sección 4) y con la pantalla de **Simulación de escenarios** (ver 6.12). La simulación se hace sobre los datos de titulados.

### 1.1 Volumen de datos (importante para el diseño)

Cada encuesta tendrá **entre 5 y 20 respuestas como máximo**. Esto cambia varias decisiones:

- Mostrar siempre **conteos** (ejemplo "7 de 14") junto al porcentaje. Un porcentaje solo engaña con tan pocas respuestas.
- Preferir gráficos simples: **barras, puntos y tablas**. Evitar histogramas finos o gráficos que necesiten cientos de datos.
- Mantener pocos filtros: con 14 registros, filtrar demasiado deja casi nada. Mostrar un aviso cuando queden menos de 5 registros.
- En la prueba Chi-cuadrada, casi siempre habrá celdas con frecuencia esperada menor a 5. La pantalla debe mostrar ese **aviso** (ver 6.5).

**Reglas de datos (según el tipo de pregunta de los formularios):**

- **El "n" de cada gráfico es el número de personas que respondieron esa pregunta**, no el total de la encuesta. Los formularios tienen ramas (quien no trabaja no ve las preguntas de trabajo, quien no cursó posgrado no ve las de posgrado cursado), así que casi todos los gráficos tendrán un n menor al total.
- **Datos personales:** nombre, correo, teléfono, LinkedIn y los datos de identificación de las organizaciones (nombre, NIT, razón social, nombre comercial, WhatsApp, representante, página web) **nunca se muestran** ni aparecen como variables de gráficos o cruces. El formulario de empleadores promete anonimato.
- **Texto libre** (cargo escrito, rubro escrito, vínculo laboral, preguntas abiertas): no se grafica.
- **Escalas con orden natural** (edad, antigüedad, remuneración, tamaño de organización, tiempo hasta el primer empleo, número de empleos, nivel de posgrado): las barras van **en el orden de la escala**, no ordenadas por frecuencia.
- **Opción única sin orden natural** (área de posgrado, rubro, medio de convocatoria, departamento): barras horizontales **ordenadas de mayor a menor**. Solo en estas se puede mostrar % acumulado.
- **Casillas** (varias respuestas por persona): barras horizontales con el % calculado sobre las personas que respondieron (la suma pasa de 100 %) y la nota "Varias respuestas posibles". Sin % acumulado y sin dona.
- **Preguntas opcionales** (por ejemplo la situación laboral): si hay personas que no respondieron, mostrar una categoría gris "Sin respuesta".
- **Escalas de acuerdo** (Likert de 3 o 4 niveles): barras apiladas horizontales con el conteo dentro de cada segmento. "No sabe" y "No observado" van siempre aparte, en gris.
- Usuario: un solo tipo, el comité de evaluación o la dirección de carrera. **No hay inicio de sesión, roles ni administración.**

### 1.2 Qué debe cubrir la herramienta

| Tema | Pantalla |
|---|---|
| Antigüedad y empleabilidad | 6.3 Perfil y empleabilidad (Titulados) |
| Formación continua y áreas de interés | 6.4 Formación continua (Titulados) |
| Financiamiento (tabla de contingencia y Chi-cuadrada) | 6.5 Financiamiento (Titulados) |
| Brechas de competencias (escala 1 a 5) | 6.6 Brechas (Titulados) y 6.10 Brechas (Empleadores) |
| Tablas cruzadas, gráficos y exportación | 6.7 y 6.11 Cruces y exportar (una por encuesta) |
| Experimentación por simulación | 6.12 Simulación de escenarios (Titulados) |

### 1.3 Fuera de alcance

Inicio de sesión, usuarios y roles, bitácora, modo oscuro, versión tablet o móvil, guardado de escenarios, historial de cargas, diagrama de ramificación del formulario.

---

## 2. Tipo de web

- **Aplicación web tipo dashboard**, una sola página con barra lateral. **Solo escritorio** (1366 a 1440 px).
- Estilo **sobrio y limpio**: fondo claro, tarjetas blancas, mucho espacio en blanco.
- Idioma: español. Decimales con coma (`3,5`), fechas `dd/mm/aaaa`.
- No es una landing page ni un sitio público.

---

## 3. Sistema visual

### 3.1 Colores

| Token | Hex | Uso |
|---|---|---|
| `primary-900` | `#0B2A4A` | Barra lateral |
| `titulados` | `#1F6FB5` | **Color de la sección Titulados** (botones, serie principal de sus gráficos) |
| `titulados-100` | `#E3EEF8` | Fondo de elementos activos en Titulados |
| `empleadores` | `#14A39A` | **Color de la sección Empleadores** (misma función) |
| `empleadores-100` | `#E1F4F2` | Fondo de elementos activos en Empleadores |
| `highlight` | `#F2A33A` | Resaltar un dato puntual (barra seleccionada, línea de referencia, aviso de muestra pequeña) |
| `ink-900` | `#0F172A` | Texto principal |
| `ink-600` | `#475569` | Texto secundario y ejes |
| `line` | `#CBD5E1` | Bordes y divisores |
| `bg` | `#F1F5F9` | Fondo de la app |
| `surface` | `#FFFFFF` | Tarjetas y tablas |
| `success` / `warning` / `danger` | `#2E9E5B` / `#E0A100` / `#D64545` | Estados |

**La idea:** cada sección tiene su color, para que el usuario siempre sepa en cuál está. En la barra lateral, el encabezado de cada grupo y el ítem activo toman ese color. Cuando se comparan ambas encuestas, Titulados siempre es azul y Empleadores siempre es verde azulado.

**Colores para gráficos de varias categorías (en este orden):**
`#1F6FB5` · `#14A39A` · `#F2A33A` · `#8E5BD0` · `#E4572E` · `#5C6B7A` · `#7CB342` · `#D9418C`

**Mapa de calor de frecuencias (azul secuencial):**
`#EAF2FA` → `#BBD6EE` → `#7DB1DD` → `#3F86C4` → `#1F6FB5` → `#12467A`
(texto blanco cuando el fondo es `#3F86C4` o más oscuro).

**Mapa de calor de brechas (escala 1 a 5, divergente naranja-azul):**
`#E4572E` (1) → `#F4A98A` (2) → `#F1F5F9` (3) → `#8DB8E0` (4) → `#1F6FB5` (5)
Siempre mostrar el **número dentro de la celda**, no solo el color.

**Escalas de acuerdo de 3 o 4 niveles (sin punto neutro):** usar los extremos y los intermedios de la misma gama, de menos a más:
- 4 niveles (titulados): `#E4572E` · `#F4A98A` · `#8DB8E0` · `#1F6FB5`
- 3 niveles (empleadores: Totalmente en desacuerdo, Parcialmente de acuerdo, Totalmente de acuerdo): `#E4572E` · `#8DB8E0` · `#1F6FB5`
- "No sabe", "No observado" y "Sin respuesta": gris `#94A3B8`.

### 3.2 Tipografía

Familia **Inter** (o Source Sans 3). Números de tablas con cifras tabulares.

| Estilo | Tamaño | Peso | Uso |
|---|---|---|---|
| Título de pantalla | 28 px | 600 | Una vez por pantalla |
| Título de tarjeta | 18 px | 600 | Cada gráfico o tabla |
| Cifra de KPI | 32 px | 600 | Tarjetas de indicadores |
| Cuerpo | 14 px | 400 | Texto general |
| Nota | 12 px | 400 | Ejes, "n = …" |

### 3.3 Componentes (estados: normal, hover, foco, deshabilitado)

Botones (primario, secundario, texto), selector desplegable, selector múltiple, slider de rango, zona de carga de archivos, tarjeta KPI, tarjeta de gráfico, tabla simple, pestañas, tooltip, aviso y estado vacío.

Detalles generales (se definen una vez, ver 3.5): bordes de 8 px, sombra muy suave en tarjetas, espaciado en múltiplos de 8 px, íconos de línea de un solo set (por ejemplo Lucide).

### 3.4 Accesibilidad mínima

Buen contraste en textos, no comunicar nada solo con color y foco visible en elementos interactivos.

### 3.5 Consistencia: reglas para no improvisar

Esta maqueta se arma **una sola vez con piezas reutilizables** y se repite en todas las pantallas. Si algo se ve distinto entre dos pantallas, debe haber una razón escrita en este documento; si no la hay, es un error.

1. **Crear los estilos globales antes de dibujar pantallas:** colores (los tokens de 3.1), estilos de texto (3.2), efectos de sombra y radios de borde. Nunca poner un color o un tamaño de letra a mano: siempre usar el estilo global. Si un color no está en este documento, no se usa.
2. **Crear componentes maestros una vez y reutilizarlos:** barra lateral, encabezado de pantalla, tarjeta KPI, tarjeta de gráfico, tabla, selector, pestañas, aviso, estado vacío. Cada pantalla usa **instancias** de esos componentes, no copias editadas a mano. Si hay que cambiar algo, se cambia en el componente maestro y se actualiza en todas partes.
3. **Una sola cuadrícula y un solo espaciado para todo el producto:** el mismo ancho de contenido, los mismos márgenes y los mismos múltiplos de 8 px. Las tarjetas de una misma fila tienen la misma altura.
4. **Una variante por tipo de gráfico, no una por pantalla.** Todas las barras horizontales se ven igual, todas las barras apiladas se ven igual, todos los mapas de calor se ven igual. Lo único que cambia es el dato y el color de la sección.
5. **La estructura de cada pantalla es siempre la misma:** título de pantalla, fila de filtros, tarjetas de KPI (si las hay) y tarjetas de gráficos. No inventar una disposición distinta para una pantalla "porque se ve mejor".
6. **El color significa siempre lo mismo:** azul = Titulados, verde azulado = Empleadores, naranja = resaltar un dato, gris = sin respuesta o "no sabe". No usar un color decorativo.
7. **Los mismos nombres en todas partes:** si una pantalla se llama "Perfil y empleabilidad" en el menú, el título de la pantalla dice exactamente eso, no una variante. Lo mismo con filtros, botones y etiquetas de ejes.
8. **Ante la duda, copiar lo que ya existe:** si falta un detalle para una pantalla, se reutiliza el de una pantalla similar. No se crea un componente nuevo ni se agrega un elemento que este documento no pida.
9. **Nombrar bien las capas y los componentes** (por ejemplo `Tarjeta/Grafico/Barras`, `Tarjeta/KPI`) para que cualquiera del equipo entienda la maqueta.
10. **Revisión final antes de entregar:** poner todas las pantallas lado a lado y comprobar que los títulos, márgenes, colores y tamaños de letra coinciden. Si una pantalla se ve "de otro producto", corregirla.

---

## 4. Estructura general

```
┌────────────────┬─────────────────────────────────────────────┐
│  BARRA LATERAL │  Título de la pantalla  [chip: Titulados]   │
│  (240 px)      ├─────────────────────────────────────────────┤
│                │  FILTROS (una fila) + contador              │
│  Cargar datos  ├─────────────────────────────────────────────┤
│  ── TITULADOS  │  Contenido: tarjetas, gráficos, tablas      │
│   (7 ítems)    │                                             │
│  ── EMPLEADORES│                                             │
│   (4 ítems)    │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

**Barra lateral** (fondo `primary-900`, texto blanco):

- **Cargar datos**
- **TITULADOS** (encabezado en azul)
  1. Resumen
  2. Perfil y empleabilidad
  3. Formación continua
  4. Financiamiento
  5. Brechas de competencias
  6. Cruces y exportar
  7. Simulación de escenarios
- **EMPLEADORES** (encabezado en verde azulado)
  1. Resumen y contratación
  2. Valoración de la Carrera
  3. Brechas de competencias
  4. Cruces y exportar

**Chip de sección:** junto al título de cada pantalla, una etiqueta con el color de la sección ("Titulados" o "Empleadores").

**Filtros** (una sola fila, solo en pantallas de análisis):

| Sección | Filtros |
|---|---|
| Titulados | Año de titulación (slider), Estado laboral (selector múltiple), Sector (selector múltiple) |
| Empleadores | Tipo de organización (Público/Privado), Tamaño (selector múltiple) |

Debajo: contador **"Mostrando 11 de 14 respuestas"** y botón "Limpiar filtros". Cambiar los filtros es la forma de "experimentar escenarios".

**Reglas en todos los gráficos:**

- Pie con **"n = X"**.
- Ícono **(i)** con un tooltip que define qué mide el gráfico y cómo se calcula (por ejemplo "Desviación estándar: dispersión de los valores respecto a la media"). **Sin conclusiones ni recomendaciones.**
- Ícono de **exportar** (imagen o CSV).

---

## 5. Flujo de usuario

```
Abrir la herramienta
      │
      ▼
Cargar datos  (JSON de estructura + CSV/Excel de respuestas, por encuesta)
      │
      ├────────────────────────────┬───────────────────────────────┐
      ▼                            ▼                               │
SECCIÓN TITULADOS            SECCIÓN EMPLEADORES                   │
Resumen                      Resumen y contratación                │
 ├─ Perfil y empleabilidad    ├─ Valoración de la Carrera          │
 ├─ Formación continua        ├─ Brechas de competencias           │
 ├─ Financiamiento            └─ Cruces y exportar                 │
 ├─ Brechas de competencias                                        │
 └─ Cruces y exportar                                              │
      │                            │                               │
      └────────────► Exportar tablas y gráficos ◄──────────────────┘
                     (para armar el documento de Análisis de Mercado)
```

**Reglas del flujo:**

- Se entra siempre por **Cargar datos** si no hay encuestas; si ya hay, se entra al Resumen de Titulados.
- Cada sección es independiente: sus filtros no afectan a la otra.
- La **Simulación de escenarios** (Titulados) usa los datos de titulados ya cargados y respeta los filtros globales de esa sección. Se abre desde la barra lateral, como las demás pantallas.
- Los gráficos y tablas exportados son lo que el equipo usa después en el documento.

**Estados a mostrar:**

| Estado | Qué mostrar |
|---|---|
| Sin datos cargados | "Aún no hay encuestas cargadas" + botón "Cargar datos" |
| Pocos registros tras filtrar (< 5) | Aviso ámbar: "Quedan pocos registros, interprete con cautela" |
| Sin registros | "Ningún registro coincide" + botón "Limpiar filtros" |

---

## 6. Detalle de cada pantalla

> Usar **datos ficticios**: unos **14 titulados** y **8 empleadores**, con las categorías reales de las encuestas (ver sección 7).

### 6.1 Cargar datos

- Dos tarjetas lado a lado: **Titulados** y **Empleadores**, cada una con su color.
- En cada tarjeta, dos zonas de arrastrar y soltar: "Estructura del formulario (.json)" y "Respuestas (.csv / .xlsx)".
- Tras cargar: **filas leídas**, **preguntas detectadas** y **% de completitud**, más una tabla pequeña de preguntas (número, texto, tipo).
- Debe avisar de valores inválidos en campos numéricos (por ejemplo un año de titulación o los años de vida profesional escritos como texto).
- Botón primario **"Procesar"** en cada tarjeta.

### 6.2 Titulados: Resumen

- **4 tarjetas KPI:** titulados encuestados (14), con trabajo (11 de 14), mediana de años desde la titulación (6), interesados en posgrado (10 de 14).
- **Dona** de estado laboral (Trabaja / No trabaja / Emprendimiento).
- **Barras horizontales** de áreas de posgrado de interés.

### 6.3 Titulados: Perfil y empleabilidad

**Pestañas:** Perfil · Trabajo actual · Sin empleo · Primer empleo · Emprendimiento.

**Pestaña Perfil** (todas las personas):

- **3 tarjetas de estadísticos** de años desde la titulación (año de titulación): media, mediana, desviación estándar.
- **Gráfico de puntos** (o barras por año) del año de titulación, con marcas de media y mediana.
- **Segmentación Junior vs. Consolidado:** slider de umbral (por defecto 5 años) y dos tarjetas con el conteo y % de cada grupo.
- **Dona** de estado laboral: trabaja en una organización / no trabaja / emprendimiento propio / sin respuesta.
- **Barras apiladas** de sector: Público, Privado, Independiente, ONG, No trabaja.
- **Barras** de edad (en orden de rangos), **dona** de género y una tarjeta con media, mediana y desviación estándar de los años de vida profesional y de los años de desempleo (opcional, mostrar su n).

**Pestaña Trabajo actual** (solo quienes trabajan en una organización):

- **Barras ordenadas de mayor a menor:** rubro, departamento, cargo, medio por el que obtuvo el trabajo.
- **Barras en orden natural:** antigüedad en el trabajo y remuneración mensual.
- **Barras** de áreas dentro de la organización (casillas: "Varias respuestas posibles").
- **Barra apilada de 4 niveles:** pertinencia del trabajo respecto a la formación en Ingeniería en Sistemas.

**Pestaña Sin empleo** (solo quienes indican que no trabajan): **barras ordenadas de mayor a menor** de la razón por la que no trabajan en un empleo relacionado con su formación (8 opciones) y **tarjeta KPI** de quienes han tenido algún trabajo antes ("X de Y").

**Pestaña Primer empleo** (solo quienes llegan a esa sección del formulario: no trabajan pero han trabajado antes, o su empleo actual es su primer empleo): **tarjeta KPI** "El empleo actual es su primer empleo: X de Y" (quienes trabajan o emprenden) y **barras en orden natural** del tiempo que tardaron en conseguir su primer trabajo, con un tooltip (i) que indica quiénes responden (solo quienes no trabajan y han trabajado antes, o cuyo empleo actual es el primero) y el n visible, por ejemplo "n = 6 de 14". **No se grafica el número de empleos:** quien llega a esa sección con su empleo actual como primero tiene un solo empleo, y quien ya tuvo varios empleos y trabaja hoy no responde la pregunta, así que el gráfico no representaría a las personas encuestadas. El número de empleos sigue disponible como variable en Cruces.

**Pestaña Emprendimiento** (quienes dedican su tiempo a un emprendimiento): **barras** de origen del emprendimiento, tipo de entregable y financiamiento externo; **barras apiladas** de satisfacción con el negocio (3 niveles) y de importancia de la formación en Ingeniería en Sistemas (4 niveles).

- Tooltip (i) con la definición de cada estadístico (media, mediana, desviación estándar).

### 6.4 Titulados: Formación continua

**Pestañas:** Posgrado cursado · Interés en posgrado · Opinión sobre el posgrado de la FCyT. El formulario separa lo que la persona **ya cursó** de lo que le **interesa cursar**; no deben mezclarse en un mismo gráfico.

**Posgrado cursado** (solo quienes respondieron Sí a la pregunta sobre formación complementaria):

- **Tarjeta KPI:** "Cursó o cursa un programa de formación complementaria: 6 de 14".
- **Barras** del nivel más alto cursado (en orden natural, 5 niveles), lugar donde lo cursó (ordenadas de mayor a menor) y fuente de financiamiento.

**Interés en posgrado** (solo quienes respondieron SI a la pregunta sobre interés en posgrado):

- **Sub-pestañas:** Nivel de interés · Área · Modalidad · Organización preferida.
- **Tabla de frecuencias:** categoría, frecuencia absoluta, frecuencia relativa (%) y % acumulado. El % acumulado solo en Área y Organización, que son de opción única sin orden natural.
- **Barras:** ordenadas de mayor a menor en Área y Organización, con la línea de % acumulado (versión simple de Pareto); en orden natural en Nivel y Modalidad.
- **Tarjeta KPI de concentración** (solo en Área): solo la cifra con una etiqueta neutra, por ejemplo *"Top 2 acumulado: 8 de 14 (57 %)"*. Sin frase de conclusión.

**Opinión sobre el posgrado de la FCyT** (todas las personas): una **barra apilada de 4 niveles** (Totalmente en desacuerdo → Totalmente de acuerdo).

### 6.5 Titulados: Financiamiento

- **Gráfico de barras** de la fuente de financiamiento estimada para estudios de posgrado (Recursos propios, Becas estatales, Créditos educativos, Patrocinio empresarial), ordenadas de mayor a menor, con el n visible.
- Dos selectores: variable de filas y variable de columnas. **Valores por defecto:** filas = "Fuente de financiamiento estimada" y columnas = "Nivel de posgrado de interés", porque esa es la comparación principal de la pantalla. Alternativas: columnas = área de interés o modalidad; filas = fuente de financiamiento del posgrado cursado.
- Las dos variables por defecto las responden las mismas personas (quienes tienen interés en posgrado), así que el n del cruce es el de ese grupo (por ejemplo "n = 10 de 14"). Debe verse grande y claro.
- *(Nota para el diseñador: la pregunta sobre el financiamiento del posgrado ya cursado es otra, sobre el financiamiento del posgrado ya cursado, con otras opciones: recursos propios, beca total y beca parcial. Si se elige como variable, las etiquetas de los selectores deben decir "posgrado cursado".)*
- **Tabla de contingencia** con frecuencias y totales, con conmutador "frecuencia / % por fila".
- **Mapa de calor** de la misma tabla.
- **Cuadro de resultado Chi-cuadrada:** χ², grados de libertad, p-valor y una insignia neutra **"p < α"** o **"p ≥ α"** (α = 0,05). Sin frases de conclusión.
- **Aviso visible (ámbar) por muestra pequeña:** *"X de Y celdas tienen frecuencia esperada menor a 5; el resultado es orientativo."*

### 6.6 Titulados: Brechas de competencias

- **Pestañas:** Hard skills · Soft skills · Satisfacción y pertinencia · Malla y asignaturas.
- **Hard skills y Soft skills:**
  - **Mapa de calor:** competencias en filas, escala 1 a 5 en columnas, con el **conteo** de respuestas en cada celda.
  - **Tabla** con media y desviación estándar por competencia.
  - **Gráfico de radar** con la media por competencia.
- **Satisfacción y pertinencia:** una **barra apilada de 4 niveles** por cada afirmación (satisfacción global con la formación recibida; concordancia entre la formación y los requerimientos laborales).
- **Malla y asignaturas (todas de casillas):** cuatro gráficos de **barras horizontales ordenadas de mayor a menor**, cada uno con la nota "Varias respuestas posibles": aspectos de la Carrera que resultaron útiles, aspectos que pueden mejorarse, asignaturas que dieron ventaja competitiva y asignaturas poco útiles. Los dos gráficos de asignaturas van separados porque sus listas de asignaturas son distintas.
- Las respuestas de texto libre del formulario **no se muestran** en la herramienta: la pantalla es un diagnóstico cuantitativo (medias y desviaciones estándar).

### 6.7 Titulados: Cruces y exportar

Tres zonas:

- **Izquierda (configuración):** variable de filas, variable de columnas, métrica (frecuencia, % por fila, % por columna) y botón **"Generar"**. Solo se ofrecen variables de opción única y escalas: no casillas, texto libre ni datos personales.
- **Centro (vista previa):** pestañas *Tabla · Mapa de calor · Barras*.
- **Derecha (exportar):** botones **CSV · Excel · PNG**.

### 6.8 Empleadores: Resumen y contratación

- **4 tarjetas KPI:** organizaciones encuestadas (8), han contratado ingenieros en los últimos 5 años (6 de 8), con alta probabilidad de contratar (3 de 8), organizaciones privadas (5 de 8).
- **Barras:** tipo de organización, tamaño (en orden Micro → Grande), departamento, presencia de sedes y rubro (15 categorías, ordenadas de mayor a menor).
- **Barras:** nivel de formación que demandan (en orden natural), medio de convocatoria y tipo de cargos que desempeñan los titulados.
- Los datos de identificación de la organización (nombre, NIT, razón social, representante, WhatsApp, página web) no se muestran.

### 6.9 Empleadores: Valoración de la Carrera

- **Barras apiladas horizontales**, una por afirmación (por ejemplo "La Carrera brinda confianza a nuestra organización"), con las opciones: Totalmente de acuerdo, Parcialmente de acuerdo, Totalmente en desacuerdo, No sabe.
- Dos pestañas: **Formación y perfil** · **Relación con la Carrera**.
- Mostrar el conteo dentro de cada segmento. La pestaña Formación y perfil tiene 10 afirmaciones y la pestaña Relación con la Carrera tiene 8.
- Los enunciados son largos: mostrarlos truncados a 2 líneas, con el texto completo en un tooltip. "No sabe" va aparte, en gris.
- Las preguntas abiertas del formulario de empleadores tampoco se muestran: solo análisis cuantitativo.

### 6.10 Empleadores: Brechas de competencias

- Mismo mapa de calor, tabla y radar que las pestañas Hard skills y Soft skills de 6.6, con la visión del empleador. No lleva las pestañas de satisfacción ni de asignaturas.
- La opción "No observado" **no entra en la media ni en la desviación estándar**: se muestra como una columna gris aparte, con su conteo.

### 6.11 Empleadores: Cruces y exportar

Igual a 6.7, con las variables de la encuesta de empleadores (tipo, tamaño, rubro, probabilidad de contratación, etc.).

### 6.12 Titulados: Simulación de escenarios

Pantalla simple, de una sola vista y sin pestañas. Responde a: *"si se repitiera la encuesta con más personas, ¿cuánto puede variar el resultado?"*. La simulación toma las frecuencias observadas como probabilidades y sortea personas con ellas, repitiendo el proceso muchas veces.

- **Izquierda (parámetros):**
  - **Variable a simular:** selector. Por defecto el área de posgrado de interés; alternativas: nivel de interés y modalidad preferida.
  - **Personas a simular (N):** campo numérico, por ejemplo 100.
  - **Repeticiones:** campo numérico, por ejemplo 1.000.
  - **Semilla:** campo numérico.
  - **"Ajustar probabilidades" (opcional, plegable):** un deslizador por categoría. Al mover uno, las demás se reajustan para sumar 100 %. Un botón "Restablecer" vuelve a los valores observados.
  - Botón primario **"Ejecutar simulación"**.
- **Centro (gráfico):** barras horizontales, una por categoría, con el porcentaje simulado promedio y una **barra de error** que marca el rango del 95 %.
- **Debajo (tabla única):** una fila por categoría y las columnas *Observado · Simulado (promedio) · Rango 95 %*. Si se ajustaron probabilidades, aparece una columna más, *Escenario*, con el resultado del ajuste.
- **Nota de base visible:** "Probabilidades tomadas de las respuestas observadas (n = 10 de 14)".
- Nada más: sin histogramas por réplica, sin filtros propios y sin pruebas adicionales.

---

## 7. Datos de ejemplo para la maqueta

- **Estado laboral:** Trabaja en una organización / No trabaja / Emprendimiento propio.
- **Género:** Hombre, Mujer (y las demás opciones que defina el formulario).
- **Sector:** Público, Privado, Independiente, ONG, No trabaja.
- **Nivel de posgrado:** Diplomado, Especialidad, Maestría, Doctorado.
- **Áreas de interés:** IA, Robótica, Ingeniería de Software, Base de Datos, Redes de Datos y Seguridad, Ciencia de Datos, Ciberseguridad.
- **Modalidad:** Presencial, Virtual, Híbrida, Modular (fines de semana).
- **Financiamiento del posgrado cursado:** Recursos propios, Beca total, Beca parcial.
- **Financiamiento estimado para estudios de posgrado:** Recursos propios, Becas estatales, Créditos educativos, Patrocinio empresarial.
- **Competencias hard:** Programación y desarrollo de software, Bases de datos, Redes e infraestructura, Seguridad informática, Análisis de datos, Ingeniería de requisitos, Gestión de proyectos, Cloud / DevOps.
- **Competencias soft:** Comunicación oral y escrita, Trabajo en equipo, Resolución de problemas, Liderazgo, Inglés técnico, Aprendizaje autónomo.
- **Escala:** 1 Muy insuficiente · 2 Insuficiente · 3 Aceptable · 4 Suficiente · 5 Muy suficiente.
- **Escala de acuerdo (titulados):** Totalmente en desacuerdo · En desacuerdo · De acuerdo · Totalmente de acuerdo.
- **Asignaturas (ejemplos reales del formulario):** Introducción, Base de Datos, Inteligencia Artificial, Redes de Computadora, Electivas, T.I.S., Básicas (Física, Cálculo, Álgebras), Planificación de Proyectos y Gestión, Tecnología Redes Avanzadas, Telefonía IP, Web Semánticas, Graficación por Computadora, Robótica, Programación Funcional, Teoría de Grafos, Contabilidad Básica.
- **Remuneración mensual (rangos):** Menor a Bs. 2.500 · Bs. 2.500 a 3.500 · Bs. 3.501 a 5.000 · Bs. 5.001 a 7.000 · Bs. 7.001 a 10.000 · Más de Bs. 10.000.
- **Empleadores, tipo:** Público, Privado. **Tamaño:** Grande, Mediana, Pequeña, Micro.
- **Empleadores, valoración:** Totalmente de acuerdo, Parcialmente de acuerdo, Totalmente en desacuerdo, No sabe.

---

## 8. Entregables esperados

1. **Guía de estilo breve** (colores de cada sección, tipografía, componentes principales).
2. **Maquetas de escritorio** de las pantallas 6.1 a 6.12.
3. **Prototipo navegable simple** con el flujo: Cargar datos → Resumen de Titulados → una pantalla de análisis → Cruces y exportar → cambio a la sección Empleadores.
4. Archivo editable (Figma) con componentes reutilizables.

## 9. Criterios de calidad

- Cada gráfico se entiende sin explicación externa: título descriptivo, "n =" y tooltip (i) de definición.
- La herramienta no interpreta: cero conclusiones, recomendaciones ni referencias a criterios de acreditación (ver 1.0).
- El usuario siempre sabe en qué sección está (color y chip).
- Con tan pocos datos, nada debe verse "vacío" ni engañoso: conteos visibles y avisos de muestra pequeña.
- Interfaz simple: priorizar claridad sobre cantidad de funciones.
- Consistencia total: mismos componentes, estilos y nombres en las doce pantallas, construidos desde estilos globales y componentes maestros (ver 3.5).
