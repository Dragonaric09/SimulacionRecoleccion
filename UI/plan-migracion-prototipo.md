# Plan reorganizado para construir el analizador

> **Documento vivo:** este plan debe actualizarse durante el desarrollo. No es un documento cerrado. Cada decisión técnica, cambio de alcance, bloqueo, endpoint creado, tabla añadida o fase completada debe reflejarse aquí.

## 0. Control de cambios del plan

### Estado actual

| Elemento | Estado |
|---|---|
| Prototipo HTML | Disponible en `UI/` |
| Definición de formularios | Disponible en `form/` |
| CSV de respuestas | Disponible en `data/` |
| Frontend React | Base inicial disponible; `build` OK; `lint` con 2 errores preexistentes |
| Backend Spring Boot | Base inicial disponible; pruebas OK |
| PostgreSQL | Configurado mediante Docker Compose; configuración válida |
| Importación CSV | Backend inicial implementado; pendiente de ampliaciones de normalización |
| Modelo de datos definitivo | V1 y V2 creadas; persistencia núcleo validada |
| API analítica | Parcial; pendiente de ampliar |
| Migración de pantallas | Pendiente |

### Regla de actualización

Después de cada sesión de trabajo, actualizar como mínimo:

- estado de la fase actual;
- tareas completadas;
- archivos creados o modificados;
- pruebas ejecutadas;
- problemas encontrados;
- decisiones nuevas;
- siguiente tarea concreta.

Se recomienda mantener una bitácora breve al final de este archivo:

```text
Fecha:
Fase:
Completado:
Archivos afectados:
Validaciones:
Bloqueos:
Decisiones:
Siguiente paso:
```

Si cambia el alcance del proyecto, no se debe borrar silenciosamente el plan anterior. Se debe registrar qué cambió, por qué cambió y qué fases quedan afectadas.

## 1. Decisión principal sobre el orden

El proyecto no debe comenzar trasladando todas las pantallas HTML a React. El analizador depende de datos importados, reglas de normalización, cálculos estadísticos y consultas consistentes. Si se construye primero toda la interfaz, existe el riesgo de diseñar pantallas basadas en datos ficticios que después no puedan alimentarse correctamente.

El orden recomendado es:

```text
Definición funcional
        ↓
Contrato de datos
        ↓
Base de datos
        ↓
Importación y normalización de CSV
        ↓
Cálculos analíticos y API
        ↓
Base técnica del frontend
        ↓
Pantalla piloto conectada a la API
        ↓
Resto de pantallas
        ↓
Exportación y simulación
        ↓
Pruebas, seguridad y entrega
```

La respuesta a “¿el frontend va al final?” es: no completamente.

- El frontend base debe comenzar temprano para validar rutas, layout y componentes.
- Las pantallas analíticas completas deben construirse después de definir los datos y la API.
- La conexión del frontend con datos reales ocurre después de que exista una primera API funcional.

## 2. Objetivo del proyecto

Construir un analizador web para las encuestas de titulados y empleadores de Ingeniería de Sistemas de la UMSS.

El sistema deberá permitir:

- importar archivos CSV de respuestas;
- identificar si corresponden a titulados o empleadores;
- validar la estructura y calidad de los datos;
- normalizar las respuestas;
- guardar los datos en PostgreSQL;
- calcular indicadores y brechas;
- mostrar resultados mediante un frontend React;
- filtrar por periodo y tipo de encuesta;
- exportar resultados;
- ejecutar simulaciones de escenarios cuando se haya definido el modelo correspondiente.

## 3. Estado actual del repositorio

### Prototipo visual

La carpeta `UI/` contiene las pantallas HTML que sirven como referencia visual y funcional del analizador. Sus datos son estáticos o ficticios y no deben trasladarse literalmente como páginas aisladas.

### Definición de formularios

La carpeta `form/` contiene:

- `form_export_titulados00.json`;
- `form_export_empleadores00.json`;
- dos diagramas Mermaid de flujo.

La encuesta de titulados tiene 11 secciones y 60 preguntas. La de empleadores tiene 4 secciones y 32 preguntas. Estos archivos son la referencia para relacionar preguntas, tipos de respuesta y columnas de los CSV.

### Datos de entrada

La carpeta `data/` contiene los CSV que serán importados al analizador. Son archivos exportados de formularios y presentan encabezados largos, saltos de línea, posibles duplicados, valores vacíos y distintas formas de escribir respuestas.

Los CSV deben conservarse como fuente original. No deben ser modificados manualmente para que el proceso de importación sea reproducible.

### Frontend

El frontend se encuentra en `frontend/` y utiliza:

- React 19;
- TypeScript;
- Vite;
- Tailwind CSS 4;
- shadcn estilo `new-york`;
- `lucide-react`;
- `recharts`;
- `react-hook-form`;
- componentes reutilizables en `frontend/src/components/ui/`.

Actualmente existe una vista inicial en `frontend/src/App.tsx`, pero todavía no hay un router ni las pantallas del analizador.

### Backend y base de datos

El backend es Spring Boot y PostgreSQL ya está contemplado en Docker Compose. Actualmente existe infraestructura inicial y un endpoint de salud, además de una operación de chi-cuadrado, pero todavía deben construirse la importación, persistencia y consultas analíticas.

## 3.1. Requisitos obligatorios del frontend documentados en `UI/*.md`

Los archivos `UI/especificacion-ui.md` y `UI/sistema-de-diseno.md` son parte del contrato del frontend. No son solamente material de inspiración.

### Alcance de producto

- La aplicación es un dashboard de análisis, no un informe narrativo.
- La interfaz muestra cifras, gráficos, tablas, filtros y exportaciones.
- No debe escribir conclusiones, recomendaciones, hallazgos ni dictámenes.
- No debe mostrar referencias a criterios de acreditación ni jerga interna del proyecto.
- Las preguntas abiertas y el texto libre no se grafican automáticamente.
- El alcance inicial es escritorio, aproximadamente entre 1366 y 1440 px.
- No se implementan inicialmente inicio de sesión, roles, modo oscuro, móvil, tablet ni historial visible de cargas.
- El historial técnico de datasets puede existir en la base de datos para trazabilidad, pero no debe convertirse automáticamente en una pantalla de historial si está fuera del alcance.

### Reglas de datos visibles

- Cada gráfico debe mostrar su `n` real, es decir, cuántas personas respondieron esa pregunta.
- Con muestras de 5 a 20 personas, los conteos deben acompañar a los porcentajes.
- Debe mostrarse una alerta cuando queden menos de 5 respuestas.
- `No sabe`, `No observado` y `Sin respuesta` deben diferenciarse visualmente.
- Datos personales de titulados y organizaciones nunca deben aparecer en gráficos, cruces, tablas analíticas o exportaciones analíticas.
- Las escalas ordinales deben respetar su orden natural.
- Las categorías nominales deben ordenarse por frecuencia cuando la especificación lo indique.
- Las preguntas de selección múltiple deben indicar `Varias respuestas posibles` y calcular porcentajes sobre las personas que respondieron.

