# Diccionario inicial de datos

## Estado

**Fase:** 1 — contrato funcional y diccionario de datos  
**Estado:** COMPLETADA CON REGLAS INICIALES DOCUMENTADAS  
**Fuente funcional:** `form/form_export_titulados00.json` y `form/form_export_empleadores00.json`  
**Fuentes de respuestas:** archivos CSV de `data/`  
**Última revisión:** 2026-10-07

Este documento relaciona las definiciones de los formularios, las columnas de los CSV, los nombres internos que utilizará el sistema y las futuras vistas analíticas. Es un documento vivo: cada corrección de una columna, categoría o regla debe registrarse aquí antes de modificar el importador.

## 1. Inventario de fuentes

| Fuente | Descripción | Estado |
|---|---|---|
| `form_export_titulados00.json` | Definición de la encuesta de titulados | Revisada |
| `form_export_empleadores00.json` | Definición de la encuesta de empleadores | Revisada |
| `form_flujo_titulados00.mermaid` | Flujo condicional de titulados | Revisada |
| `form_flujo_empleadores00.mermaid` | Flujo de empleadores | Revisada |
| CSV de titulados | Respuestas exportadas | Revisada; requiere normalización |
| CSV de empleadores | Respuestas exportadas | Revisada; requiere normalización |

### Volumen encontrado

- Formulario de titulados: 11 secciones y 60 preguntas.
- Formulario de empleadores: 4 secciones y 32 preguntas.
- CSV de titulados: 8 registros y 85 columnas.
- CSV de empleadores: 3 registros y 60 columnas.

El número de columnas del CSV no coincide directamente con el número de preguntas del JSON porque las preguntas tipo `GRID`, ramas condicionales y respuestas exportadas generan columnas adicionales.

## 2. Convenciones internas

Los nombres internos deben ser estables, cortos, en `snake_case`, sin acentos y sin depender del texto completo del formulario.

### Tipos de datos

| Tipo | Uso |
|---|---|
| `text` | Texto libre no analítico o identificador controlado |
| `category` | Una categoría de respuesta |
| `multi_category` | Varias categorías en una celda |
| `integer` | Conteo, año o valor entero |
| `decimal` | Promedio, porcentaje o medida decimal |
| `likert` | Escala ordenada, normalmente 1 a 5 |
| `date_time` | Marca temporal de la respuesta |
| `boolean` | Sí/No normalizado |
| `excluded_personal` | Se conserva solo con finalidad operativa o se excluye del análisis |

### Valores vacíos

- Celda vacía: `null`.
- `No sabe`: categoría separada, no equivalente a vacío.
- `No observado`: categoría separada; no entra en promedios de competencias.
- `Sin respuesta`: se muestra solo cuando la pregunta es opcional y la especificación lo exige.
- Texto no reconocido: error o advertencia según la regla del campo; no se convierte silenciosamente.

## 3. Campos comunes de importación

| Columna CSV | Nombre interno | Tipo | Tratamiento |
|---|---|---|---|
| `Marca temporal` | `submitted_at` | `date_time` | Convertir a fecha/hora; conservar zona de origen si está disponible |
| `Dirección de correo electrónico` | `source_email` | `excluded_personal` | No mostrar ni usar en indicadores; decidir si se almacena cifrado o se descarta |

## 4. Mapa inicial de titulados

### 4.1 Perfil y situación laboral

| Columna CSV / pregunta | Nombre interno | Tipo | Uso |
|---|---|---|---|
| `Edad que tiene actualmente` | `edad_rango` | `category` | Perfil; conservar orden del formulario |
| `Género` | `genero` | `category` | Perfil |
| `Año de titulación` | `anio_titulacion` | `integer` | Antigüedad; validar rango y año |
| `Sector en el que trabaja` | `sector_trabajo` | `category` | Perfil y empleo |
| `Vinculo Laboral (Empres/Industria)` | `vinculo_laboral` | `text` | No graficar automáticamente |
| `Area de especialización` | `area_especializacion` | `text` | No graficar automáticamente |
| `Rubro de la Empresa` | `rubro_empresa` | `text` | No graficar automáticamente |
| `Cargo` | `cargo_profesional` | `text` | No graficar automáticamente |
| `Titulo de profesion` | `titulo_profesional` | `category` | Perfil |
| `¿CUÁNTOS SON LOS AÑOS DE VIDA PROFESIONAL...?` | `anios_vida_profesional` | `integer` | Media, mediana y desviación |
| `...TIEMPO ... DESEMPLEADO` | `anios_desempleo` | `integer` | Estadísticos; mostrar `n` válido |
| `¿CUÁL ... SITUACIÓN LABORAL ACTUAL?` | `situacion_laboral_actual` | `category` | Resumen y pestañas |

