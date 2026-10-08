# Plan de migración del prototipo al frontend React

## Objetivo

Trasladar progresivamente el prototipo visual de `UI/` al frontend React ubicado en `frontend/`, conservando la apariencia general, la navegación lateral y la organización funcional de las pantallas, pero adaptando la implementación a la arquitectura existente.

La migración debe evitar convertir cada archivo HTML en una página aislada. El resultado esperado es una aplicación React con un layout compartido, componentes reutilizables, rutas internas y datos preparados para conectarse con la API del backend.

## Cómo utilizar este plan

Este documento debe ejecutarse de arriba hacia abajo. Cada fase tiene una dependencia: no se debe saltar a la siguiente solamente porque una parte de la interfaz ya sea visible.

Para cada tarea, la IA o desarrollador debe:

1. leer primero los archivos relacionados;
2. comprobar el estado actual del repositorio;
3. realizar el cambio más pequeño que cumpla el objetivo;
4. ejecutar las validaciones indicadas;
5. revisar el diff antes de continuar;
6. dejar documentados los bloqueos o decisiones pendientes.

Una fase no se considera terminada porque el código compile parcialmente. Debe cumplir sus entregables y criterios de aceptación.

### Regla de no regresión

Antes de modificar una fase ya completada, verificar que no se rompan:

- `npm run lint`;
- `npm run build`;
- las rutas existentes;
- el menú lateral;
- el contrato de la API;
- los tipos compartidos.

### Límites de la migración

- No copiar HTML completo dentro de componentes React.
- No leer CSV directamente desde las vistas analíticas.
- No modificar los CSV originales durante la importación.
- No crear un componente diferente para cada tarjeta si la estructura puede parametrizarse.
- No inventar endpoints sin revisar primero los controladores y casos de uso existentes.
- No eliminar archivos del prototipo hasta que la pantalla React equivalente haya sido validada.

## Estado actual

### Prototipo visual

- Está compuesto por pantallas HTML independientes.
- Cada pantalla repite su propio menú lateral, encabezado y estructura visual.
- Utiliza Tailwind CSS mediante CDN.
- Utiliza Material Symbols para iconos.
- Contiene datos ficticios y valores estáticos.
- La navegación funciona mediante enlaces relativos entre archivos HTML.

### Frontend del repositorio

- React 19 y TypeScript.
- Vite como herramienta de desarrollo y construcción.
- Tailwind CSS 4.
- shadcn configurado con estilo `new-york`.
- Componentes reutilizables en `frontend/src/components/ui/`.
- Iconos mediante `lucide-react`.
- Gráficos mediante `recharts`.
- Alias `@/` configurado para `frontend/src/`.
- Actualmente existe una vista principal en `App.tsx`, sin un sistema de rutas completo.

### Definición de formularios

La carpeta `form/` contiene la definición funcional de las encuestas que alimentarán el sistema:

- encuesta de titulados: 11 secciones y 60 preguntas;
- encuesta de empleadores: 4 secciones y 32 preguntas;
- tipos de pregunta, validaciones y opciones de respuesta;
- ramificaciones condicionales;
- diagramas Mermaid con el flujo de cada encuesta.

Esta información debe utilizarse como contrato funcional para las pantallas de captura y mantenerse separada de las pantallas analíticas del prototipo.

### Datos de entrada del analizador

La carpeta `data/` contiene los CSV que serán importados al analizador. Estos archivos deben considerarse datos originales de entrada, no archivos que el frontend deba leer directamente.

El flujo esperado es:

```text
CSV original → validación → mapeo de columnas → normalización → almacenamiento → indicadores → vistas analíticas
```

Los CSV presentan encabezados largos, preguntas con saltos de línea, posibles columnas duplicadas, respuestas vacías y valores escritos de distintas formas. Por eso se necesita una etapa de importación y calidad de datos antes de consumirlos en las pantallas.

## Principios de la migración

