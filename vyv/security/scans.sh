#!/usr/bin/env bash
# Análisis de seguridad automáticos del plan (ítem 12 · OWASP Top 10:2025). Cada herramienta corre en Docker
# con la versión fijada; nada se instala en el equipo. Salida: vyv/evidence/security/.
#
# Uso: ./vyv/security/scans.sh [sast|sca|secretos|dast|audit|all]   (sin argumento: all)
#   sast      Semgrep (p/owasp-top-ten, p/typescript, p/nodejsscan) sobre el código de los 4 módulos
#   sca       pnpm audit --prod y Trivy sobre la imagen de n8n bajo prueba
#   secretos  gitleaks sobre los commits del equipo (01bd57cdd..HEAD) y sobre vyv/
#   dast      OWASP ZAP baseline (pasivo) contra la instancia local; solo acepta localhost
#   audit     auditoría integrada de n8n (`n8n audit`) en el contenedor de la instancia
# Variables: N8N_URL (http://localhost:5678), N8N_IMAGE (n8nio/n8n:2.47.0), N8N_CONTAINER (vyv-n8n).
set -uo pipefail
VYV="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(dirname "$VYV")"
OUT="$VYV/evidence/security"
mkdir -p "$OUT"
N8N_URL="${N8N_URL:-http://localhost:5678}"
N8N_IMAGE="${N8N_IMAGE:-n8nio/n8n:2.47.0}"
N8N_CONTAINER="${N8N_CONTAINER:-vyv-n8n}"
export MSYS_NO_PATHCONV=1 # Git Bash en Windows: no reescribir las rutas de los contenedores
win() { (cd "$1" && pwd -W 2>/dev/null || pwd); }

sast() {
	docker run --rm -v "$(win "$ROOT")":/src -w /src semgrep/semgrep:1.140.0 semgrep scan --metrics=off \
		--config p/owasp-top-ten --config p/typescript --config p/nodejsscan \
		--sarif-output=vyv/evidence/security/semgrep.sarif --json-output=vyv/evidence/security/semgrep.json \
		packages/cli/src/workflows packages/cli/src/webhooks packages/cli/src/executions packages/cli/src/credentials \
		packages/cli/src/controllers/oauth packages/modules/data-table/backend/src \
		packages/frontend/editor-ui/src/features/workflows packages/frontend/editor-ui/src/features/execution \
		packages/frontend/editor-ui/src/features/credentials packages/frontend/editor-ui/src/features/core \
		> "$OUT/semgrep.log" 2>&1
	echo "semgrep: $(grep -o '"check_id"' "$OUT/semgrep.json" | wc -l) hallazgos (semgrep.json, semgrep.sarif)"
}

sca() {
	(cd "$ROOT" && pnpm audit --prod --json > "$OUT/pnpm-audit.json")
	docker run --rm -v //var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.67.2 image --quiet \
		--severity HIGH,CRITICAL --format json "$N8N_IMAGE" > "$OUT/trivy-image.json"
	echo "pnpm audit y trivy: pnpm-audit.json, trivy-image.json"
}

secretos() {
	# Solo los commits del equipo: el historial completo de n8n es demasiado grande y no es del alcance.
	docker run --rm -v "$(win "$ROOT")":/repo zricethezav/gitleaks:v8.28.0 git /repo \
		--log-opts="01bd57cdd..HEAD" --redact --report-format json --report-path /repo/vyv/evidence/security/gitleaks-commits.json > "$OUT/gitleaks.log" 2>&1
	docker run --rm -v "$(win "$ROOT")":/repo zricethezav/gitleaks:v8.28.0 dir /repo/vyv \
		--redact --report-format json --report-path /repo/vyv/evidence/security/gitleaks-vyv.json >> "$OUT/gitleaks.log" 2>&1
	echo "gitleaks: $(grep -c '"RuleID"' "$OUT/gitleaks-commits.json") en commits, $(grep -c '"RuleID"' "$OUT/gitleaks-vyv.json") en vyv/"
}

dast() {
	# Solo la instancia propia del equipo: nunca un sistema de terceros.
	case "$N8N_URL" in http://localhost:*|http://127.0.0.1:*) ;; *) echo "dast: N8N_URL debe ser localhost" >&2; return 2 ;; esac
	local objetivo="${N8N_URL/localhost/host.docker.internal}"
	objetivo="${objetivo/127.0.0.1/host.docker.internal}"
	local red=()
	# Linux: host.docker.internal no existe y n8n escucha solo en 127.0.0.1; ZAP usa la red del host.
	if [ "$(uname -s)" = Linux ]; then objetivo="$N8N_URL"; red=(--network host -u 0); fi
	docker run --rm "${red[@]}" -v "$(win "$OUT")":/zap/wrk zaproxy/zap-stable:2.16.1 zap-baseline.py -t "$objetivo" -I \
		-J zap-baseline.json -r zap-baseline.html > "$OUT/zap-baseline.log" 2>&1
	tail -n 3 "$OUT/zap-baseline.log"
}

audit() {
	docker exec "$N8N_CONTAINER" n8n audit > "$OUT/n8n-audit.json"
	echo "n8n audit: n8n-audit.json"
}

case "${1:-all}" in
	sast) sast ;; sca) sca ;; secretos) secretos ;; dast) dast ;; audit) audit ;;
	all) sast; sca; secretos; dast; audit ;;
	*) sed -n '4,11p' "$0" >&2; exit 2 ;;
esac
