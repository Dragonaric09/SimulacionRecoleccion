#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Levantando base de datos..."
docker compose up -d

echo "==> Iniciando backend Spring Boot..."
( cd "$ROOT" && ./mvnw spring-boot:run -DskipFrontend ) &

sleep 5

echo "==> Iniciando frontend Vite..."
( cd "$ROOT/frontend" && npm install && npm run dev ) &

echo ""
echo "Backend: http://localhost:8081"
echo "Frontend: http://localhost:5173"
echo "Base de datos: PostgreSQL en localhost:5433"