### Requisitos visuales obligatorios

- Sidebar fija de 240 px en azul marino.
- Área principal fluida con máximo aproximado de 1200 px.
- Fondo `#F1F5F9` y tarjetas blancas.
- Titulados en azul `#1F6FB5` y empleadores en verde azulado `#14A39A`.
- Inter como tipografía principal y cifras tabulares para datos numéricos.
- Ritmo de espaciado basado en 8 px.
- Bordes de 8 px, sombras suaves y controles con estados normal, hover, foco y deshabilitado.
- No comunicar información exclusivamente por color.
- Heatmaps con el número dentro de cada celda.
- Avisos de muestra pequeña y Chi-cuadrada en ámbar.
- Botón o tooltip `¿Cómo leer esto?` para explicar brevemente cada visualización.

### Pantallas que el frontend debe cubrir

1. Cargar datos.
2. Resumen de titulados.
3. Perfil y empleabilidad.
4. Formación continua.
5. Financiamiento.
6. Brechas de competencias de titulados.
7. Cruces y exportación de titulados.
8. Resumen y contratación de empleadores.
9. Valoración de la carrera.
10. Brechas de competencias de empleadores.
11. Cruces y exportación de empleadores.
12. Simulación de escenarios de titulados.

Cada pantalla debe implementarse desde la especificación correspondiente, no solo desde una copia visual del HTML.

## 4. Reglas generales para ejecutar el plan

1. Leer primero el código y los archivos de referencia relacionados con la tarea.
2. No asumir que un dato del HTML es una regla real de negocio.
3. No modificar los CSV originales durante la importación.
4. No conectar las vistas directamente a archivos CSV.
5. No crear endpoints sin definir primero su entrada y salida.
6. No duplicar el menú lateral en cada pantalla React.
7. No copiar HTML completo dentro de componentes React.
8. Reutilizar shadcn antes de crear componentes nuevos.
9. Ejecutar `npm run lint` y `npm run build` después de cambios frontend.
10. Ejecutar pruebas backend después de cambios en persistencia o API.
11. Revisar el diff antes de continuar con otra fase.
12. No eliminar el prototipo HTML hasta validar su equivalente React.

Cada fase debe producir archivos, decisiones y pruebas verificables. Si una decisión no está definida, debe registrarse como pendiente y no inventarse silenciosamente.

## 4.1. Plantilla obligatoria para cada fase

Cada fase debe documentarse con estos elementos, aunque inicialmente alguno indique `Pendiente`:

```text
Estado: PENDIENTE | EN CURSO | BLOQUEADA | COMPLETADA
Objetivo:
Depende de:
Entradas:
Actividades:
Archivos afectados:
Entregables:
Validaciones:
Criterio de aceptación:
Bloqueos:
Siguiente fase:
```

Una fase `COMPLETADA` debe tener evidencia: prueba ejecutada, endpoint probado, migración aplicada, pantalla revisada o documento aprobado, según corresponda.

## 4.2. Matriz detallada de fases

| Fase | Objetivo concreto | Depende de | Entregable principal | Evidencia de cierre |
|---|---|---|---|---|
| 0 | Conocer el estado real del repositorio | Ninguna | Línea base | Lint, build y pruebas registrados |
| 1 | Relacionar formularios, CSV, BD y vistas | Fase 0 | Diccionario de datos | Campos críticos mapeados |
| 2 | Crear persistencia versionada | Fase 1 | Esquema, migraciones y acceso desde la aplicación | Dataset de prueba guardado y consultado |
| 3 | Procesar CSV de forma reproducible | Fase 2 | Importador y reporte de calidad | CSV de prueba importado |
| 4 | Definir cálculos y respuestas de API | Fase 3 | Servicios y contratos analíticos | Resultados manuales coinciden |
| 5 | Preparar navegación SPA | Fase 0 | Router y layout | Rutas abren directamente |
| 6 | Centralizar diseño y componentes | Fase 5 | Tokens y componentes | Layout reutilizado |
| 7 | Permitir importar desde la interfaz | Fases 3 y 5 | Pantalla de carga | Dataset queda disponible |
| 8 | Validar el patrón analítico | Fases 4, 6 y 7 | Resumen de titulados | Vista usa API real |
| 9 | Completar las vistas del analizador | Fase 8 | Pantallas restantes | Cada ruta tiene estados y datos |
| 10 | Renderizar formularios definidos en JSON | Fases 1 y 6 | Renderer dinámico | Flujos coinciden con Mermaid |
| 11 | Implementar salida y escenarios | Fases 4 y 9 | Exportaciones y simulación | Reglas documentadas |
| 12 | Proteger y operar el sistema | Todas las anteriores | Seguridad y configuración | Datos sensibles controlados |
| 13 | Verificar y cerrar la migración | Todas las anteriores | Informe final | Lint, build y pruebas pasan |

## 5. Fase 0: inventario y línea base

### Objetivo

Conocer el estado real del repositorio antes de agregar funcionalidades.

### Actividades

- Ejecutar el frontend actual.
- Ejecutar `npm run lint` desde `frontend/`.
- Ejecutar `npm run build` desde `frontend/`.
- Ejecutar las pruebas existentes del backend.
- Revisar `pom.xml`, `docker-compose.yml` y los archivos `application*.yml`.
- Revisar entidades, repositorios, casos de uso y controladores existentes.
- Inventariar las pantallas HTML, JSON, CSV y componentes shadcn.
- Registrar cualquier error existente antes de iniciar la migración.

### Entregables

- informe breve de línea base;
- lista de errores previos;
- inventario de módulos y archivos relevantes.

### Puerta de aceptación

No se continúa si no se sabe si los errores de lint, build o pruebas ya existían antes del trabajo.

## 6. Fase 1: contrato funcional y diccionario de datos

Esta fase debe ir antes de diseñar tablas o endpoints.

### Objetivo

Definir qué representa cada respuesta y cómo se relacionan `form/`, `data/`, la base de datos y las vistas.

### Actividades

Crear un diccionario que conecte:

```text
pregunta del formulario
→ columna original del CSV
→ identificador interno
→ tipo de dato
→ regla de normalización
→ tabla/campo de PostgreSQL
→ indicador o pantalla que lo utiliza
```

Para cada campo se debe definir:

- identificador estable;
- encuesta de origen;
- número de pregunta;
- nombre original de la columna;
- tipo lógico;
- si es obligatorio;
- valores permitidos;
- representación de vacío;
- regla de normalización;
- si contiene información personal;
- destino en la base de datos.

### Identificadores internos

