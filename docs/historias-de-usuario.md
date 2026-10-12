# Historias de Usuario y Decisiones Técnicas — SimulacionEM

## Objetivo del producto final

> Contar con una herramienta de software de colección de datos que permita **experimentar y analizar
> diferentes escenarios** que permitan entender y apoyar la toma de decisiones de gestión académica que
> potencia permanentemente la capacidad académica y de fuerza laboral de los profesionales que salen de
> la **Universidad Mayor de San Simón (UMSS)**.

Consecuencia directa: el sistema no es solo un formulario + reportes. Tiene dos pilares de igual peso:

1. **Recolección limpia** (módulo `encuesta`): datos categóricos/numéricos cerrados, listos para análisis.
2. **Experimentación de escenarios** (módulo `analitica`): estadística descriptiva e inferencial sobre
   datos reales **y** simulación (Monte Carlo, Transformada Inversa) para responder preguntas *what-if*.

---

## HU1 — Registro de Antigüedad y Empleabilidad

**Enunciado:** Como titulado de Ingeniería en Sistemas, quiero registrar mi año de egreso, estado de
ocupación actual y sector de desempeño, para que la dirección de carrera conozca el perfil temporal y la
tasa de inserción de mi cohorte.

- **Implementación sugerida:** año de egreso numérico obligatorio; dropdowns cerrados para sector y
  estado laboral.
- **Interpretación:** media, mediana y desviación estándar de los años desde la titulación. Segmenta la
  muestra en profesionales junior (alta demanda de especialización inicial) y mandos consolidados.

### Decisiones de implementación

| Aspecto | Decisión |
|---|---|
| Año de egreso | `Integer`, rango `[1980, año actual]`. El máximo es dinámico → validador custom `@AnioEgresoValido` (no `@Max` fijo). |
| Antigüedad | **No se persiste**; se calcula en el análisis (`añoReferencia - anioEgreso`). Si se guardara, quedaría obsoleta cada año. |
| Estado de ocupación | Enum `EstadoOcupacion` (ej. `EMPLEADO_DEPENDIENTE`, `INDEPENDIENTE`, `EMPRENDEDOR`, `DESEMPLEADO_BUSCANDO`, `INACTIVO`). |
| Sector | Enum `SectorDesempeno`. **Obligatorio solo si el estado implica empleo** → validación condicional a nivel de clase (`@SectorCoherenteConEstado`), replicada en el frontend (el campo se oculta si no aplica). |
| Tasa de inserción | `ocupados / (ocupados + desempleados buscando)` por cohorte; los inactivos se excluyen del denominador (definición de población económicamente activa). |
| Segmentación junior / consolidado | Umbrales **configurables** (`application.yml`, p. ej. junior ≤ 3 años, consolidado ≥ 10), no hardcodeados: el comité puede redefinirlos y es un parámetro de escenario. |
| Estadística | `DescriptiveStatistics` (Commons Math): `getMean()`, `getPercentile(50)`, `getStandardDeviation()`. |

---

## HU2 — Preferencias de Formación Continua y Áreas de Interés

**Enunciado:** Como titulado, quiero indicar el nivel de posgrado de mi interés (Maestría, Especialidad,
Doctorado) y el área temática prioritaria, para que la universidad oriente su oferta académica.

- **Implementación sugerida:** selección múltiple con límite o selección única jerárquica.
- **Interpretación:** frecuencias absolutas y relativas; detectar concentraciones críticas (ej. Ciencia
  de Datos + Ingeniería de Software > 70 %) que justifiquen nuevos programas.

### Decisiones de implementación

| Aspecto | Decisión |
|---|---|
| Nivel de posgrado | Selección única, enum `NivelPosgrado` (`DIPLOMADO`, `ESPECIALIDAD`, `MAESTRIA`, `DOCTORADO`, `NINGUNO`). `NINGUNO` es necesario para no forzar respuestas falsas. |
| Área temática | **Área prioritaria = selección única** (categorías mutuamente excluyentes → frecuencias relativas suman 100 % y el dato es apto para χ²). Opcional: 2.ª y 3.ª preferencia **rankeadas**, usadas solo en análisis complementarios. |
| Jerarquía | Área → subárea (ej. Ciencia de Datos → ML / BI / Big Data). Se analiza en el nivel de área; la subárea da detalle. |
| Por qué no multiselección libre | Rompe la suma al 100 % (hay que distinguir "% de respuestas" vs "% de encuestados") e invalida χ² (una observación caería en varias celdas). |
| Concentración | `Frequency` (Commons Math: `getPct`, `getCumPct`) + Pareto de las top-k áreas con **umbral configurable** (default 70 %). Complementar con índice Herfindahl-Hirschman como medida única de concentración. |

