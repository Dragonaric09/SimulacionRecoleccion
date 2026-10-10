# Cambios de `front` respecto a `main`

Documento elaborado a partir de la comparación `main...front`, estando actualmente en la rama `front`.

## Resumen ejecutivo

La rama `front` transforma el prototipo inicial en una aplicación de análisis de encuestas con persistencia de datasets, importación de archivos CSV, endpoints de analítica y una interfaz React organizada por funcionalidades.

En términos generales, `main` contenía la base del proyecto Spring Boot/React y el prototipo de prueba de chi-cuadrado. `front` incorpora el flujo completo de carga y validación de encuestas, almacenamiento en PostgreSQL, consultas estadísticas para titulados y empleadores, visualizaciones, exportaciones e impresión de informes.

La comparación registra **129 archivos modificados o agregados**, aproximadamente **15.132 líneas agregadas** y **99 eliminadas**. La mayor parte del cambio corresponde a funcionalidades nuevas.

## Cambios principales frente a `main`

### Backend

- Se incorporó un módulo de importación de datasets en `encuesta`.
- Se agregó soporte para archivos CSV de encuestas de titulados y empleadores.
- Se implementó detección del tipo de encuesta y mapeo de columnas mediante:
  - `SurveyTypeDetector`.
  - `SurveyFieldMapperFactory`.
  - `TituladosFieldMapper`.
  - `EmpleadoresFieldMapper`.
  - Clases auxiliares para mapeos simples y grids.
- Se añadió validación previa e importación persistente, con reporte de filas válidas, rechazadas, advertencias y errores.
- Se agregaron entidades JPA, repositorios y migraciones Flyway para administrar datasets, respuestas, competencias y problemas de importación.
- Se creó un módulo de analítica con estadísticas descriptivas, perfiles laborales, cruces y simulación de escenarios.
- Se ajustó `application-dev.yml` para utilizar `ddl-auto: validate`; el esquema pasa a estar controlado por Flyway.
- Se agregaron las dependencias `flyway-core`, `flyway-database-postgresql` y `commons-csv` en `pom.xml`.

### Frontend

- `App.tsx` deja de mostrar solamente el estado de la API y la demo de chi-cuadrado; ahora monta un router y un layout general.
- Se agregó una navegación lateral por secciones:
  - Datos.
  - Titulados.
  - Empleadores.
- Se creó un contexto global de datasets para seleccionar el dataset activo por dominio y conservar la selección en `localStorage`.
- Se incorporó una pantalla de carga, validación, importación, renombrado y eliminación de datasets.
- Se agregaron páginas de analítica para titulados:
  - Resumen general.
  - Perfil de empleabilidad.
  - Formación continua.
  - Financiamiento.
  - Brechas de competencias.
  - Cruces y exportación.
  - Simulación de escenarios.
- Se agregaron páginas de analítica para empleadores:
  - Resumen de contratación.
  - Valoración de la carrera.
  - Brechas de competencias.
  - Cruces y exportación.
- Se añadieron gráficos, tarjetas KPI, tablas, radar de competencias, barras de distribución, paneles de satisfacción y controles de filtros.
- Se implementaron exportaciones a CSV, Excel e imagen en las vistas de cruces y simulación.
- Se añadieron estilos de impresión para generar informes en formato A4 horizontal.
- Se amplió la biblioteca de componentes UI basada en Radix/shadcn.

### Documentación y datos de referencia

- `form/` contiene exportaciones JSON de los formularios de titulados y empleadores, además de diagramas Mermaid de sus flujos.
- La carpeta privada `/data` no forma parte del material compartido ni debe incluir respuestas reales en Git.
- `UI/` contiene una maqueta navegable en archivos HTML independientes, que se puede recorrer al abrir cualquiera de ellos en un navegador. Es solo una referencia visual: el frontend actual difiere en algunos aspectos y la documentación incluida en `UI/` está desactualizada.
- Se actualizaron las dependencias del frontend y se agregó `frontend/package-lock.json` con el árbol de dependencias de la rama.

## Cambio de arquitectura

### Situación de `main`

La base original tenía una arquitectura Spring Boot con separación inicial para analítica y una interfaz React/Vite todavía orientada al prototipo. La analítica principal visible era la demostración de chi-cuadrado.

### Arquitectura actual en `front`

La aplicación queda organizada como un monolito modular:

```text
React/Vite
    │
    │ HTTP /api
    ▼
Spring Boot REST
    ├── encuesta
    │   ├── importación y validación CSV
    │   ├── DTOs
    │   ├── entidades y repositorios
    │   └── DatasetController
    │
    ├── analitica
    │   ├── AnalyticsService
    │   ├── DTOs estadísticos
    │   └── AnalyticsController
    │
    └── shared
        ├── health check
        └── forwarding de la SPA
            │
            ▼
        PostgreSQL + Flyway
```

El backend sigue una separación por módulos y responsabilidades:

- `application`: servicios de aplicación, DTOs y lógica de casos de uso.
- `presentation/rest`: controladores HTTP.
- `infrastructure/persistence`: entidades JPA y repositorios.
- `domain`: modelos y servicios que ya existían para la prueba de chi-cuadrado.
- `shared`: componentes comunes de la aplicación web.

No se trata todavía de una arquitectura hexagonal completamente desarrollada: dentro de `application`, por ejemplo, algunos servicios de analítica acceden directamente a repositorios JPA. Sin embargo, la estructura deja separados los módulos funcionales y las responsabilidades principales.

## Estructura relevante de archivos

### Backend

```text
src/main/java/com/simulacionem/              # Código fuente principal del backend.
├── analitica/                               # Consultas, cálculos y endpoints analíticos.
│   ├── application/                         # Casos de aplicación y contratos de salida.
│   │   ├── dto/                             # Objetos que representan respuestas de analítica.
│   │   └── service/                         # Servicios para estadísticas y filtros.
│   ├── domain/                              # Modelo y lógica de dominio de analítica.
│   ├── infrastructure/                     # Adaptadores técnicos de analítica.
│   └── presentation/rest/                  # Exposición HTTP del módulo.
│       └── AnalyticsController.java         # Endpoints de resúmenes, cruces y simulación.
│
├── encuesta/                               # Importación y administración de encuestas.
│   ├── application/                         # Lógica de importación y reportes.
│   │   ├── dto/                             # Reportes, advertencias y errores de importación.
│   │   └── service/                         # Lectura CSV, detección y mapeo de campos.
│   ├── domain/                              # Espacio reservado para reglas propias de encuesta.
│   ├── infrastructure/persistence/          # Persistencia de datasets y respuestas.
│   │   ├── entity/                           # Entidades JPA asociadas a las tablas SQL.
│   │   └── repository/                       # Repositorios Spring Data para consultar la BD.
│   └── presentation/rest/                  # Endpoints de carga y gestión de datasets.
│       └── DatasetController.java           # Valida, importa, lista, renombra y elimina datasets.
│
└── shared/                                  # Componentes compartidos por toda la aplicación.
    └── infrastructure/web/                 # Configuración y controladores web comunes.
        ├── HealthController.java            # Endpoint para comprobar el estado del backend.
        └── SpaForwardController.java        # Redirige rutas del frontend hacia la SPA.
```

### Frontend

```text
frontend/src/                               # Código fuente de la interfaz React.
├── app/                                     # Layout, navegación, rutas y estado global.
│   ├── AppLayout.tsx                         # Estructura visual general con menú y encabezado.
│   ├── DatasetContext.tsx                    # Dataset activo por dominio y persistencia local.
│   ├── navigation.ts                         # Definición de secciones, rutas y etiquetas.
│   └── router.tsx                            # Router ligero basado en la URL del navegador.
├── components/                              # Componentes reutilizables de la interfaz.
│   ├── analytics/                            # KPIs, filtros, estados, exportación e impresión.
│   └── ui/                                   # Botones, tarjetas, tablas y controles base.
├── features/                                # Funcionalidades organizadas por módulo de negocio.
│   ├── encuesta/                             # Pantalla y API para cargar y validar CSV.
│   ├── titulados/                            # Rutas y contenedores de vistas de titulados.
│   ├── empleadores/                          # Rutas y contenedores de vistas de empleadores.
│   └── analitica/                            # Páginas, gráficos y lógica de análisis.
│       ├── competence/                       # Brechas, radar y matriz de competencias.
│       ├── cross/                            # Cruces, tablas, gráficos y exportaciones.
│       ├── education/                        # Formación continua y posgrado.
│       ├── employment/                       # Empleabilidad, desempleo y primer empleo.
│       ├── financing/                        # Indicadores y cruces de financiamiento.
│       ├── shared/                           # Tipos, formatos y componentes analíticos comunes.
│       └── simulation/                       # Escenarios, simulación y descargas.
├── api/                                     # Cliente HTTP común para las rutas `/api`.
├── lib/                                     # Utilidades generales del frontend.
└── index.css                                # Tokens visuales, estilos globales y estilos de impresión.
```