No se deben usar como nombres de código los encabezados completos del CSV. Ejemplos de nombres internos:

```text
edad
anio_titulacion
situacion_laboral_actual
interes_posgrado
tipo_organizacion
contratacion_ultimos_5_anios
competencia_programacion
competencia_bases_datos
```

### Decisiones que deben quedar escritas

- significado de cada escala;
- tratamiento de `No observado`;
- diferencia entre respuesta vacía y respuesta no aplicable;
- categorías equivalentes;
- preguntas que se excluyen del análisis;
- datos personales que no deben mostrarse;
- periodo al que pertenece cada archivo.

### Entregables

- `data-dictionary.md` o equivalente;
- primer mapa de columnas de titulados;
- primer mapa de columnas de empleadores;
- lista de ambigüedades detectadas.

### Puerta de aceptación

Una persona que no conoce el proyecto debe poder saber qué significa cada campo analizado sin leer el CSV completo.

## 7. Fase 2: modelo de PostgreSQL y migraciones

### Objetivo

Diseñar la persistencia antes de implementar la carga de archivos.

### Entidades mínimas

#### Dataset

Representa una importación concreta:

```text
id
tipo_encuesta
nombre_archivo
hash_archivo
periodo
fecha_importacion
filas_leidas
filas_validas
filas_rechazadas
advertencias
estado
```

#### Respuestas

Las respuestas de titulados y empleadores pueden tener tablas separadas porque sus campos no son iguales. Ambas deben relacionarse con `dataset`.

#### Preguntas y competencias

Las preguntas y competencias deben tener identificadores estables. Las valoraciones de competencias deben relacionar:

```text
respuesta
competencia
valor_numérico
no_observado
```

#### Problemas de calidad

Registrar fila, columna, valor original, tipo de problema, mensaje, severidad y dataset.

### Reglas

- Una importación anterior no debe sobrescribirse automáticamente.
- El mismo archivo puede detectarse por un hash.
- Una importación debe confirmarse dentro de una transacción.
- Los datos personales deben separarse o limitarse cuando no sean necesarios para el análisis.
- Las migraciones de base de datos deben estar versionadas.

### Actividades

1. Revisar si ya existe una estrategia de migraciones.
2. Elegir Flyway o Liquibase si todavía no existe una.
3. Crear el esquema mínimo.
4. Crear entidades JPA, repositorios y migraciones.
5. Crear datos de prueba pequeños y anónimos.
6. Probar inserción y consulta de un dataset.

### Lista de cierre de la fase

- [x] Existe una estrategia de migraciones elegida y documentada.
- [x] Flyway está configurado en el backend.
- [x] Existe una migración PostgreSQL versionada y aplicable desde cero.
- [x] PostgreSQL levanta y la migración se aplica correctamente.
- [x] Hibernate arranca con `ddl-auto=validate` sin intentar modificar el esquema.
- [x] Existen entidades JPA para el núcleo de datasets y respuestas que utilizará la aplicación.
- [x] Existen repositorios Spring Data para datasets y respuestas.
- [x] Existe un fixture pequeño, anónimo y reproducible dentro de la prueba.
- [x] Una prueba de integración guarda y consulta un dataset sin depender del frontend.
- [x] La relación dataset-respuesta y la eliminación en cascada quedan respaldadas por las claves foráneas de la migración.
- [x] Las entidades auxiliares de mapeos, competencias, respuestas específicas e incidencias están disponibles para el importador.

### Puerta de aceptación

Se puede guardar y consultar un dataset de prueba sin depender todavía del frontend.

## 8. Fase 3: importación, validación y normalización

### Objetivo

Convertir un CSV original en un dataset válido y persistible.

### Validación del archivo

Validar:

- extensión y tipo de archivo;
- codificación y BOM;
- separador;
- comillas y saltos de línea internos;
- encabezados duplicados;
- columnas mínimas;
- filas incompletas;
- tipo de encuesta;
- valores permitidos.

### Normalización

Contemplar:

- espacios iniciales y finales;
- `SI`, `Sí` y `si`;
- escalas como `4 - Suficiente`;
- celdas vacías;
- respuestas múltiples;
- fechas;
- departamentos;
- categorías de organización;
- correos inválidos;
- campos no observados.

Conservar el valor original cuando una transformación sea importante para auditoría.

### Estados

```text
CARGADO
VALIDANDO
CON_ADVERTENCIAS
LISTO
CON_ERRORES
```

### API inicial

```text
POST /api/datasets/validate
POST /api/datasets/import
GET  /api/datasets
GET  /api/datasets/{id}
GET  /api/datasets/{id}/quality
```

### Entregables

- servicio de lectura de CSV;
- validador;
- normalizador;
- reporte de calidad;
- persistencia transaccional;
- pruebas con un CSV de titulados y uno de empleadores.

### Puerta de aceptación

La importación informa cuántas filas son válidas, qué advertencias existen y qué errores impiden continuar. Los datos válidos quedan guardados en PostgreSQL.

## 9. Fase 4: reglas estadísticas y API analítica

Esta fase debe preceder a las pantallas analíticas.

### Objetivo

Definir y probar los cálculos que utilizarán las vistas React.

### Reglas que deben especificarse

Para cada indicador documentar:

- fórmula;
- campos utilizados;
- filtros;
- tratamiento de valores vacíos;
- tratamiento de `No observado`;
- tamaño mínimo de muestra;
- redondeo;
- periodo;
- interpretación.

### Indicadores iniciales

- total de respuestas;
- distribución laboral;
- sectores de inserción;
- formación complementaria;
- interés en posgrado;
- valoración de empleadores;
- promedio de competencias;
- brecha entre valoración y expectativa;
- cantidad de respuestas válidas;
- distribución por categorías.

### API analítica sugerida

```text
GET /api/analytics/titulados/summary
GET /api/analytics/titulados/employment
GET /api/analytics/titulados/education
GET /api/analytics/employers/summary
GET /api/analytics/competencies/gaps
GET /api/analytics/crosses
POST /api/analitica/chi-cuadrado
```

Cada endpoint debe documentar parámetros como `datasetId`, `periodo`, filtros y formato de respuesta.

### Reglas implementadas en la primera versión

| Indicador | Fórmula / fuente | Valores vacíos | Redondeo |
|---|---|---|---|
| Total de respuestas | Conteo de `survey_response` con estado `VALIDA` | No se cuentan | Entero |
| Distribución por categoría | `n(categoría) / n(válido) * 100` | Se excluyen del denominador | 2 decimales |
| Promedio numérico | Suma de valores válidos / cantidad válida | Se excluyen valores no convertibles | 2 decimales |
| Desviación estándar | Desviación muestral: `sqrt(sum((x - media)^2) / (n - 1))` | Se excluyen `No observado`, `No sabe` y valores no numéricos; si `n < 2`, se informa como no disponible | 2 decimales |
| Promedio de competencias | Suma de `numeric_value` excluyendo `not_observed` / cantidad válida | `No observado` no participa | 2 decimales |
| Cruce | Conteo por combinación de dos campos; porcentaje dentro de cada fila | Se excluye cualquier fila incompleta | 2 decimales |