---

## HU3 — Identificación de Mecanismos de Financiamiento

**Enunciado:** Como titulado, quiero reportar las fuentes de financiamiento estimadas para mis futuros
estudios (recursos propios, becas estatales, créditos educativos o patrocinio empresarial), para que la
institución detecte restricciones económicas y gestione alianzas.

- **Implementación sugerida:** selección categórica nominal, mutuamente excluyente o ponderada.
- **Interpretación:** tablas de contingencia contra el tipo de posgrado + prueba χ² de independencia.

### Decisiones de implementación

| Aspecto | Decisión |
|---|---|
| Tipo de dato | **Fuente principal, mutuamente excluyente** (enum `FuenteFinanciamiento`). La variante ponderada (porcentajes que suman 100) no es compatible con χ²; si se requiere, se guarda aparte y solo alimenta la simulación. |
| Contingencia | `financiamiento × nivelPosgrado` (y opcionalmente `× sector`). Construida en `analitica` a partir de proyecciones de lectura. |
| Filas/columnas vacías | `ChiSquareTest` de Commons Math falla si una fila o columna suma 0 → eliminar marginales cero antes de calcular. **Pendiente en `TablaContingencia`.** |
| Supuesto de Cochran | Verificar que ≥ 80 % de las celdas tengan frecuencia esperada ≥ 5 y ninguna < 1. Si no se cumple: (a) fusionar categorías, o (b) **p-valor por simulación Monte Carlo** (permutaciones), que aprovecha el motor de simulación del proyecto. |
| Tamaño del efecto | Reportar **V de Cramér** junto al p-valor: con muestras grandes χ² siempre sale significativo; V indica si la dependencia es relevante. |
| Lectura para el comité | Residuos estandarizados por celda → muestran *qué* combinación causa la dependencia (ej. Doctorado × recursos propios), base para convenios con banca y becas. |

---

## HU4 — Evaluación de Brechas en Competencias Profesionales

**Enunciado:** Como titulado con experiencia, quiero evaluar la suficiencia de las competencias técnicas
(hard skills) y transversales (soft skills) de mi formación frente a los requerimientos de mi puesto,
para retroalimentar la malla curricular.

- **Implementación sugerida:** escalas Likert 1–5 + texto estructurado opcional.
- **Interpretación:** puntajes medios y desviaciones estándar como evidencia para pares evaluadores de
  acreditación.

### Decisiones de implementación

| Aspecto | Decisión |
|---|---|
| Catálogo | Enum `Competencia` con atributo `TipoCompetencia { HARD, SOFT }` (ej. programación, bases de datos, redes, arquitectura / comunicación, trabajo en equipo, liderazgo, inglés técnico). |
| Medición de la brecha | **Dos Likert por competencia**: *importancia en el puesto* y *nivel adquirido en la carrera*. `brecha = importancia − adquirido`. Una sola escala de "satisfacción" no permite medir brecha. Permite un análisis Importancia-Desempeño (cuadrantes). |
| Aplicabilidad | Solo visible/obligatoria si el titulado tiene o tuvo empleo en el área (depende de HU1). |
| Persistencia | Tabla hija `evaluacion_competencia (respuesta_id, competencia, importancia, nivel_adquirido)` con `CHECK (valor BETWEEN 1 AND 5)`. |
| Estadística | Media y DE (lo que pide acreditación) **y** mediana + distribución por nivel, porque Likert es ordinal. **Alfa de Cronbach** por bloque (hard/soft) como evidencia de fiabilidad del instrumento. |
| "Texto estructurado opcional" | **Conflicto con la regla "sin texto libre".** Se implementa como selección de un catálogo cerrado ("competencia faltante más crítica", "causa de la brecha"). Si se exige texto, se guarda en una tabla separada, con longitud limitada, **fuera del motor analítico**. |

---

## HU5 — Automatización de Reportes y Matrices de Frecuencia Cruzada

**Enunciado:** Como administrador y miembro del comité de evaluación, quiero exportar matrices de
frecuencia cruzada y gráficos interactivos (mapas de calor, diagramas de radar), para sustentar el Plan de
Desarrollo Estratégico.

- **Implementación sugerida:** exportación CSV/Excel limpia + dashboard analítico automatizado.
- **Interpretación:** síntesis de Data Wrangling y EDA con trazabilidad y transparencia.

### Decisiones de implementación