La organización del frontend es principalmente feature-based: cada área de negocio contiene sus páginas y lógica específica, mientras que `components/analytics`, `components/ui` y `features/analitica/shared` concentran piezas reutilizables.

### Herramientas auxiliares

```text
tools/                                      # Scripts y archivos auxiliares para pruebas locales.
└── generadores_csv_random/                 # Genera datasets CSV sintéticos para validar importación.
    ├── generar_csv_random.py               # Script de generación de CSV de titulados y empleadores.
    ├── README.md                           # Instrucciones de uso del generador.
    └── salida/                             # Archivos CSV generados para pruebas.
        ├── empleadores_random_6.csv       # Dataset sintético de empleadores.
        └── titulados_random_12.csv        # Dataset sintético de titulados.
```

La carpeta `/tools` se mantiene versionable porque sus scripts ayudan a reproducir pruebas de importación sin utilizar datos personales. Los CSV dentro de `tools/generadores_csv_random/salida/` son datos sintéticos y no representan respuestas reales.

## API agregada en `front`

### Gestión de datasets: `/api/datasets`

- `POST /validate`: valida un CSV sin persistirlo como dataset final.
- `POST /import`: importa y persiste un CSV.
- `GET /`: lista los datasets cargados.
- `GET /{id}`: consulta el resumen de un dataset.
- `GET /{id}/quality`: consulta métricas de calidad.
- `GET /{id}/issues`: obtiene los problemas de importación.
- `PATCH /{id}/name`: cambia el nombre visible del dataset.
- `DELETE /{id}`: elimina un dataset.

### Analítica: `/api/analytics`

Se agregaron endpoints para:

- Resumen de titulados.
- Empleabilidad, desempleo, primer empleo y emprendimiento.
- Perfil laboral.
- Formación continua.
- Satisfacción y currículo.
- Financiamiento.
- Resumen y valoración de empleadores.
- Brechas de competencias.
- Cruces de variables.
- Simulación multinomial.

Los endpoints aceptan, según la operación, el `datasetId`, rangos de año, estado laboral, sector y campos analíticos. Las respuestas entregan distribuciones categóricas, porcentajes, promedios, medianas, desviación estándar, cantidad de respuestas y una marca para muestras pequeñas.

## Persistencia y modelo de datos

Las migraciones de `front` están en `src/main/resources/db/migration`:

- `V1__create_dataset_import_schema.sql`: crea el esquema base de importación.
- `V2__align_dataset_hash_type.sql`: alinea el tipo utilizado para el hash del archivo.
- `V3__add_dataset_display_name.sql`: agrega el nombre visible del dataset.

### Cómo arrancar desde `main` usando la rama `front`

Esta es la secuencia recomendada para un integrante que se quedó en `main` y necesita ejecutar la versión actual con la base de datos y las migraciones de `front`.

#### 1. Guardar el trabajo local

Antes de cambiar de rama, revisar si hay cambios sin confirmar:

```powershell
git status
```

Si existen cambios propios, guardarlos en un commit o usar temporalmente `git stash`. No conviene cambiar de rama sobrescribiendo trabajo local.

#### 2. Obtener y cambiar a `front`

Si la rama ya existe localmente:

```powershell
git switch front
git pull
```

Si todavía no existe localmente:

```powershell
git fetch origin
git switch --track origin/front
```

La rama debe contener `pom.xml`, las migraciones Flyway, la configuración de PostgreSQL y el código del backend/frontend actualizado.

#### 3. Levantar PostgreSQL

Desde la raíz del repositorio:

```powershell
docker compose up -d
docker compose ps
```

La configuración de desarrollo utiliza por defecto:

| Parámetro | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5433` |
| Base de datos | `simulacionem` |
| Usuario | `simulacionem_dev` |
| Contraseña | `dev_password_2026` |

#### 4. Aplicar automáticamente las migraciones

Iniciar el backend con:

```powershell
.\mvnw.cmd spring-boot:run -DskipFrontend
```

Al arrancar Spring Boot, Flyway ejecuta en orden las migraciones que todavía no estén registradas:

- `V1__create_dataset_import_schema.sql`.
- `V2__align_dataset_hash_type.sql`.
- `V3__add_dataset_display_name.sql`.

No se deben ejecutar manualmente los `CREATE TABLE`, crear otra base con nombres diferentes ni copiar un esquema desde otro equipo. Hibernate está configurado con `ddl-auto: validate`: verifica que el esquema coincida con las entidades, pero no crea ni modifica tablas.

#### 5. Verificar que la migración terminó

En otra terminal:

```powershell
docker compose exec postgres psql -U simulacionem_dev -d simulacionem -c "select installed_rank, version, description, success from flyway_schema_history order by installed_rank;"
```

La salida debe mostrar `V1`, `V2` y `V3` con `success = t`. Si el backend inicia sin error y la tabla `flyway_schema_history` registra esas versiones, la base está alineada con `front`.

#### 6. Instalar y arrancar el frontend

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

La interfaz queda disponible normalmente en `http://localhost:5173` y el backend en `http://localhost:8081`.

Para levantar todo con el script de desarrollo de Windows, después de cambiar a `front`, también se puede ejecutar desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

#### Si ya existe una base local

No se debe borrar el volumen ni editar `flyway_schema_history` para “forzar” la migración. Si `V1`, `V2` y `V3` ya aparecen como exitosas, Flyway no las repite. Si falta una versión, Flyway la aplicará al iniciar el backend.

Si la base fue creada manualmente o pertenece a una versión anterior sin historial Flyway, primero se debe hacer un respaldo y revisar las diferencias del esquema. En ese caso `ddl-auto: validate` no corrige automáticamente la base.

Las tablas principales son:

- `dataset_import`: archivo importado, tipo de encuesta, periodo, estado y contadores.
- `dataset_column_mapping`: relación entre columnas originales y claves internas.
- `survey_response`: respuesta común de cualquier encuesta.
- `titled_response`: datos normalizados de titulados.
- `employer_response`: datos normalizados de empleadores.
- `competence_catalog` y `competence_rating`: catálogo y valoraciones de competencias.
- `import_issue`: advertencias y errores por fila o columna.

El esquema conserva el payload original y un payload normalizado en JSONB, a la vez que mantiene columnas normalizadas para los campos principales de consulta. También se registra el SHA-256 del archivo para detectar duplicados y se aplican restricciones de integridad mediante PostgreSQL.

## Funcionalidad disponible hasta ahora

El flujo previsto actualmente es:

1. El usuario carga un CSV desde `Cargar datos`.
2. El backend detecta si corresponde a titulados o empleadores.
3. Se validan encabezados, valores, tipos y filas.
4. La interfaz muestra advertencias, errores y métricas de calidad.
5. El usuario importa el dataset y este queda disponible en PostgreSQL.
6. El dataset se selecciona globalmente para cada dominio.
7. Las pantallas de analítica consultan el backend aplicando filtros.
8. Los resultados se muestran como KPIs, distribuciones, tablas y gráficos.
9. Los cruces y escenarios pueden exportarse, y los informes pueden imprimirse.

## Pruebas agregadas

La rama incorpora pruebas para:

- Estadísticas del servicio de analítica.
- Exclusión de valores nulos y valores “no observado”.
- Normalización de rangos de edad y etiquetas de posgrado.
- Validación e importación de los CSV reales.
- Rechazo de extensiones que no sean CSV.
- Persistencia de un dataset y sus respuestas.

## Consideraciones del estado actual

- `front` ya tiene una superficie funcional amplia, pero algunas páginas pueden actuar como contenedores compartidos o depender de datos previamente importados para mostrar resultados.
- El router es una implementación ligera basada en `history.pushState` y `popstate`, no una dependencia de React Router.
- La navegación y el layout están centralizados en `app/`; la lógica de negocio visual se mantiene en `features/`.
- El backend se sirve junto con el frontend compilado mediante el perfil Maven de frontend; durante el desarrollo también se pueden ejecutar frontend y backend por separado.
- El esquema de base de datos debe estar disponible para que la importación y las vistas analíticas funcionen con datos reales.

## Comandos de referencia

Desde la raíz:

```powershell
docker compose up -d
.\mvnw.cmd spring-boot:run -DskipFrontend
```

Para el frontend en desarrollo:

```powershell
cd frontend
npm install
npm run dev
```

Validaciones disponibles:

```powershell
cd frontend
npm run build
npm run lint

cd ..
.\mvnw.cmd test
```

El comando `mvnw` ejecuta Flyway durante el arranque de Spring Boot; no existe un paso separado de migración requerido para el flujo normal de desarrollo.