Los endpoints reciben `datasetId`. Si se omite en los resúmenes por tipo, se utiliza el último dataset importado de ese tipo. La respuesta incluye `smallSample: true` cuando el `n` válido es menor que 5, según la especificación UI. La API no genera conclusiones ni interpretaciones narrativas.

### Puerta de aceptación

Los resultados de los cálculos pueden probarse con datos pequeños donde el resultado esperado se conozca manualmente.

## 10. Fase 5: base técnica del frontend

Esta es la primera fase frontend, pero todavía no migra todas las pantallas.

### Objetivo

Preparar una SPA capaz de navegar y alojar las vistas futuras.

### Actividades

- incorporar un router;
- crear `AppLayout`;
- crear `AppSidebar`;
- crear `AppHeader`;
- definir la configuración única de navegación;
- definir rutas protegidas o abiertas según corresponda;
- configurar estados de página no implementada;
- verificar acceso directo a rutas con `SpaForwardController`.

### Rutas objetivo

```text
/cargar-datos
/titulados/resumen
/titulados/perfil-empleabilidad
/titulados/formacion-continua
/titulados/financiamiento
/titulados/brechas-competencias
/titulados/cruces-exportacion
/titulados/simulacion-escenarios
/empleadores/resumen-contratacion
/empleadores/valoracion-carrera
/empleadores/brechas-competencias
/empleadores/cruces-exportacion
```

### Resultado esperado

El usuario puede recorrer todas las rutas aunque algunas todavía muestren una página provisional.

## 11. Fase 6: sistema visual y componentes compartidos

### Actividades

- trasladar colores del prototipo a variables CSS/Tailwind;
- mantener separados los colores de titulados y empleadores;
- usar `lucide-react` en lugar de Material Symbols;
- adaptar `Button`, `Card`, `Badge`, `Table`, `Select`, `Dialog` y `Chart`;
- crear componentes para KPI, estado de datos, filtros y exportación;
- evitar colores arbitrarios repetidos en JSX.

### Estructura sugerida

```text
frontend/src/
├── app/
│   ├── router.tsx
│   └── AppLayout.tsx
├── components/
│   ├── layout/
│   ├── navigation/
│   └── analytics/
├── features/
│   ├── titulados/
│   └── empleadores/
└── shared/
    ├── types/
    └── mock-data/
```

### Puerta de aceptación

El layout, el menú y los componentes visuales pueden utilizarse desde más de una pantalla sin duplicar código.

### Verificación contra el sistema de diseño

Antes de migrar una pantalla, comprobar que utiliza:

- los tokens de color definidos en `UI/sistema-de-diseno.md`;
- la escala tipográfica Inter de 28/18/14/12 px;
- el espaciado modular de 8 px;
- tarjetas con borde, radio y sombra definidos;
- controles con estados normal, hover, foco y deshabilitado;
- cifras con numerales tabulares;
- colores semánticos consistentes: azul para titulados, verde azulado para empleadores, ámbar para alertas y gris para valores no disponibles.

No se deben agregar colores, tamaños, radios o variantes arbitrarias sin actualizar primero el sistema de diseño.

## 12. Fase 7: pantalla de carga de datos

### Objetivo

Crear la primera pantalla funcional conectada con el proceso de importación.

### Flujo de usuario

1. Seleccionar un CSV.
2. Elegir o detectar el tipo de encuesta.
3. Enviar el archivo a validación.
4. Mostrar filas, columnas, advertencias y errores.
5. Permitir confirmar solo si las condiciones mínimas se cumplen.
6. Importar y mostrar el `datasetId`.
7. Permitir seleccionar el dataset activo.

### Reglas

- No enviar datos directamente a las vistas analíticas.
- No ocultar errores de calidad.
- No sobrescribir otro dataset.
- Mostrar claramente si existen datos personales en el archivo.

### Puerta de aceptación

Una persona puede importar un CSV de prueba, revisar su calidad y dejarlo disponible para las consultas analíticas.

La pantalla debe respetar la especificación de carga de datos: tarjetas separadas para titulados y empleadores, carga de estructura JSON y respuestas CSV/XLSX, resumen de filas leídas, preguntas detectadas, completitud, avisos de valores inválidos y botón `Procesar`.

## 13. Fase 8: pantalla analítica piloto

Migrar primero `UI/resumen-titulados.html`.

### Orden

1. Crear la ruta React.
2. Consumir el endpoint de resumen.
3. Mostrar estado de carga.
4. Mostrar estado vacío.
5. Mostrar estado de error.
6. Migrar KPI, tablas y gráficos.
7. Agregar filtros de periodo y dataset.
8. Comparar visualmente con el HTML original.

### Puerta de aceptación

La pantalla muestra información real del dataset importado y sus resultados coinciden con cálculos de prueba conocidos.

La pantalla piloto debe respetar la especificación de resumen: cuatro KPI, estado laboral y áreas de posgrado, conteos visibles y títulos descriptivos sin conclusiones.

## 14. Fase 9: migración del resto del analizador

Migrar en el siguiente orden:

1. perfil y empleabilidad;
2. formación continua;
3. financiamiento;
4. resumen de empleadores;
5. valoración de la carrera;
6. brechas de competencias;
7. cruces y exportación;
8. simulación de escenarios.

Para cada pantalla:

- identificar el endpoint necesario;
- definir el tipo de respuesta;
- implementar primero datos mock compatibles;
- implementar estados de carga, vacío y error;
- reutilizar el layout;
- comparar con el HTML de referencia;
- probar con más de un dataset o filtro.

No se debe marcar una pantalla como terminada si solo reproduce el diseño con valores escritos manualmente.

### Requisitos visuales y funcionales por pantalla

Al migrar cada pantalla, revisar la sección equivalente de `UI/especificacion-ui.md`:

- perfil y empleabilidad: pestañas Perfil, Trabajo actual, Sin empleo, Primer empleo y Emprendimiento;
- formación continua: separar posgrado cursado, interés en posgrado y opinión sobre posgrado;
- financiamiento: selectores de filas/columnas, tabla de contingencia, mapa de calor y aviso de Chi-cuadrada;
- brechas: heatmap, tabla, radar y exclusión de `No observado` en los promedios;
- cruces: configuración, vista previa y exportaciones CSV, Excel y PNG;
- empleadores: resumen, contratación, valoración y brechas con la paleta correspondiente;
- simulación: variable, N, repeticiones, semilla, probabilidades ajustables, promedio simulado y rango del 95 %.