1. Migrar primero la estructura y la navegación, y después el contenido específico de cada pantalla.
2. Crear una sola fuente de verdad para el menú lateral y evitar copiarlo en cada vista.
3. Reutilizar los componentes shadcn existentes antes de crear componentes nuevos.
4. Separar layout, componentes visuales, datos de ejemplo y llamadas a la API.
5. Mantener el prototipo funcional durante toda la migración.
6. Migrar una pantalla completa como referencia antes de replicar el patrón en las demás.
7. No conectar datos reales hasta que la estructura visual y las rutas estén estabilizadas.
8. Mantener la lógica de negocio fuera de los componentes puramente visuales.
9. Tratar los JSON de `form/` como definiciones de formularios y no como datos incrustados directamente en las vistas.
10. Mantener los CSV originales sin alterarlos y producir los datos normalizados mediante un proceso reproducible.

## Convenciones de trabajo

### Ubicación de archivos

- Código React: `frontend/src/`.
- Componentes shadcn: `frontend/src/components/ui/`.
- Funcionalidades de titulados y empleadores: `frontend/src/features/`.
- Cliente HTTP: `frontend/src/api/`.
- Formatos de encuestas: `form/`.
- CSV originales: `data/`.
- Prototipo de referencia: `UI/`.
- Backend Spring Boot: `src/main/java/`.

### Separación de responsabilidades

| Responsabilidad | Lugar recomendado |
|---|---|
| Layout y navegación | `frontend/src/components/layout/` y `app/` |
| Componentes visuales básicos | `frontend/src/components/ui/` |
| Pantallas de titulados | `frontend/src/features/titulados/` |
| Pantallas de empleadores | `frontend/src/features/empleadores/` |
| Definiciones de formularios | `form/` o un módulo de dominio equivalente |
| Importación y normalización CSV | Backend Spring Boot |
| Llamadas HTTP | `frontend/src/api/` o `features/*/api.ts` |
| Datos temporales de prueba | `frontend/src/shared/mock-data/` |

### Entregable mínimo por tarea

Cada tarea debe terminar con:

- archivos creados o modificados claramente identificados;
- comportamiento esperado descrito en una frase;
- validación ejecutada;
- errores conocidos documentados;
- ningún cambio no relacionado incluido en el diff.

## Fase 1: Preparación y línea base

### Actividades

- Ejecutar el frontend actual y confirmar que compila correctamente.
- Ejecutar `npm run lint` y `npm run build` desde `frontend/`.
- Revisar los componentes shadcn ya disponibles y determinar cuáles se pueden reutilizar.
- Registrar los colores, tipografías, tamaños y espaciados principales del prototipo.
- Identificar qué elementos son comunes a todas las pantallas:
  - menú lateral;
  - encabezado superior;
  - selector de periodo;
  - indicador de datos cargados;
  - botones de definiciones y exportación;
  - tarjetas, tablas, indicadores y gráficos.

### Resultado esperado

Una línea base verificable del frontend actual y una lista clara de elementos compartidos y específicos.

## Fase 2: Definición de rutas y navegación

Antes de trasladar todas las pantallas, se debe establecer la navegación de la SPA.

### Rutas sugeridas

| Ruta | Pantalla |
|---|---|
| `/cargar-datos` | Carga y descripción de datos |
| `/titulados/resumen` | Resumen de titulados |
| `/titulados/perfil-empleabilidad` | Perfil y empleabilidad |
| `/titulados/formacion-continua` | Formación continua |
| `/titulados/financiamiento` | Financiamiento |
| `/titulados/brechas-competencias` | Brechas de competencias |
| `/titulados/cruces-exportacion` | Cruces y exportación |
| `/titulados/simulacion-escenarios` | Simulación de escenarios |
| `/empleadores/resumen-contratacion` | Resumen y contratación |
| `/empleadores/valoracion-carrera` | Valoración de la carrera |
| `/empleadores/brechas-competencias` | Brechas de competencias |
| `/empleadores/cruces-exportacion` | Cruces y exportación |

### Actividades

