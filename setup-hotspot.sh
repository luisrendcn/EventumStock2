#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# setup-hotspot.sh — Adapta el proyecto SGI a la IP actual del Mac
#
# Uso:  ./setup-hotspot.sh
#       ./setup-hotspot.sh --only-config   (solo actualiza archivos, sin reiniciar)
#       ./setup-hotspot.sh --only-certs    (solo regenera certificados)
#
# Cambia de red en < 30 segundos: WiFi casa → Hotspot → WiFi universidad
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Colores ────────────────────────────────────────────────────────────────────
R='\033[0;31m'   # rojo
G='\033[0;32m'   # verde
Y='\033[1;33m'   # amarillo
B='\033[0;34m'   # azul
C='\033[0;36m'   # cyan
W='\033[1m'      # bold/white
N='\033[0m'      # reset

ok()   { printf "${G}  ✓${N} %s\n" "$*"; }
info() { printf "${B}  →${N} %s\n" "$*"; }
warn() { printf "${Y}  ⚠${N}  %s\n" "$*"; }
fail() { printf "${R}  ✗${N} %s\n" "$*"; }
step() { printf "\n${W}${C}━━━ %s ━━━${N} %s\n" "$1" "$2"; }

# ── Opciones ───────────────────────────────────────────────────────────────────
ONLY_CONFIG=false
ONLY_CERTS=false
for arg in "${@:-}"; do
  [[ "$arg" == "--only-config" ]] && ONLY_CONFIG=true
  [[ "$arg" == "--only-certs"  ]] && ONLY_CERTS=true
done

# ── Directorio raíz del proyecto (donde está este script) ─────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

printf "\n${W}${B}"
printf "╔══════════════════════════════════════════════════╗\n"
printf "║    SGI — Configuración automática de red         ║\n"
printf "╚══════════════════════════════════════════════════╝${N}\n"

# ═══════════════════════════════════════════════════════════════════════════════
step "1/5" "Detectar IP del Mac"
# ═══════════════════════════════════════════════════════════════════════════════
NEW_IP=""
IFACE_USED=""

# Orden de preferencia: en0 (WiFi), en1 (segundo adaptador), en2, bridge100 (hotspot compartido)
for iface in en0 en1 en2 bridge100; do
  candidate=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [[ -n "$candidate" && "$candidate" != "127.0.0.1" ]]; then
    NEW_IP="$candidate"
    IFACE_USED="$iface"
    break
  fi
done

if [[ -z "$NEW_IP" ]]; then
  fail "No se detectó IP en ninguna interfaz (en0, en1, en2, bridge100)"
  printf "\n  IPs disponibles en el sistema:\n"
  ifconfig 2>/dev/null | grep "inet " | grep -v "127\.0\.0\.1" | awk '{printf "    %s  (%s)\n", $2, "auto-detect"}' || true
  printf "\n  Puedes forzar la IP: NEW_IP=10.0.0.5 ./setup-hotspot.sh\n\n"
  exit 1
fi

ok "IP detectada: ${W}${NEW_IP}${N}  (interfaz: ${IFACE_USED})"

# ═══════════════════════════════════════════════════════════════════════════════
step "2/5" "Leer configuración actual"
# ═══════════════════════════════════════════════════════════════════════════════

# Extraer IP anterior del nombre del certificado en vite.config.ts
# Patrón: './X.X.X.X+2-key.pem'  →  extrae X.X.X.X
OLD_IP=$(grep -oE "'\./(([0-9]+\.){3}[0-9]+)\+[0-9]+-key\.pem'" pwa/vite.config.ts 2>/dev/null \
         | grep -oE '([0-9]+\.){3}[0-9]+' \
         | head -1 || true)

# Fallback: primera IP privada en el archivo
if [[ -z "$OLD_IP" ]]; then
  OLD_IP=$(grep -oE '(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01]))\.[0-9]+\.[0-9]+' \
             pwa/vite.config.ts 2>/dev/null | head -1 || true)
fi

if [[ -z "$OLD_IP" ]]; then
  warn "No se encontró IP previa — configuración inicial"
  OLD_IP=""
else
  info "IP anterior: ${OLD_IP}"
fi