La pantalla solo se considera completa cuando estos elementos están conectados a datos o tienen un estado explícito de “no disponible”.

## 15. Fase 10: formularios dinámicos

Esta fase corresponde a las pantallas de captura basadas en `form/`. Es distinta de la importación de CSV del analizador.

### Tipos a soportar

- `TEXT`;
- `PARAGRAPH_TEXT`;
- `MULTIPLE_CHOICE`;
- `CHECKBOX`;
- `LIST`;
- `GRID`;
- `SECTION_HEADER`;
- `IMAGE`.

### Actividades

- definir tipos TypeScript para los JSON;
- crear un renderer por tipo de pregunta;
- reutilizar `react-hook-form` y shadcn;
- validar preguntas obligatorias;
- conservar respuestas al avanzar y retroceder;
- interpretar `SIGUE_A_LA_SIGUIENTE_SECCION`;
- interpretar `IR_A_SECCION`;
- interpretar `ENVIAR_FORMULARIO`;
- comparar el flujo con los diagramas Mermaid.

Esta fase puede desarrollarse en paralelo después de estabilizar el modelo de formularios, pero no debe bloquear la primera versión del analizador basado en CSV si la captura no forma parte del primer entregable.

## 16. Fase 11: exportación y simulación

### Exportación

Esta fase debe agregar la exportación de las matrices cruzadas y visualizaciones en CSV, Excel y PNG. La Fase 4 solo entrega la tabla agregada por API; no implementa todavía esos formatos de descarga.

Definir primero si se exportan:

- datos originales;
- datos normalizados;
- tablas agregadas;
- gráficos;
- resultados filtrados.

La exportación debe respetar permisos y no exponer datos personales innecesarios.

### Simulación

La simulación de escenarios queda en esta fase posterior. Debe exponer una API y una regla matemática documentada antes de conectarse a la pantalla `/titulados/simulacion-escenarios`.

Antes de implementarla, documentar:

- variables modificables;
- escenario base;
- fórmula o modelo;
- fuentes de datos;
- límites de interpretación;
- diferencia entre simulación descriptiva y predicción.

No implementar una simulación que solo cambie valores visualmente sin una regla matemática documentada.

## 17. Fase 12: seguridad, privacidad y operación

### Actividades

- decidir qué datos personales se almacenan;
- excluirlos de respuestas analíticas cuando no sean necesarios;
- proteger carga y descarga de archivos;
- registrar quién importó cada dataset;
- evitar incluir CSV reales sensibles en el repositorio;
- revisar `.gitignore`;
- definir retención y eliminación;
- verificar configuración de PostgreSQL fuera de desarrollo;
- manejar errores sin exponer información interna.

## 18. Fase 13: pruebas y cierre

### Pruebas de backend

- parser CSV;
- mapeo de columnas;
- normalización;
- validación;
- persistencia;
- cálculos estadísticos;
- endpoints;
- importaciones de titulados y empleadores.

### Pruebas de frontend

- rutas;
- navegación lateral;
- carga de CSV;
- estados de carga, vacío y error;
- filtros;
- tablas y gráficos;
- exportación;
- formularios y ramificaciones.

### Validación técnica

Desde `frontend/`:

```powershell
npm run lint
npm run build
```

Además:

- ejecutar pruebas del backend;
- probar acceso directo a rutas;
- revisar errores de consola;
- revisar el diff;
- confirmar que no haya dependencias de HTML original en producción.

## 19. Criterios para considerar el analizador terminado

- Los CSV se pueden validar e importar.
- Las importaciones tienen un identificador y estado.
- Los datos procesados se guardan en PostgreSQL.
- Los errores de calidad son visibles.
- Las reglas de indicadores están documentadas y probadas.
- La API entrega datos agregados al frontend.
- El frontend tiene rutas React y layout compartido.
- Todas las pantallas principales consumen datos reales o estados explícitos de no disponibilidad.
- Los filtros utilizan un dataset y periodo definidos.
- Las exportaciones respetan los filtros y permisos.
- La simulación tiene un modelo documentado o permanece marcada como pendiente.
- `lint`, `build` y las pruebas backend pasan.

Además, la revisión visual final debe confirmar:

- que no hay texto narrativo de informe en la interfaz;
- que cada visualización muestra título descriptivo, `n` y ayuda `¿Cómo leer esto?` cuando corresponda;
- que los porcentajes no aparecen sin sus conteos en muestras pequeñas;
- que los datos personales no aparecen en la interfaz ni en exportaciones analíticas;
- que se respetan los órdenes naturales de las escalas;
- que `No sabe`, `No observado` y `Sin respuesta` permanecen separados;
- que el color de la sección es consistente en el menú, títulos, botones y gráficos;
- que todas las pantallas mantienen la cuadrícula, márgenes y espaciado definidos.

## 20. Secuencia resumida de entregas

1. Línea base del repositorio.
2. Diccionario y contrato de datos.
3. Modelo PostgreSQL y migraciones.
4. Importador, validador y normalizador.
5. Reglas estadísticas y API analítica.
6. Router, layout y navegación React.
7. Sistema visual compartido.
8. Pantalla de carga de datos.
9. Resumen de titulados conectado a la API.
10. Resto de pantallas analíticas.
11. Formularios dinámicos, si forman parte del alcance.
12. Exportación y simulación.
13. Seguridad, pruebas y cierre.

## Bitácora de actualización

### Fase 0: línea base completada

```text
Fecha: 2026-10-07
Fase: 0 - inventario y línea base
Estado: COMPLETADA CON DEUDA TÉCNICA REGISTRADA
Completado: inventario de frontend, backend, base de datos, UI, form y data
Archivos afectados: ninguno del código; se actualizó este plan
Validaciones:
  - frontend: npm run build → OK
  - frontend: npm run lint → FALLA por 2 errores preexistentes de react-refresh/only-export-components
  - backend: .\mvnw.cmd test -DskipFrontend → OK; 2 pruebas, 0 fallos
  - Docker Compose: docker compose config --quiet → OK
  - inventario: 12 HTML, 4 MD, 4 archivos form, 2 CSV
Errores registrados:
  - frontend/src/components/ui/button.tsx: exportación de buttonVariants junto a componentes
  - frontend/src/components/ui/form.tsx: exportación de useFormField junto a componentes
Decisiones: no corregir el lint dentro de la Fase 0 ni mezclarlo con el diseño del analizador; resolverlo antes de marcar la base técnica del frontend como limpia
Bloqueos: el lint debe corregirse antes de cerrar la Fase 13
Siguiente paso: Fase 1 - contrato funcional y diccionario de datos
```

### Fase 1: contrato funcional y diccionario de datos completada