- Incorporar un router para React si el proyecto aún no lo incluye.
- Definir las rutas anteriores en un único módulo.
- Crear una página temporal o componente de carga para rutas todavía no migradas.
- Configurar el estado activo del menú a partir de la ruta actual.
- Verificar que el `SpaForwardController` permita acceder directamente a las rutas de la SPA.
- Evitar que el menú dependa de enlaces a archivos `.html`.

### Resultado esperado

La aplicación puede desplazarse entre todas las secciones mediante rutas React, aunque algunas vistas todavía muestren contenido provisional.

## Fase 3: Layout compartido

### Componentes sugeridos

```text
frontend/src/
├── app/
│   ├── router.tsx
│   └── AppLayout.tsx
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── AppHeader.tsx
│   │   └── PageContainer.tsx
│   └── navigation/
│       ├── navigation-config.ts
│       └── NavigationSection.tsx
```

### Menú lateral

El menú debe construirse desde una configuración tipada, por ejemplo:

```ts
type NavigationItem = {
  label: string
  path: string
  group: 'titulados' | 'empleadores' | 'general'
}
```

La configuración debe contener:

- nombre visible;
- ruta;
- grupo al que pertenece;
- icono opcional;
- indicador de datos, como `N=14` o `N=8`;
- estado activo calculado por la ruta actual.

### Encabezado

El encabezado debe recibir mediante props o contexto:

- periodo seleccionado;
- cantidad de titulados;
- cantidad de empleadores;
- título o subtítulo de la vista;
- acciones disponibles.

### Resultado esperado

Todas las pantallas comparten el mismo lateral y encabezado. Una modificación visual se realiza una sola vez.

## Fase 4: Sistema visual

### Actividades

- Trasladar los colores principales del prototipo a variables CSS o tokens de Tailwind.
- Comparar los tokens actuales de shadcn con la paleta del prototipo.
- Definir tokens para:
  - azul principal;
  - azul de titulados;
  - turquesa de empleadores;
  - superficies;
  - bordes;
  - estados de éxito, advertencia y error;
  - colores de gráficos.
- Mantener la tipografía consistente en todo el frontend.
- Sustituir Material Symbols por iconos equivalentes de `lucide-react`.
- Crear variantes de botones, badges y tarjetas cuando el estilo se repita.

### Componentes que probablemente conviene ampliar

- `Badge` para etiquetas de grupo y estados.
- `Button` para acciones primarias y secundarias.
- `Card` para bloques de indicadores y secciones.
- `Table` para datos tabulares.
- `Chart` para gráficos estadísticos.
- `Select` para el periodo y filtros.
- `Dialog` o `Sheet` para definiciones y explicaciones.

### Resultado esperado

El diseño visual se expresa mediante tokens y componentes React, sin depender de estilos embebidos repetidos.

## Fase 5: Migración de una pantalla piloto

Se recomienda comenzar por `resumen-titulados.html`, porque representa la estructura general del analizador y permite validar el layout completo.

### Orden de implementación

1. Crear la ruta `/titulados/resumen`.
2. Montar `AppLayout`.
3. Implementar el encabezado y el lateral.
4. Crear los indicadores principales.
5. Migrar las tarjetas y tablas de resumen.
6. Migrar los gráficos con `recharts`.
7. Sustituir los datos escritos en el HTML por datos tipados de ejemplo.
8. Comparar visualmente con el HTML original.
9. Verificar el comportamiento en escritorio y resoluciones menores.

### Resultado esperado

Una primera pantalla React completa que sirva como patrón para las demás.

## Fase 6: Importación y calidad de datos

Esta fase debe completarse antes de conectar las vistas analíticas con datos reales.

### Organización de los archivos

Conservar los CSV originales sin modificarlos y separar los resultados procesados:

```text
data/
├── raw/
│   ├── titulados.csv
│   └── empleadores.csv
├── processed/
└── README.md
```

### Validación del archivo

El backend debe validar:

- que el archivo sea CSV y no esté vacío;
- que corresponda a titulados o empleadores;
- que las columnas mínimas existan;
- que no haya encabezados ambiguos;
- que las filas tengan una estructura válida;
- que las respuestas respeten los tipos definidos en `form/`.

### Mapeo y normalización