# ¿Hubo cambio real?
if [[ "$NEW_IP" == "$OLD_IP" ]]; then
  printf "\n${Y}  La IP sigue siendo ${NEW_IP} (sin cambio de red).${N}\n"
  printf "  ¿Continuar igualmente (regenerar certs + reiniciar)? [s/N] "
  read -r resp </dev/tty
  if [[ "$resp" != "s" && "$resp" != "S" ]]; then
    info "Nada que hacer. Saliendo."
    exit 0
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
step "3/5" "Actualizar archivos de configuración"
# ═══════════════════════════════════════════════════════════════════════════════

# Usa perl -pi -e con \Q...\E para escapar los puntos del IP automáticamente.
# Es el reemplazo más robusto disponible en macOS sin dependencias extra.
replace_ip_in_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    warn "Archivo no encontrado: $file"
    return
  fi
  if grep -qF "$OLD_IP" "$file"; then
    perl -pi -e "s/\Q${OLD_IP}\E/${NEW_IP}/g" "$file"
    ok "$file"
  else
    info "$file — IP anterior no encontrada, sin cambios"
  fi
}

if [[ -n "$OLD_IP" ]] && ! $ONLY_CERTS; then
  # pwa/vite.config.ts: cert paths (./X.X.X.X+2*.pem) + proxy targets
  replace_ip_in_file "pwa/vite.config.ts"

  # src/interfaces/http/server.ts: CORS_ORIGINS (https://X.X.X.X:5173)
  replace_ip_in_file "src/interfaces/http/server.ts"

  # ecommerce — si llegara a tener la IP hardcodeada en el futuro
  [[ -f "ecommerce/vite.config.ts" ]] && replace_ip_in_file "ecommerce/vite.config.ts" || true

elif [[ -z "$OLD_IP" ]] && ! $ONLY_CERTS; then
  warn "Sin IP previa — los archivos no se modificaron"
  warn "Edita manualmente pwa/vite.config.ts y src/interfaces/http/server.ts"
  warn "con la IP ${NEW_IP} y vuelve a ejecutar el script"
fi

if $ONLY_CONFIG; then
  ok "Modo --only-config: omitiendo certificados y reinicio"
  printf "\n${G}Configuración actualizada. Reinicia los servidores manualmente.${N}\n\n"
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
step "4/5" "Regenerar certificado mkcert"
# ═══════════════════════════════════════════════════════════════════════════════

if ! command -v mkcert &>/dev/null; then
  fail "mkcert no está instalado"
  printf "  Instala con:  brew install mkcert && mkcert -install\n\n"
  exit 1
fi

# Verificar que la CA raíz esté instalada
if ! mkcert -CAROOT &>/dev/null; then
  warn "CA de mkcert no inicializada. Ejecutando mkcert -install..."
  mkcert -install 2>&1 | grep -v "^$" | sed 's/^/    /' || true
fi

cd "$ROOT/pwa"

# Eliminar certificados de la IP anterior
if [[ -n "$OLD_IP" && "$OLD_IP" != "$NEW_IP" ]]; then
  OLD_CERT_PATTERN="${OLD_IP}+*.pem"
  for f in ${OLD_CERT_PATTERN}; do
    [[ -e "$f" ]] && { rm -f "$f"; info "Eliminado: $f"; }
  done
fi

# Detectar cuántos SANs hay: mkcert nombra el archivo según el count adicional
# Con 3 entradas (IP localhost 127.0.0.1) → archivo: <IP>+2.pem
CERT_FILE="${NEW_IP}+2.pem"
KEY_FILE="${NEW_IP}+2-key.pem"

info "Ejecutando: mkcert ${NEW_IP} localhost 127.0.0.1"
if mkcert "${NEW_IP}" localhost 127.0.0.1 2>&1 | grep -v "^$" | sed 's/^/    /'; then
  if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
    ok "Certificado:  pwa/${CERT_FILE}"
    ok "Clave:        pwa/${KEY_FILE}"
  else
    warn "Los archivos de cert no tienen el nombre esperado"
    warn "mkcert generó: $(ls -1 ./*.pem 2>/dev/null | tr '\n' ' ')"
    warn "Actualiza manualmente pwa/vite.config.ts con los nombres reales"
  fi
else
  fail "mkcert falló. Prueba ejecutar: sudo mkcert -install"
  cd "$ROOT"
  exit 1
fi

cd "$ROOT"

