# Simulación de Recolección

Aplicación full-stack para simulación estadística y encuestas, compuesta por:

- Backend en Java 21 con Spring Boot 3
- Frontend en React + Vite + TypeScript
- Base de datos PostgreSQL en Docker

## Requisitos

Antes de iniciar, asegúrate de tener instalado:

- Docker Desktop o Docker Engine con soporte para Docker Compose v2
- Java 21 LTS
- Node.js 22.x (recomendado: 22.19.0, que es la versión configurada en el proyecto)
- npm 10.x (compatible con Node 22)
- Maven Wrapper incluido en el repositorio (`./mvnw` o `./mvnw.cmd`), por lo que no necesitas instalar Maven globalmente

### Nota para usuarios con `nvm`

Si usas `nvm` para administrar versiones, puedes dejar el proyecto en la versión correcta con:

```bash
nvm install 22.19.0
nvm use 22.19.0
```

Para Java, si también usas un gestor de versiones, asegúrate de dejar el entorno apuntando a Java 21 antes de ejecutar la app.

### Versiones esperadas por el proyecto

- Java: 21
- Spring Boot: 3.5.6
- Node: 22.19.0
- npm: 10.9.3
- PostgreSQL: 17.6-alpine (definido en Docker)

## Estructura principal

- `docker-compose.yml`: configuración de PostgreSQL
- `pom.xml`: configuración de Spring Boot y el perfil `frontend`
- `frontend/`: aplicación React
- `src/main/resources/`: configuración del backend

## Iniciar la base de datos

Desde la raíz del proyecto:

```bash
docker compose up -d postgres
```

Esto levanta PostgreSQL en el puerto `5433` con la base `simulacionem`.

## Iniciar el backend

En PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

En Bash / Git Bash:

```bash
./mvnw spring-boot:run
```

El backend queda disponible en:

- http://localhost:8081

## Iniciar el frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en:

- http://localhost:5173

## Arranque recomendado

Abrir tres terminales separadas:

```bash
# Terminal 1
docker compose up -d postgres

# Terminal 2
.\mvnw.cmd spring-boot:run

# Terminal 3
cd frontend
npm install
npm run dev
```

## Construir la aplicación completa

Para empaquetar el backend y copiar el build del frontend al artefacto final:

```bash
.\mvnw.cmd clean package -Pfrontend
```

Esto genera el JAR del backend en `target/` y toma el contenido de `frontend/dist`.

## Variables y configuración

La conexión a PostgreSQL usa estas credenciales por defecto:

- Host: `localhost`
- Puerto: `5433`
- Base de datos: `simulacionem`
- Usuario: `simulacionem_dev`
- Contraseña: `dev_password_2026`

La configuración de desarrollo está en:

- `src/main/resources/application-dev.yml`

## Deteener servicios

```bash
docker compose down
```

Si además quieres limpiar los volúmenes de PostgreSQL:

```bash
docker compose down -v
```

## Troubleshooting

- Si el backend falla al conectar a PostgreSQL, revisa que el contenedor esté levantado con `docker compose ps`.
- Si el frontend no inicia, asegúrate de haber ejecutado `npm install` dentro de `frontend/`.
- Si no quieres recompilar el frontend cada vez, el proyecto está preparado para ejecutarlo solo en perfil `frontend` cuando se genera el paquete final.