No se deben utilizar directamente los textos completos de las preguntas como nombres internos. Cada columna debe mapearse a un identificador estable relacionado con la pregunta del formulario.

La normalización debe contemplar:

- espacios innecesarios;
- valores equivalentes como `SI`, `Sí` y `si`;
- escalas como `4 - Suficiente` convertidas a valores numéricos;
- celdas vacías convertidas a `null`;
- respuestas múltiples;
- fechas;
- departamentos y categorías;
- correos inválidos y advertencias de calidad.

El sistema debe conservar el valor original cuando aplique y registrar advertencias sin alterar silenciosamente la fuente.

### Resultado de la importación

Cada importación debe registrar:

- nombre del archivo;
- tipo de encuesta;
- periodo;
- fecha de importación;
- filas leídas, válidas y rechazadas;
- cantidad de advertencias y errores;
- estado del conjunto de datos.

Estados sugeridos: `CARGADO`, `VALIDANDO`, `CON_ADVERTENCIAS`, `LISTO` y `CON_ERRORES`.

### API inicial sugerida

```text
POST /api/datasets/validate
POST /api/datasets/import
GET  /api/datasets
GET  /api/datasets/{id}
GET  /api/datasets/{id}/quality
```

La carga y transformación deben ejecutarse en Spring Boot. React debe encargarse de seleccionar el archivo, mostrar el resultado y confirmar la importación.

## Fase 7: Modelo de datos de presentación

Antes de conectar la API completa, se deben definir tipos para los datos que consumen las vistas.

### Ejemplos de tipos

```ts
type Periodo = {
  id: string
  label: string
}

type ResumenTitulados = {
  total: number
  empleados: number
  desempleados: number
  promedioInsercion: number
}

type Competencia = {
  nombre: string
  valorActual: number
  valorEsperado: number
  brecha: number
}
```

### Organización sugerida

```text
frontend/src/
├── features/
│   ├── titulados/
│   │   ├── types.ts
│   │   ├── api.ts
│   │   └── pages/
│   └── empleadores/
│       ├── types.ts
│       ├── api.ts
│       └── pages/
└── shared/
    ├── types/
    └── mock-data/
```

Los datos ficticios deben permanecer separados de los componentes para poder reemplazarlos posteriormente por llamadas HTTP sin rehacer la interfaz.

## Fase 8: Modelado de formularios dinámicos

La información existente en `form/` requiere una fase propia antes de implementar las pantallas reales de captura.

### Modelo recomendado

Definir tipos para representar los JSON de titulados y empleadores:

```ts
type FormDefinition = {
  titulo: string
  descripcion?: string
  secciones: FormSection[]
  preguntas: FormQuestion[]
}

type FormQuestion = {
  orden: number
  seccion: number
  tipo: QuestionType
  titulo: string
  ayuda?: string
  requerida?: boolean
  opciones?: FormOption[] | string[]
  ramifica?: boolean
}
```

### Componentes de captura

Crear un renderer que seleccione el componente según el campo `tipo`:

- `TEXT`: input de texto;
- `PARAGRAPH_TEXT`: textarea;
- `MULTIPLE_CHOICE`: radio group;
- `CHECKBOX`: selección múltiple;
- `LIST`: select;
- `GRID`: matriz de opciones;
- `SECTION_HEADER`: encabezado de sección;
- `IMAGE`: contenido visual informativo.

Estos componentes deben reutilizar shadcn y `react-hook-form`, que ya están incluidos en el frontend.

### Ramificaciones y validaciones

- Interpretar `SIGUE_A_LA_SIGUIENTE_SECCION`.
- Interpretar `IR_A_SECCION`.
- Interpretar `ENVIAR_FORMULARIO`.
- Mostrar u ocultar secciones según las respuestas.
- Conservar las respuestas al avanzar y retroceder.
- Validar preguntas obligatorias antes de avanzar.
- Mostrar el progreso de la encuesta.
- Verificar que el flujo coincida con los diagramas Mermaid.

### Orden de implementación