if $ONLY_CERTS; then
  ok "Modo --only-certs: omitiendo reinicio de servidores"
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
step "5/5" "Reiniciar servidores"
# ═══════════════════════════════════════════════════════════════════════════════

# ── Detener procesos anteriores ──
info "Deteniendo servidores anteriores..."
pkill -f "ts-node.*src/main"  2>/dev/null && info "Backend (ts-node) detenido"  || true
pkill -f "vite"               2>/dev/null && info "Frontend (vite) detenido"    || true
sleep 1

# ── Docker: Postgres + Redis ──
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  PG_UP=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -c "sgi_postgres" || true)
  if [[ "$PG_UP" -eq 0 ]]; then
    printf "\n${Y}  Contenedores de base de datos no están corriendo.${N}\n"
    printf "  ¿Levantar sgi_postgres + sgi_redis con docker-compose? [S/n] "
    read -r dc_resp </dev/tty
    if [[ "$dc_resp" != "n" && "$dc_resp" != "N" ]]; then
      info "Levantando contenedores..."
      docker-compose up -d postgres redis 2>&1 | grep -E "Started|Running|Healthy|Error" | sed 's/^/    /' || true
      info "Esperando que Postgres esté listo (5s)..."
      sleep 5
    fi
  else
    ok "Docker: sgi_postgres + sgi_redis ya están corriendo"
  fi
else
  warn "Docker no disponible — asegúrate de que Postgres y Redis estén corriendo"
fi

# ── Iniciar backend ──
info "Iniciando backend en background..."
npm run dev >"$ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$ROOT/logs/backend.pid"
ok "Backend PID: ${BACKEND_PID}  →  logs/backend.log"

# ── Iniciar PWA ──
info "Iniciando PWA en background..."
(cd "$ROOT/pwa" && npm run dev) >"$ROOT/logs/pwa.log" 2>&1 &
PWA_PID=$!
echo "$PWA_PID" > "$ROOT/logs/pwa.pid"
ok "PWA     PID: ${PWA_PID}  →  logs/pwa.log"

# ── Verificar que arrancaron ──
info "Esperando que los servidores arranquen (10s)..."
sleep 10

BACKEND_OK=false
PWA_OK=false

if kill -0 "$BACKEND_PID" 2>/dev/null; then
  if curl -sf --max-time 2 "http://localhost:3001/health" &>/dev/null; then
    BACKEND_OK=true
  else
    warn "Backend proceso activo pero /health todavía no responde (espera unos segundos más)"
  fi
else
  fail "Backend no pudo iniciar — últimas líneas del log:"
  tail -8 "$ROOT/logs/backend.log" | sed 's/^/    /'
fi

if kill -0 "$PWA_PID" 2>/dev/null; then
  PWA_OK=true
else
  fail "PWA no pudo iniciar — últimas líneas del log:"
  tail -8 "$ROOT/logs/pwa.log" | sed 's/^/    /'
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Resumen final
# ═══════════════════════════════════════════════════════════════════════════════
printf "\n${W}${G}"
printf "╔══════════════════════════════════════════════════════════╗\n"
printf "║   ✓  SGI listo con IP: %-34s║\n" "${NEW_IP}  "
printf "╠══════════════════════════════════════════════════════════╣\n"
printf "║                                                          ║\n"
printf "║  📱 iPhone (cámara):                                     ║\n"
printf "║     https://%-44s║\n" "${NEW_IP}:5173  "
printf "║                                                          ║\n"
printf "║  🖥️  Desktop (SGI):                                       ║\n"
printf "║     https://localhost:5173                               ║\n"
printf "║                                                          ║\n"
printf "║  🔗 Backend API:  http://%s:3001            ║\n" "${NEW_IP}"
printf "║  🔌 WebSocket:    ws://%s:3001              ║\n" "${NEW_IP}"
printf "║                                                          ║\n"
printf "║  🛑 Detener:  ./stop-servers.sh                          ║\n"
printf "╚══════════════════════════════════════════════════════════╝${N}\n\n"

if [[ "$BACKEND_OK" == false || "$PWA_OK" == false ]]; then
  printf "${Y}  Algunos servidores pueden necesitar más tiempo para arrancar.${N}\n"
  printf "  Verifica: curl http://localhost:3001/health\n"
  printf "            tail -f logs/backend.log\n\n"
fi
