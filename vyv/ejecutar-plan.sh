#!/usr/bin/env bash
# Ejecuta el plan de pruebas de n8n-VyV (módulos 1–4) desde vyv/.
#
# Uso: ./vyv/ejecutar-plan.sh [unitarias|backend|e2e|todo]
#   unitarias  suite unitaria del editor (vyv/unitarias), con cobertura
#   backend    pruebas unitarias *.vyv.test.ts de data tables y carpetas
#   e2e        suite Cypress de data tables y carpetas (necesita n8n en :5678)
#   todo       las tres en orden
# Sin argumento ejecuta unitarias y backend, que no necesitan un n8n en marcha.
set -euo pipefail
VYV="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$VYV")"

unitarias() {
	"$VYV/unitarias/run-tests.sh" --coverage.enabled --maxWorkers=2
}

backend() {
	cd "$ROOT"
	pnpm --filter @n8n/backend-module-data-table exec vitest run vyv
	pnpm --filter @n8n/api-types exec vitest run folder-name.schema.vyv
	N8N_LOG_LEVEL=silent DB_TYPE=sqlite pnpm --filter n8n exec vitest run folder.service.vyv
}

e2e() {
	if [ -z "${CYPRESS_ownerEmail:-}" ] || [ -z "${CYPRESS_ownerPassword:-}" ]; then
		echo "Defina CYPRESS_ownerEmail y CYPRESS_ownerPassword (propietario de n8n en http://localhost:5678)." >&2
		exit 1
	fi
	cd "$VYV/datatables-carpetas"
	[ -d node_modules ] || npm install
	# El reporte se genera también si alguna prueba falla.
	local status=0
	npm run test:todo || status=$?
	npm run reporte
	return "$status"
}

case "${1:-}" in
	unitarias) unitarias ;;
	backend) backend ;;
	e2e) e2e ;;
	todo) unitarias && backend && e2e ;;
	'') unitarias && backend ;;
	*) sed -n '4,9p' "$0" >&2; exit 2 ;;
esac
