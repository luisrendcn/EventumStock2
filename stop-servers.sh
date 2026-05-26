#!/usr/bin/env bash
# stop-servers.sh — Detiene backend y PWA iniciados por setup-hotspot.sh
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; N='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stop_pid_file() {
  local label="$1" pidfile="$2"
  if [[ -f "$pidfile" ]]; then
    local pid; pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && printf "${G}  ✓${N} %s detenido (PID %s)\n" "$label" "$pid"
    else
      printf "${Y}  ⚠${N}  %s ya estaba detenido\n" "$label"
    fi
    rm -f "$pidfile"
  else
    printf "${Y}  ⚠${N}  No se encontró PID de %s\n" "$label"
  fi
}

printf "\n${G}Deteniendo servidores SGI...${N}\n"
stop_pid_file "Backend" "$ROOT/logs/backend.pid"
stop_pid_file "PWA"     "$ROOT/logs/pwa.pid"

# Por si acaso quedaron procesos huérfanos
pkill -f "ts-node.*src/main" 2>/dev/null && printf "${G}  ✓${N} ts-node eliminado\n" || true
pkill -f "vite"              2>/dev/null && printf "${G}  ✓${N} vite eliminado\n"    || true

printf "\n${G}Servidores detenidos.${N}\n\n"