```text
Fecha: 2026-10-07
Fase: 1 - contrato funcional y diccionario de datos
Estado: COMPLETADA CON REGLAS INICIALES DOCUMENTADAS
Completado: comparación entre form/*.json, form/*.mermaid y data/*.csv; mapa de campos; reglas de normalización; exclusión de datos personales; resolución inicial de duplicados
Archivos afectados: data/data-dictionary.md y este plan
Validaciones: 60 preguntas de titulados; 32 preguntas de empleadores; 85 columnas y 8 registros de titulados; 60 columnas y 3 registros de empleadores
Bloqueos: confirmar formalmente el periodo 2026, política de almacenamiento de CSV originales y fórmulas finales de indicadores antes de producción
Decisiones: UUID + dataset_id + fila de origen; vacíos como null; Sí/No como boolean; escalas como categorías ordenadas; encabezados largos no serán nombres internos
Siguiente paso: Fase 2 - modelo de PostgreSQL y migraciones
```

### Fase 2: modelo de PostgreSQL y migraciones completada

```text
Fecha: 2026-10-07
Fase: 2 - modelo de PostgreSQL y migraciones
Estado: COMPLETADA
Completado: incorporación de Flyway; migraciones V1 y V2; entidades JPA núcleo; repositorios de datasets y respuestas; prueba de persistencia con datos anónimos
Archivos afectados: pom.xml; src/main/resources/application-dev.yml; src/main/resources/db/migration/V1__create_dataset_import_schema.sql; src/main/resources/db/migration/V2__align_dataset_hash_type.sql; src/main/java/com/simulacionem/encuesta/infrastructure/persistence/entity/; src/main/java/com/simulacionem/encuesta/infrastructure/persistence/repository/; src/test/java/com/simulacionem/encuesta/infrastructure/persistence/DatasetPersistenceTest.java
Validaciones:
  - .\mvnw.cmd test -DskipFrontend → BUILD SUCCESS; 2 pruebas, 0 fallos
  - PostgreSQL 17.6 activo en Docker
  - Flyway validó y aplicó V1 correctamente
  - Flyway validó y aplicó V2 correctamente
  - Spring Boot inició contra PostgreSQL en el puerto alternativo 8082
  - Hibernate validó el esquema con ddl-auto=validate durante el arranque
  - .\mvnw.cmd -q -DskipFrontend test → 3 pruebas, 0 fallos
  - DatasetPersistenceTest → guardado y consulta de un dataset con una respuesta anónima
Decisiones: Flyway será el mecanismo de migraciones; el esquema usa dataset_import, survey_response, respuestas específicas, catálogo de competencias e import_issue; los payloads crudo/normalizado quedan en JSONB para la primera versión del importador
Pendientes no bloqueantes: ampliar las entidades auxiliares de mapeos, competencias e incidencias conforme se implemente el importador; agregar pruebas específicas de duplicados y validación en Fase 3
Bloqueos: ninguno para iniciar la Fase 3
Siguiente paso: Fase 3 - importación, validación y normalización de CSV
```

### Fase 3: importación, validación y normalización de CSV completada

```text
Fecha: 2026-10-07
Fase: 3 - importación, validación y normalización de CSV
Estado: COMPLETADA
Completado: parser CSV UTF-8; eliminación de BOM; validación de extensión, encabezados, cantidad mínima de columnas, filas desalineadas y tipo de encuesta; detección de encabezados duplicados; normalización inicial de espacios, booleanos, números y valores vacíos; exclusión de datos personales del payload analítico; cálculo de SHA-256; persistencia transaccional de datasets, respuestas, mapeos, competencias, respuestas específicas e incidencias; endpoints REST iniciales
Archivos afectados: pom.xml; src/main/java/com/simulacionem/encuesta/application/dto/; src/main/java/com/simulacionem/encuesta/application/service/CsvImportService.java; src/main/java/com/simulacionem/encuesta/presentation/rest/DatasetController.java; src/main/java/com/simulacionem/encuesta/infrastructure/persistence/entity/; src/main/java/com/simulacionem/encuesta/infrastructure/persistence/repository/; src/test/java/com/simulacionem/encuesta/application/service/CsvImportServiceTest.java
Validaciones:
  - CSV de titulados real → tipo TITULADOS, 8 filas leídas y 8 filas procesables
  - CSV de empleadores real → tipo EMPLEADORES, 3 filas leídas y 3 filas procesables
  - .\mvnw.cmd -q -DskipFrontend test → 5 pruebas, 0 fallos
  - Flyway validó el esquema en versión 2 y la prueba persistió ambos datasets en PostgreSQL
  - CSV de titulados → 85 mapeos y 8 respuestas persistidas; duplicados reportados como advertencias
  - CSV de empleadores → 60 mapeos y 3 respuestas persistidas; valoraciones de competencias normalizadas cuando corresponden
  - Archivo con extensión inválida → rechazado con `EXTENSION_INVALIDA`
  - Los campos personales no se copian al payload analítico normalizado
API disponible:
  - POST /api/datasets/validate
  - POST /api/datasets/import
  - GET /api/datasets
  - GET /api/datasets/{id}
  - GET /api/datasets/{id}/quality
Pendientes no bloqueantes: ampliar progresivamente el mapeo semántico de todas las preguntas del diccionario y aprobar catálogos de categorías de negocio; estos cambios se incorporarán antes de activar indicadores específicos en producción
Bloqueos: ninguno para iniciar la Fase 4
Siguiente paso: Fase 4 - reglas estadísticas y API analítica
```

### Fase 4: reglas estadísticas y API analítica completada con limitación documentada

