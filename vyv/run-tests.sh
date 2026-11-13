#!/usr/bin/env bash
# Runs the n8n-VyV test plan (modules 1–4) from vyv/.
#
# Usage: ./vyv/run-tests.sh [units|backend|e2e|all] [Vitest arguments for units]
#   units    editor unit suite (vyv/units) with coverage, e.g. `units CO-05`
#   backend  backend unit tests *.vyv.test.ts of data tables and folders
#   e2e      Cypress suite (vyv/e2e); needs n8n on http://localhost:5678
#   all      the three parts in sequence
# Without an argument it runs units and backend, which do not need a running n8n.
set -euo pipefail
VYV="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$VYV")"

units() {
	# The unit test files live outside editor-ui; this link lets them resolve its packages.
	ln -sfn ../packages/frontend/editor-ui/node_modules "$VYV/node_modules"
	cd "$ROOT/packages/frontend/editor-ui"
	# WorkflowSettings.test.ts (reused) runs out of the default heap; 8 GB is enough.
	NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192" \
		pnpm exec vitest run --config ../../../vyv/vitest.config.mts --coverage.enabled --maxWorkers=2 "$@"
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
	cd "$VYV/e2e"
	[ -d node_modules ] || npm install
	# Merge the report also when a test fails.
	local status=0
	npm run test:all || status=$?
	npm run report
	return "$status"
}

part="${1:-}"
[ $# -gt 0 ] && shift
case "$part" in
	units) units "$@" ;;
	backend) backend ;;
	e2e) e2e ;;
	all) (units) && (backend) && e2e ;;
	'') (units) && backend ;;
	*) sed -n '4,9p' "$0" >&2; exit 2 ;;
esac