### 4.2 Formación e interés en posgrado

| Columna CSV / pregunta | Nombre interno | Tipo | Uso |
|---|---|---|---|
| `...formación complementaria...?` | `tiene_formacion_complementaria` | `boolean` | Define rama; resumen |
| `¿CUÁL ES EL PROGRAMA ... MAYOR NIVEL...?` | `formacion_complementaria_nivel` | `category` | Posgrado cursado; orden natural |
| `¿DONDE HA CURSADO ...?` | `institucion_formacion_complementaria` | `category` | Posgrado cursado |
| `¿CUÁL FUE LA FUENTE DE FINANCIAMIENTO ...?` | `financiamiento_posgrado_cursado` | `category` | Financiamiento cursado |
| `INDIQUE EL NOMBRE DEL PROGRAMA` | `programa_cursado_texto` | `text` | No graficar automáticamente |
| `¿ESTARÍA INTERESADO ... POSGRADO...?` | `interes_posgrado` | `boolean` | Define rama |
| `¿Qué nivel de posgrado le interesa?` | `nivel_posgrado_interes` | `category` | Orden natural |
| `¿EN CUÁL ... ÁREAS ...?` | `area_posgrado_interes` | `category` | Frecuencia y simulación |
| `Modalidad preferida` | `modalidad_posgrado` | `category` | Orden natural |
| `...¿EN QUÉ ORGANIZACIÓN EDUCATIVA...?` | `institucion_posgrado_interes` | `category` | Frecuencia/Pareto |
| `...¿CÓMO FINANCIARÍA SUS ESTUDIOS?` | `financiamiento_posgrado_estimado` | `category` | Cruces y financiamiento |
| `INDIQUE EL NOMBRE DEL PROGRAMA` (segunda aparición) | `programa_interes_texto` | `text` | Resolver duplicado antes de importar |

### 4.3 Trabajo actual, emprendimiento y primer empleo

| Columna CSV / pregunta | Nombre interno | Tipo | Uso |
|---|---|---|---|
| `Nombre de la empresa u organización...` | `empresa_actual_texto` | `excluded_personal` | No mostrar |
| `¿CUÁL ES EL RUBRO ... ORGANIZACIÓN...?` | `rubro_trabajo_actual` | `category` | Trabajo actual |
| `OTRO RUBRO` | `rubro_trabajo_otro_texto` | `text` | No clasificar automáticamente |
| `...¿A QUÉ SECTOR CORRESPONDE?` | `sector_trabajo_actual` | `category` | Trabajo actual |
| `¿EN QUÉ DEPARTAMENTO...?` | `departamento_trabajo` | `category` | Trabajo actual |
| `¿CUÁL ES EL ÁREA ...?` | `area_trabajo` | `multi_category` | Indicar varias respuestas |
| `¿Cuál es el cargo...?` | `cargo_actual` | `category` | Orden por frecuencia |
| `...labores ... pertinentes...` | `pertinencia_trabajo_formacion` | `likert` | Barra apilada |
| `¿Que antiguedad ...?` | `antiguedad_trabajo` | `category` | Orden natural |
| `¿A través de qué medio ...?` | `medio_obtencion_empleo` | `category` | Orden por frecuencia |
| `remuneración promedio mensual` | `remuneracion_rango` | `category` | Orden natural |
| `¿Cuál es el origen ... emprendimiento?` | `origen_emprendimiento` | `category` | Emprendimiento |
| `¿Qué tipo de entregable ...?` | `tipo_entregable_emprendimiento` | `category` | Emprendimiento |
| `¿Ha requerido financiamiento externo...?` | `financiamiento_externo_emprendimiento` | `boolean` | Emprendimiento |
| `Satisfacción` | `satisfaccion_emprendimiento` | `likert` | Barra apilada |
| `Importancia de Ingenieria de sistemas` | `importancia_formacion_emprendimiento` | `likert` | Barra apilada |
| `¿El trabajo ... es su primer empleo?` | `es_primer_empleo` | `boolean` | Primer empleo |
| `¿...tiempo ... primer trabajo...?` | `tiempo_primer_empleo` | `category` | Orden natural |
| `¿en cuántos empleos ...?` | `cantidad_empleos` | `integer` | Cruces; no mostrar en primer empleo |
| `...razón ... actualmente no trabaja...` | `razon_no_trabaja` | `category` | Sin empleo |
| `...¿Ha tenido algún trabajo antes?` | `experiencia_laboral_previa` | `boolean` | Sin empleo |