```text
Fecha: 2026-10-07
Fase: 4 - reglas estadísticas y API analítica
Estado: COMPLETADA CON LIMITACIÓN DOCUMENTADA
Completado: contratos DTO; conteos de respuestas válidas; distribuciones con porcentajes; promedios numéricos; valoración Likert de empleadores; resumen de titulados; empleo; formación; resumen de empleadores; promedios de competencias; cruces entre dos campos; filtros por datasetId
Archivos afectados: src/main/java/com/simulacionem/analitica/application/dto/; src/main/java/com/simulacionem/analitica/application/service/AnalyticsService.java; src/main/java/com/simulacionem/analitica/presentation/rest/AnalyticsController.java; src/main/java/com/simulacionem/encuesta/application/service/CsvImportService.java; src/test/java/com/simulacionem/encuesta/application/service/CsvImportServiceTest.java; este plan
Validaciones:
  - Resumen de titulados sobre CSV real → 8 respuestas válidas y distribución de sector calculada
  - Valoración de empleadores → categorías originales de 3 niveles más `No sabe`, con conteos y porcentajes; no se inventa una escala 1–5
  - Desviación estándar muestral → calculada con `n - 1`; no disponible cuando `n < 2`
  - Muestra pequeña → `smallSample` se activa cuando `n < 5`
  - Suite Maven → 6 pruebas, 0 fallos
  - Fórmulas y tratamiento de vacíos documentados en esta fase
API disponible:
  - GET /api/analytics/titulados/summary
  - GET /api/analytics/titulados/employment
  - GET /api/analytics/titulados/education
  - GET /api/analytics/employers/summary
  - GET /api/analytics/employers/valuation
  - GET /api/analytics/competencies/gaps
  - GET /api/analytics/crosses
  - POST /api/analitica/chi-cuadrado
Limitación documentada: no se implementa una brecha numérica del tipo expectativa menos valoración porque los CSV actuales no contienen una expectativa estructurada comparable; las necesidades esperadas aparecen en texto libre. Esto no impide mostrar medias, desviaciones estándar ni resultados separados por encuesta.
Extensión posible: puede calcularse una comparación titulados-empleadores por competencia cuando ambos datasets tengan la misma escala y catálogo; no debe confundirse con la brecha expectativa-valoración.
Pendientes no bloqueantes: agregar pruebas unitarias aisladas para porcentajes y cruces; incorporar al resultado Chi-cuadrada el aviso de celdas con frecuencia esperada menor que 5; la regla de muestra pequeña ya queda fijada en `n < 5`; `No sabe` y `No observado` deben permanecer separados de medias y desviaciones
Bloqueos: ninguno para iniciar la Fase 5; la brecha expectativa-valoración permanece pendiente del contrato de datos
Siguiente paso: Fase 5 - base técnica del frontend
```

### Fase 5: base técnica del frontend completada

```text
Fecha: 2026-10-07
Fase: 5 - base técnica del frontend
Estado: COMPLETADA
Completado: router SPA basado en History API; configuración única de navegación; AppLayout; sidebar responsive con estado activo y menú móvil; header común; rutas provisionales para titulados y empleadores; redirección de rutas desconocidas; acceso directo a rutas mediante SpaForwardController existente
Archivos afectados: frontend/src/App.tsx; frontend/src/app/navigation.ts; frontend/src/app/router.tsx; frontend/src/app/AppLayout.tsx; frontend/src/app/PlaceholderPage.tsx; este plan
Rutas verificadas en la configuración: /cargar-datos; /titulados/resumen; /titulados/perfil-empleabilidad; /titulados/formacion-continua; /titulados/financiamiento; /titulados/brechas-competencias; /titulados/cruces-exportacion; /titulados/simulacion-escenarios; /empleadores/resumen-contratacion; /empleadores/valoracion-carrera; /empleadores/brechas-competencias; /empleadores/cruces-exportacion
Validaciones:
  - npm run build → TypeScript y Vite completan correctamente
  - Todas las rutas se generan desde una configuración única y conservan navegación directa por URL
  - El enlace activo se actualiza al navegar y el menú móvil puede abrirse y cerrarse
  - npm run lint → quedan 2 errores preexistentes en componentes generados de shadcn (`button.tsx` y `form.tsx`); no corresponden a la implementación de esta fase
Decisiones: no se agrega una dependencia de router adicional; la navegación usa History API para mantener la base liviana y permitir acceso directo con el forwarding del backend; las pantallas aún no migradas muestran un estado provisional explícito
Pendientes no bloqueantes: migrar componentes visuales y tokens del prototipo en Fase 6; conectar carga real en Fase 7; reemplazar estados provisionales por vistas analíticas en Fases 8 y 9
Bloqueos: ninguno para iniciar la Fase 6
Siguiente paso: Fase 6 - sistema visual y componentes compartidos
```

### Fase 6: sistema visual y componentes compartidos completada

```text
Fecha: 2026-10-08
Fase: 6 - sistema visual y componentes compartidos
Estado: COMPLETADA CON DEUDA TÉCNICA REGISTRADA
Completado: tokens visuales del sistema de diseño; tipografía y numerales tabulares; colores separados para titulados y empleadores; superficies, bordes, radios y estados; componentes compartidos Badge, KpiCard, StatusPanel, FilterToolbar y ExportActions; aplicación de la paleta institucional al layout y a las pantallas provisionales
Archivos afectados: frontend/src/index.css; frontend/src/app/AppLayout.tsx; frontend/src/app/PlaceholderPage.tsx; frontend/src/components/analytics/Badge.tsx; frontend/src/components/analytics/KpiCard.tsx; frontend/src/components/analytics/StatusPanel.tsx; frontend/src/components/analytics/FilterToolbar.tsx; frontend/src/components/analytics/ExportActions.tsx
Validaciones:
  - npm run build → TypeScript y Vite completan correctamente
  - git diff --check → sin errores de whitespace
  - npm run lint → los componentes nuevos no agregan errores; permanecen únicamente los 2 errores preexistentes de react-refresh/only-export-components en components/ui/button.tsx y components/ui/form.tsx
  - Los componentes compartidos se utilizan desde más de una pantalla provisional a través de PlaceholderPage
Decisiones: los colores, tipografías y dimensiones principales se expresan mediante tokens CSS; las pantallas distinguen el dominio de titulados con azul y empleadores con verde azulado; las exportaciones se presentan como controles reutilizables hasta que la Fase 11 implemente sus endpoints
Pendientes no bloqueantes: revisar los componentes shadcn generados para eliminar la deuda de lint; conectar controles de filtro y exportación con datos reales en las fases analíticas; añadir Dialog y mejoras específicas de Chart cuando se migren las pantallas
Bloqueos: ninguno para iniciar la Fase 7
Siguiente paso: Fase 7 - pantalla de carga de datos
```

### Fase 7: pantalla de carga de datos completada

