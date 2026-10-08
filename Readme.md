# Simulación de Recolección

Aplicación web para consultar y gestionar la simulación de recolección, con backend en Spring Boot y frontend en React + Vite.

## Arquitectura

- **Backend:** Spring Boot 3.5, Java 21 y PostgreSQL.
- **Frontend:** React, TypeScript y Vite.
- **Base de datos:** PostgreSQL 17.6 ejecutado con Docker Compose.

## Requisitos

Antes de iniciar debes instalar:

- Docker Desktop o Docker Engine con Compose.
- Java 21 LTS.
- Node.js 22 y npm 10.
- PowerShell 7 o PowerShell 5.1 en Windows.

Comprueba las herramientas disponibles:

```powershell
java -version
node -v
npm -v
docker --version
docker compose version
```

## Iniciar la aplicación en Windows

Ejecuta el siguiente comando desde la raíz del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

El script levanta automáticamente:

1. PostgreSQL mediante Docker Compose.
2. El backend Spring Boot.
3. El frontend React con Vite.

La aplicación queda disponible en:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8081
- PostgreSQL: localhost:5433

> Mantén abiertas las ventanas PowerShell iniciadas por el script. El proceso puede permanecer activo mientras la aplicación funciona.

## Iniciar cada servicio por separado

### 1. Base de datos

```powershell
docker compose up -d
```

### 2. Backend

```powershell
.\mvnw.cmd spring-boot:run -DskipFrontend
```

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Comandos útiles

### Construir el frontend

```powershell
cd frontend
npm run build
```

### Validar el frontend

```powershell
cd frontend
npm run lint
```

### Executar pruebas del backend

```powershell
.\mvnw.cmd test
```

## Detener la aplicación

Para detener la base de datos y los servicios activos, usa:

```powershell
docker compose down
```

Si iniciaste la aplicación con `start-dev.ps1`, también puedes cerrar las ventanas PowerShell que levantó el script.

## Problemas frecuentes

### El backend no puede conectarse a PostgreSQL

Verifica que Docker esté ejecutándose y que la base de datos haya terminado de iniciarse:

```powershell
docker compose ps
docker compose logs postgres
```

### El frontend no se abre

Ejecuta:

```powershell
cd frontend
npm install
npm run dev
```

### Java o Node.js no se reconoce

Añade Java 21 y Node.js 22 al `PATH` y reinicia la terminal. Puedes comprobar la configuración con:

```powershell
$env:Path
```

## Scripts disponibles

- [start-dev.ps1](start-dev.ps1): inicia la aplicación en Windows.
- [start-dev.sh](start-dev.sh): inicia la aplicación en Linux y macOS.
- [docker-compose.yml](docker-compose.yml): configura PostgreSQL.
- [frontend/package.json](frontend/package.json): contiene los comandos del frontend.