| Aspecto | Decisión |
|---|---|
| Roles | La encuesta es pública; analítica, exportación y escenarios requieren `ADMIN` / `COMITE`. Se agrega `spring-boot-starter-security` (hoy no está en el `pom.xml`). |
| Exportación CSV | Formato *tidy*: una fila por respuesta, una columna por variable, códigos de enum + hoja/archivo diccionario de datos. UTF-8 con BOM para que Excel respete tildes. |
| Exportación Excel | Apache POI (`poi-ooxml`) con streaming (`SXSSFWorkbook`) para no cargar todo en memoria. Hojas: datos, diccionario, matrices cruzadas, resultados χ². |
| Mapa de calor | Sobre la tabla de contingencia, coloreado por **residuos estandarizados** (no por conteo bruto). Recharts (base de `shadcn/chart`) no tiene heatmap → grilla CSS con Tailwind. |
| Radar | `RadarChart` de Recharts: importancia vs nivel adquirido por competencia (HU4). |
| Trazabilidad | Cada reporte registra: fecha, `n`, filtros aplicados, versión del instrumento y semilla (si hubo simulación). Toda respuesta guarda `versionInstrumento` para que cambios de catálogo no corrompan el histórico. |

---

## Módulo de escenarios (objetivo final)

Lo que diferencia la herramienta de una encuesta común. Flujo:

1. **Ajuste**: a partir de los datos reales se obtienen distribuciones empíricas (demanda por área, por
   nivel, fuente de financiamiento condicionada al nivel, antigüedad).
2. **Parametrización del escenario** (UI con controles): ej. "+20 % becas estatales", "abrir Maestría en
   Ciencia de Datos con N cupos", "cambiar umbral junior".
3. **Simulación**: Monte Carlo con `k` iteraciones generando variables por **Transformada Inversa**:
   - Discretas/categóricas: búsqueda en la función de distribución acumulada empírica.
   - Continuas: `F⁻¹(u)` analítica (ej. exponencial para tiempo hasta iniciar posgrado).
   - Implementación propia de la transformada inversa (valor académico); `RandomGenerator` de Commons
     Math (`Well19937c`) **con semilla** → reproducibilidad y trazabilidad.
4. **Resultado**: distribución de la métrica simulada (demanda esperada, % sin financiamiento), intervalos
   de confianza, comparación contra el escenario base.

Complemento: **bootstrap** para intervalos de confianza de proporciones observadas con muestras chicas.

---

## Decisiones transversales

- **Modelo de datos tipado, no EAV**: el instrumento es fijo y versionado; columnas tipadas simplifican
  SQL y analítica.
- **Enums Java persistidos como `STRING`** (`@Enumerated(EnumType.STRING)`) + endpoint `GET /api/catalogos`
  que expone código y etiqueta en español → el frontend no hardcodea opciones.
- **Separación de contextos**: `encuesta` es dueño del modelo de escritura; `analitica` lee mediante el
  puerto `DatosEncuestaReader` (proyecciones/vistas de solo lectura). Ninguna entidad JPA se comparte.
- **Migraciones con Flyway** (`flyway-core` + `flyway-database-postgresql`) y `ddl-auto: validate` en
  todos los perfiles.
- **Tests de integración con Testcontainers** (PostgreSQL real).
- **Frontend**: formulario *wizard* por pasos (HU1 → HU2 → HU3 → HU4 condicional) con `react-hook-form` +
  `zod` (base de `shadcn/form`), opciones cargadas desde `/api/catalogos`.
- **Unicidad y anonimato**: sin texto libre no hay forma de detectar duplicados. Se requiere un mecanismo:
  código de invitación de un solo uso o hash (con sal) de un identificador institucional. **Decisión
  pendiente con la dirección de carrera.**

## Decisiones pendientes

1. Texto opcional de HU4: ¿catálogo cerrado (recomendado) o texto libre aislado?
2. Mecanismo anti-duplicados / anonimato.
3. HU2: ¿se habilitan 2.ª/3.ª preferencia rankeadas o solo área prioritaria?
4. Valores exactos de catálogos (sectores, áreas, competencias) alineados a ARCUSUR.

## Orden de implementación propuesto

1. Flyway + catálogos + `GET /api/catalogos` + modelo HU1.
2. Wizard de encuesta HU1–HU3 + persistencia.
3. HU4 (competencias, tabla hija, lógica condicional).
4. Analítica: descriptiva (HU1, HU2, HU4) + χ² con Cochran, V de Cramér y residuos (HU3).
5. Seguridad + exportaciones CSV/Excel + dashboard (HU5).
6. Módulo de escenarios: Transformada Inversa + Monte Carlo + UI de parámetros.