### 4.4 Competencias y cierre

| Grupo | Nombre interno |
|---|---|
| Satisfacción global | `satisfaccion_formacion` |
| Concordancia formación/requerimientos | `concordancia_formacion_requerimientos` |
| Hard skills | `competencia_titulado_<slug>` |
| Soft skills | `competencia_titulado_<slug>` |
| Aspectos útiles | `aspectos_utiles` |
| Aspectos a mejorar | `aspectos_mejorables` |
| Asignaturas con ventaja | `asignaturas_ventaja` |
| Asignaturas poco útiles | `asignaturas_poco_utiles` |
| Competencia faltante (texto) | `competencia_faltante` |

Las columnas de contacto (`Email de contacto`, `Número telefónico de contacto`, `LINK de LinkedIn`) son datos personales y no deben llegar a las vistas analíticas.

## 5. Mapa inicial de empleadores

### 5.1 Perfil y empleabilidad

| Columna CSV / pregunta | Nombre interno | Tipo | Uso |
|---|---|---|---|
| `Tipo de organización` | `tipo_organizacion` | `category` | Resumen |
| `Tamaño de la organización` | `tamano_organizacion` | `category` | Orden Micro → Grande |
| `Indique el rubro o sector principal...` | `rubro_organizacion` | `category` | Resumen |
| `¿...ha contratado ... últimos 5 años?` | `contrato_titulados_ultimos_5_anios` | `boolean` | KPI |
| `...posibilidad de incorporar...` | `posibilidad_incorporacion` | `category` | KPI y resumen |
| `¿Qué nivel de formación ... demanda...?` | `nivel_formacion_demandado` | `category` | Orden natural |
| `¿A través de qué medio convoca...?` | `medio_convocatoria` | `category` | Frecuencia |
| `¿Qué tipo de cargos desempeñan...?` | `cargos_titulados` | `multi_category` | Varias respuestas |
| `Departamento` | `departamento_organizacion` | `category` | Resumen |
| `Presencia de sedes` | `presencia_sedes` | `category` | Resumen |
| `Área en la que se desempeña` | `area_representante_texto` | `text` | No graficar automáticamente |

Los campos de empresa, NIT, razón social, nombre comercial, dirección, página web, WhatsApp, representante, correo y cargo del representante se excluyen de las vistas analíticas.

### 5.2 Valoración y competencias

| Grupo | Nombre interno |
|---|---|
| 10 afirmaciones de formación/perfil | `valoracion_formacion_<slug>` |
| 8 afirmaciones de relación con la carrera | `valoracion_relacion_<slug>` |
| Hard skills | `competencia_empleador_<slug>` |
| Soft skills | `competencia_empleador_<slug>` |
| Competencia faltante (texto) | `competencia_faltante_empleador_texto` |

Las valoraciones Likert deben conservar sus categorías originales y las competencias deben convertirse a valores 1–5, manteniendo `No observado` separado y excluido de media y desviación estándar.

## 6. Problemas encontrados que requieren decisión

### 6.1 CSV de titulados

El CSV tiene 85 columnas y 8 registros. Se detectaron encabezados normalizados duplicados en las columnas:

```text
13/85  interés en estudios de posgrado
37/47  satisfacción global con la formación
39/64  aspectos útiles de la Carrera
40/65  aspectos a mejorar
41/66  asignaturas con ventaja competitiva
42/67  asignaturas poco útiles
43/68  red de contactos
44/69  email de contacto
45/70  número telefónico
46/71  LinkedIn
81/84  nombre del programa
```

No se debe deduplicar por posición sin entender la rama. El importador debe asignar un identificador de origen o un sufijo de contexto, por ejemplo `programa_cursado_texto` y `programa_interes_texto`.

### 6.2 CSV de empleadores

El CSV tiene 60 columnas y 3 registros. No presenta duplicados normalizados, pero contiene datos de identificación que deben excluirse del análisis y valores categóricos que deben normalizarse.

### 6.3 Desalineación entre JSON y CSV