1. Cargar y validar un JSON.
2. Mostrar secciones lineales.
3. Implementar preguntas simples.
4. Implementar matrices `GRID`.
5. Implementar validaciones.
6. Implementar ramificaciones.
7. Implementar revisión y envío.

El resultado debe ser una pantalla de encuesta reutilizable que reciba la definición de titulados o empleadores sin duplicar todo el formulario.

## Fase 9: Migración de las pantallas restantes

Después de validar la pantalla piloto, migrar en este orden:

1. `cargar-datos.html`.
2. Resto de pantallas de resumen.
3. Perfil y empleabilidad.
4. Formación continua y financiamiento.
5. Valoración de la carrera.
6. Brechas de competencias.
7. Cruces y exportación.
8. Simulación de escenarios.

Para cada pantalla:

- crear su ruta;
- crear una página dentro de su feature;
- reutilizar el layout existente;
- identificar tarjetas, tablas, filtros y gráficos;
- extraer componentes específicos solo cuando se repitan;
- definir los tipos de datos necesarios;
- incluir estados de carga, vacío y error;
- comparar con el HTML original antes de marcarla como terminada.

## Fase 10: Integración con el backend

La integración con la API debe hacerse después de estabilizar cada vista con datos de ejemplo.

### Actividades

- Revisar los endpoints existentes en `src/main/java`.
- Definir DTOs de respuesta compatibles con el frontend.
- Crear funciones `api.ts` por feature.
- Reutilizar `apiRequest` para las llamadas HTTP.
- Manejar estados de carga, error y ausencia de datos.
- Evitar llamadas directas a `fetch` dentro de componentes visuales.
- Confirmar el comportamiento del proxy `/api` en Vite.
- Añadir endpoints nuevos solo cuando una pantalla realmente los necesite.

### Resultado esperado

Cada pantalla consume datos desde una capa de API definida, sin mezclar transporte HTTP con presentación visual.

## Fase 11: Exportación, filtros y acciones

Las acciones del prototipo deben migrarse gradualmente:

- filtros por periodo;
- selección de variables;
- cambio entre cantidades y porcentajes;
- exportación de tablas o vistas;
- modales de definiciones;
- simulación de escenarios.

Cada acción debe tener un estado explícito y una respuesta visual clara. Las acciones que todavía no tengan backend pueden comenzar con datos locales, pero deben quedar identificadas como provisionales.

## Fase 12: Validación visual y funcional

### Validación por pantalla

- La ruta abre directamente sin errores.
- El menú lateral muestra la sección activa correcta.
- Todos los enlaces navegan a una ruta válida.
- El encabezado mantiene el mismo comportamiento.
- Los datos se muestran correctamente.
- Las tablas no desbordan el contenido.
- Los gráficos se adaptan al contenedor.
- Los estados de carga, vacío y error son comprensibles.
- La vista funciona en diferentes anchos de ventana.

### Validación técnica

Ejecutar desde `frontend/`:

```powershell
npm run lint
npm run build
```

Además, comprobar:

- ausencia de errores en la consola del navegador;
- ausencia de rutas rotas;
- ausencia de imports innecesarios;
- tipos TypeScript sin errores;
- componentes sin duplicación injustificada.

## Criterio para considerar una pantalla migrada

Una pantalla se considera migrada cuando:

- existe como ruta React;
- utiliza el layout compartido;
- no depende del HTML original;
- usa componentes shadcn o componentes propios reutilizables;
- tiene datos tipados, aunque inicialmente sean datos de ejemplo;
- conserva la intención visual del prototipo;
- tiene estados básicos de carga, vacío y error;
- pasa `lint` y `build`;
- fue revisada visualmente frente al prototipo.

En las pantallas de captura también debe verificarse que:

- la definición JSON se cargue sin errores;
- las preguntas obligatorias se validen;
- las ramificaciones coincidan con los diagramas Mermaid;
- las respuestas no se pierdan al cambiar de sección;
- el envío produzca una estructura compatible con la API.

## Riesgos y decisiones pendientes

### Router

