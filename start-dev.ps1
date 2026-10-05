$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "==> Levantando base de datos..." -ForegroundColor Cyan
& docker compose up -d

Write-Host "==> Iniciando backend Spring Boot..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; .\mvnw.cmd spring-boot:run -DskipFrontend" -PassThru

Write-Host "==> Iniciando frontend Vite..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\frontend'; npm install; npm run dev" -PassThru

Write-Host "" 
Write-Host "Backend: http://localhost:8081" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Base de datos: PostgreSQL en localhost:5433" -ForegroundColor Green
Write-Host "" 
Write-Host "Proceso backend PID: $($backend.Id)" -ForegroundColor DarkGray
Write-Host "Proceso frontend PID: $($frontend.Id)" -ForegroundColor DarkGray