El JSON organiza preguntas por sección y número de pregunta. El CSV organiza columnas según la exportación del formulario, incluyendo ramas, grids aplanados y columnas repetidas. Por eso el mapeo no puede basarse únicamente en la posición de la columna.

## 7. Decisiones adoptadas para continuar

Estas reglas permiten avanzar a la Fase 2. Si el responsable funcional las modifica, se debe registrar el cambio y su impacto en el esquema o importador.

| Tema | Regla inicial adoptada |
|---|---|
| Periodo | Derivar el año de `Marca temporal`; los CSV actuales corresponden provisionalmente a 2026 |
| Tipo de encuesta | Detectar por columnas firma del contenido, no por el nombre del archivo |
| Identidad de respuesta | Generar UUID por respuesta y conservar `dataset_id` + número de fila de origen; no usar nombre ni correo |
| Vacíos | Convertir celda vacía a `null` |
| Sí/No | Normalizar ignorando mayúsculas, minúsculas y acentos: `Sí`, `SI`, `si` → `true`; `No`, `NO`, `no` → `false` |
| Números | Extraer el valor numérico solo cuando la regla del campo lo permita; si no se puede convertir, registrar advertencia y usar `null` |
| Rangos | Edad, antigüedad, remuneración y niveles se conservan como categorías ordenadas; no inventar valores medios |
| Likert | Extraer el número de respuestas como `valor_numérico`; conservar la etiqueta original y separar `No sabe`/`No observado` |
| Selección múltiple | Separar por coma solo en campos definidos como `multi_category`; conservar el texto original |
| Texto libre | Conservar para trazabilidad si corresponde, pero excluir de gráficos y cruces automáticos |
| Datos personales | Excluir del modelo analítico; si se conserva el CSV original, su acceso debe quedar restringido y no debe exportarse desde el analizador |
| Duplicados | Resolver usando contexto y número de columna; si dos columnas representan la misma pregunta, coalescer el primer valor no vacío y registrar conflicto si ambos difieren |
| Columnas desconocidas | No descartar silenciosamente; registrar como columna no mapeada en el reporte de calidad |
| Fila válida | Una fila es procesable si el CSV es estructuralmente válido y contiene al menos una respuesta analítica; los campos individuales inválidos generan advertencias |

### Resolución de duplicados del CSV de titulados

- Columnas 13 y 85: mapear a `interes_posgrado`; coalescer y registrar la columna de origen.
- Columnas 37 y 47: mapear a `satisfaccion_formacion`; coalescer y registrar conflicto si difieren.
- Columnas 39/64, 40/65, 41/66, 42/67: mapear a sus respectivos campos multi-categoría.
- Columnas 43/68, 44/69 y 45/70/46/71: son campos de red de contactos y datos personales repetidos; conservar solo para auditoría, excluir del analizador.
- Columnas 81 y 84: separar como `programa_cursado_texto` y `programa_interes_texto` según la rama de origen; no resolver únicamente por posición.

### Campos personales excluidos

Quedan fuera del modelo analítico: nombres, correos, teléfonos, LinkedIn, empresas, NIT, razón social, nombre comercial, dirección, página web, WhatsApp y representantes.

### Pendientes no bloqueantes

- [ ] Confirmar formalmente con el responsable funcional que los CSV actuales pertenecen al periodo 2026.
- [ ] Confirmar si se conservará el archivo original fuera de Git o en almacenamiento restringido.
- [ ] Aprobar las fórmulas finales de los indicadores durante la Fase 4.

## 8. Criterio de cierre de la Fase 1

La fase se considerará completada cuando:

- las columnas analíticas principales de ambos CSV tengan identificadores internos;
- los datos personales estén identificados;
- las columnas duplicadas tengan una regla de resolución;
- las categorías y escalas principales estén documentadas;
- las preguntas de formulario puedan relacionarse con las vistas del analizador;
- las decisiones críticas tengan una regla inicial documentada;
- el diccionario pueda ser utilizado por quien implemente el importador sin leer manualmente todos los CSV.

## 9. Estado de cierre

**Fase 1: COMPLETADA CON REGLAS INICIALES DOCUMENTADAS.** Las tres pendientes restantes no bloquean el diseño del esquema, pero deben resolverse antes de producción.

## 10. Siguiente paso

Resolver las decisiones pendientes críticas y convertir este mapa inicial en un contrato técnico para la Fase 2: modelo de PostgreSQL y migraciones.
