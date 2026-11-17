#!/usr/bin/env bash
# Runs the n8n-VyV test plan (modules 1–4) from vyv/.
#
# Usage: ./vyv/run-tests.sh [units|backend|e2e|api|security|ai|all] [arguments]
#   units    editor unit suite (vyv/units); no arguments: full run with coverage; `units CO-05` runs a subset
#   backend  backend unit tests *.vyv.test.ts of data tables and folders
#   e2e      Cypress suite (vyv/e2e); needs n8n on http://localhost:5678
#   api      Newman API collection (vyv/api); needs n8n on http://localhost:5678
#   security OWASP Top 10:2025 Cypress specs and the Docker scans (vyv/security); needs n8n in normal mode
#   ai       AI tools over the 4 modules: selenium | stagehand | deepeval | all (default); needs n8n on :5678
#            e.g. `ai selenium`, `ai stagehand core`, `ai deepeval`. LLM keys in each tool's .env
#   all      units, backend, e2e and api in sequence (ai and security are run on their own)
# Without an argument it runs units and backend, which do not need a running n8n.
set -euo pipefail
VYV="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$VYV")"
# Optional local configuration (Node path, owner credentials, dbPath, restartCommand…); not versioned.
if [ -f "$VYV/.env" ]; then set -a; . "$VYV/.env"; set +a; fi

units() {
	# The unit test files live outside editor-ui; this link lets them resolve its packages.
	ln -sfn ../packages/frontend/editor-ui/node_modules "$VYV/node_modules"
	cd "$ROOT/packages/frontend/editor-ui"
	# Without arguments, run the full suite with coverage; with arguments, pass only those to Vitest.
	[ $# -gt 0 ] || set -- --coverage.enabled --maxWorkers=2
	# WorkflowSettings.test.ts (reused) runs out of the default heap; 8 GB is enough.
	NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192" \
		pnpm exec vitest run --config ../../../vyv/vitest.config.mts "$@"
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

api() {
	cd "$VYV/e2e"
	[ -d node_modules ] || npm install
	npm run test:newman
}

security() {
	cd "$VYV/e2e"
	[ -d node_modules ] || npm install
	local status=0
	npm run test:security || status=$?
	"$VYV/security/scans.sh" || status=$?
	return "$status"
}

# AI tools (Selenium, Stagehand, DeepEval) over the four modules. Each one is independent: a missing
# API key or a stopped n8n skips that tool with a clear message instead of failing the whole run.
ai() {
	local tool="${1:-all}"
	[ $# -gt 0 ] && shift
	[ "$tool" = all ] && set --  # extra arguments only make sense for one specific tool
	local status=0
	if [ "$tool" = selenium ] || [ "$tool" = all ]; then
		(
			cd "$VYV/ai/selenium"
			[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; }
			.venv/bin/pytest "$@"
		) || status=$?
	fi
	if [ "$tool" = stagehand ] || [ "$tool" = all ]; then
		(
			cd "$VYV/ai/stagehand"
			[ -d node_modules ] || { npm install && npm run preparar; }
			node run.mjs "$@"
		) || status=$?
	fi
	if [ "$tool" = deepeval ] || [ "$tool" = all ]; then
		(
			cd "$VYV/ai/deepeval"
			[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt; }
			.venv/bin/pytest -q "$@"
		) || status=$?
	fi
	return "$status"
}

part="${1:-}"
[ $# -gt 0 ] && shift
case "$part" in
	units) units "$@" ;;
	backend) backend ;;
	e2e) e2e ;;
	api) api ;;
	security) security ;;
	ai) ai "$@" ;;
	all) (units) && (backend) && (e2e) && api ;;
	'') (units) && backend ;;
	*) sed -n '4,13p' "$0" >&2; exit 2 ;;
esac