Actualmente no se observó un router instalado. Se debe decidir si se incorpora React Router o si se implementa una solución mínima basada en el historial del navegador. Para este número de pantallas, un router dedicado resulta más mantenible.

### Estado global

El periodo seleccionado, los conteos de datos y los filtros podrían compartirse entre varias pantallas. Primero conviene mantenerlos en el layout o en hooks locales; incorporar un estado global solo cuando exista una necesidad real.

### Datos del prototipo

Los valores ficticios deben tratarse como datos de muestra y no como lógica definitiva. Conviene centralizarlos para facilitar su reemplazo por la API.

### Diferencias visuales

El prototipo usa una paleta y dimensiones propias, mientras que shadcn trae tokens genéricos. La adaptación debe hacerse sobre los tokens del sistema, evitando llenar los componentes con colores arbitrarios en línea.

## Secuencia recomendada de entregas

1. Rutas y layout compartido.
2. Menú lateral funcional.
3. Pantalla piloto de resumen de titulados.
4. Tokens visuales y componentes compartidos.
5. Flujo de importación, validación y calidad de datos.
6. Mapeo y normalización de los CSV.
7. Modelo común de formularios basado en `form/`.
8. Renderer de preguntas y validaciones básicas.
9. Ramificaciones de titulados y empleadores.
10. Pantallas restantes con datos de ejemplo.
11. Integración progresiva con la API.
12. Filtros, exportación y simulación.
13. Validación final y limpieza del prototipo HTML.

## Resultado final esperado

El frontend React debe contener una aplicación navegable y mantenible, con una estructura compartida para todas las secciones, componentes shadcn adaptados al diseño del prototipo, datos tipados y una integración progresiva con el backend Spring Boot.

## Lista de aceptación por fase

### Fases 1 a 4: base técnica y visual

- [ ] El frontend actual compila antes de iniciar la migración.
- [ ] Las rutas no dependen de archivos HTML.
- [ ] El layout se renderiza una sola vez.
- [ ] El elemento activo del menú cambia según la ruta.
- [ ] Los tokens visuales están definidos en CSS/Tailwind.
- [ ] Los iconos migrados utilizan `lucide-react`.

### Fase 5: pantalla piloto

- [ ] `/titulados/resumen` abre directamente.
- [ ] La pantalla usa el layout compartido.
- [ ] Sus datos están tipados.
- [ ] Sus tablas y gráficos no dependen de datos escritos dentro del JSX.
- [ ] La comparación con `UI/resumen-titulados.html` fue realizada.

### Fase 6: importación de datos

- [ ] El CSV original se conserva sin cambios.
- [ ] El backend identifica el tipo de encuesta.
- [ ] Las columnas se mapean a nombres internos estables.
- [ ] Se separan errores de advertencias.
- [ ] Se informa cuántas filas fueron aceptadas y rechazadas.
- [ ] Una importación validada puede identificarse por un `datasetId`.

### Fase 7: datos de presentación

- [ ] Cada vista tiene tipos de respuesta definidos.
- [ ] Los datos mock pueden reemplazarse por datos de API sin cambiar la vista.
- [ ] Los cálculos de indicadores no están duplicados en varios componentes.

### Fase 8: formularios dinámicos

- [ ] Los dos JSON pueden cargarse con el mismo renderer.
- [ ] Cada tipo de pregunta tiene una representación visual.
- [ ] Las preguntas obligatorias se validan.
- [ ] Las ramas de titulados funcionan según el Mermaid.
- [ ] El flujo de empleadores funciona de forma lineal.
- [ ] El envío produce una estructura verificable.

### Fases 9 a 12: vistas, API y cierre

- [ ] Cada pantalla tiene una ruta propia.
- [ ] Cada pantalla tiene estados de carga, vacío y error.
- [ ] Las respuestas de API tienen DTOs o tipos equivalentes.
- [ ] Los filtros afectan los indicadores correspondientes.
- [ ] Las exportaciones muestran los datos del conjunto seleccionado.
- [ ] `npm run lint` termina correctamente.
- [ ] `npm run build` termina correctamente.
- [ ] No quedan rutas rotas ni imports de la implementación HTML.