```text
Fecha: 2026-10-08
Fase: 7 - pantalla de carga de datos
Estado: COMPLETADA CON ALCANCE CSV DOCUMENTADO
Completado: selección del tipo de encuesta; selección de archivo CSV; envío multipart a validación; presentación de filas leídas, válidas y rechazadas; avisos y errores por fila/código/mensaje; confirmación condicionada a cero errores y al menos una fila válida; importación del archivo; presentación del datasetId; consulta, selección y eliminación segura del dataset activo mediante localStorage; listado de datasets existentes
Archivos afectados: frontend/src/api/client.ts; frontend/src/features/encuesta/api.ts; frontend/src/features/encuesta/CargarDatosPage.tsx; frontend/src/app/PlaceholderPage.tsx; este plan
Endpoints utilizados:
  - POST /api/datasets/validate
  - POST /api/datasets/import
  - GET /api/datasets
  - DELETE /api/datasets/{id}
Validaciones:
  - npm run build → TypeScript y Vite completan correctamente
  - npm run lint → permanecen únicamente los 2 errores preexistentes de react-refresh/only-export-components en components/ui/button.tsx y components/ui/form.tsx
  - La solicitud multipart no fuerza Content-Type JSON, permitiendo que el navegador construya correctamente el boundary de FormData
  - El botón Procesar permanece deshabilitado si no hay archivo, si existen errores, si no hay filas válidas o si el tipo detectado no coincide con el seleccionado
  - Las incidencias no se ocultan y distinguen errores de advertencias
  - La eliminación solicita confirmación, borra el dataset y sus dependencias mediante las claves foráneas `ON DELETE CASCADE`, y limpia el dataset activo si correspondía
Decisiones: la pantalla no envía datos a las vistas analíticas; guarda únicamente el identificador activo para que las fases posteriores consulten la API; la detección final del tipo de encuesta pertenece al backend y la selección de la interfaz se usa como comprobación de coherencia
Alcance documentado: el contrato actual de la API implementa CSV; JSON de estructura y XLSX quedan para una ampliación posterior del contrato de importación, no se simulan como formatos aceptados
Pendientes no bloqueantes: agregar una prueba de interfaz automatizada; mostrar información detallada de columnas/preguntas detectadas cuando el backend la exponga; agregar soporte JSON/XLSX si se aprueba en el contrato de datos; conectar las vistas analíticas al dataset activo en Fases 8 y 9
Bloqueos: ninguno para iniciar la Fase 8
Siguiente paso: Fase 8 - pantalla analítica piloto de resumen de titulados
```

### Fase 8: pantalla analítica piloto de resumen de titulados completada

```text
Fecha: 2026-10-08
Fase: 8 - pantalla analítica piloto
Estado: COMPLETADA CON ESTADOS DE DATOS IMPLEMENTADOS
Completado: consulta de datasets de titulados; selección del dataset activo; consumo de /api/analytics/titulados/summary; cuatro KPI; distribuciones de estado laboral y formación/interés en posgrado; conteos y porcentajes; aviso de muestra pequeña; estados de carga, vacío y error; selector persistente del dataset
Archivos afectados: src/main/java/com/simulacionem/analitica/application/dto/AnalyticsSummaryDto.java; src/main/java/com/simulacionem/analitica/application/service/AnalyticsService.java; frontend/src/features/analitica/api.ts; frontend/src/features/analitica/TituladosSummaryPage.tsx; frontend/src/app/PlaceholderPage.tsx; este plan
Contrato ampliado: el resumen analítico incluye `numericMedians` para que la interfaz pueda mostrar la mediana de año de titulación sin calcularla a partir de datos crudos en el navegador
Validaciones:
  - npm run build → TypeScript y Vite completan correctamente
  - .\mvnw.cmd -q -DskipFrontend test → BUILD SUCCESS; 6 pruebas, 0 fallos
  - La vista no muestra valores ficticios cuando no existe un dataset; presenta estado vacío
  - Los errores HTTP se muestran como estado de error y la consulta muestra estado de carga
  - `smallSample` activa un aviso cuando el dataset tiene menos de 5 respuestas válidas
  - Los KPI mantienen conteos junto con porcentajes y muestran `n` de la variable utilizada
Limitación documentada: la API actual entrega el año de titulación y la interfaz muestra la mediana transformada a años desde titulación usando el año calendario del navegador; una fecha de corte histórica configurable podrá agregarse si el análisis requiere reproducibilidad temporal
Pendientes no bloqueantes: sustituir las barras CSS por los gráficos definitivos del sistema; agregar filtros reales de periodo cuando exista el campo en el contrato; ampliar las pruebas de componente y la comparación visual con el HTML de referencia
Bloqueos: ninguno para iniciar la Fase 9
Siguiente paso: Fase 9 - migración del resto del analizador
```

### Fase 9: migración del resto del analizador completada con pendientes de contrato

```text
Fecha: 2026-10-08
Fase: 9 - migración del resto del analizador
Estado: COMPLETADA CON LIMITACIONES DOCUMENTADAS
Completado: perfil y empleabilidad conectado a /api/analytics/titulados/employment; formación continua conectada a /api/analytics/titulados/education; resumen de empleadores conectado a /api/analytics/employers/summary; valoración de carrera conectada a /api/analytics/employers/valuation; brechas de titulados y empleadores conectadas a /api/analytics/competencies/gaps; cruces de titulados y empleadores conectados a /api/analytics/crosses; estados de carga, vacío y error en las pantallas conectadas; selección de dataset por dominio; pantallas de financiamiento y simulación con estados explícitos de no disponibilidad
Archivos afectados: frontend/src/features/analitica/RestAnalyticPages.tsx; frontend/src/app/PlaceholderPage.tsx; este plan
Rutas migradas:
  - /titulados/perfil-empleabilidad
  - /titulados/formacion-continua
  - /titulados/financiamiento
  - /titulados/brechas-competencias
  - /titulados/cruces-exportacion
  - /titulados/simulacion-escenarios
  - /empleadores/resumen-contratacion
  - /empleadores/valoracion-carrera
  - /empleadores/brechas-competencias
  - /empleadores/cruces-exportacion
Validaciones:
  - npm run build → TypeScript y Vite completan correctamente
  - npm run lint → permanecen únicamente los 2 errores preexistentes de react-refresh/only-export-components en components/ui/button.tsx y components/ui/form.tsx
  - Las pantallas conectadas muestran conteos, porcentajes, medias y desviaciones desde respuestas de API; no incorporan valores escritos manualmente
  - Las brechas excluyen No observado porque el endpoint ya entrega solo valoraciones válidas para el promedio
  - Los cruces muestran filas, columnas, frecuencias y n; la exportación se mantiene deshabilitada hasta la Fase 11
Decisiones: se reutiliza un componente analítico común para selección de dataset, estados y distribuciones; empleadores conserva la paleta verde azulado; las pantallas sin endpoint no fingen resultados y enumeran los datos/operaciones que faltan
Limitaciones: financiamiento requiere un endpoint de tabla de contingencia y Chi-cuadrada; simulación requiere modelo matemático y API; exportaciones CSV/Excel/PNG se implementarán en Fase 11; perfil y formación usan las distribuciones disponibles y no agregan pestañas de ramas que todavía no tienen endpoints específicos
Pendientes no bloqueantes: ampliar endpoints por rama del formulario, reemplazar entradas libres de variables de cruce por catálogos permitidos, agregar radar/heatmap y pruebas de componentes, implementar exportaciones y simulación en su fase asignada
Bloqueos: ninguno para iniciar la Fase 10; las limitaciones de financiamiento, exportación y simulación están documentadas y no se presentan como completadas
Siguiente paso: Fase 10 - formularios dinámicos
```

## Resultado final esperado

Una aplicación React mantenible, conectada a Spring Boot y PostgreSQL, que importe CSV reales, informe problemas de calidad, guarde datos normalizados, calcule indicadores reproducibles y muestre las pantallas analíticas mediante un layout compartido.

