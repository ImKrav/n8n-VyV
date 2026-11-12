#!/usr/bin/env bash
# Scan a directory with gitleaks. Mounted read-only; report goes to a temp dir. Findings are redacted.
set -euo pipefail
target=$(realpath "${1:?uso: gitleaks.sh <ruta>}")
tmp=$(mktemp -d)
trap 'rm -r "$tmp"' EXIT
chmod 777 "$tmp"
docker run --rm -v "$target:/scan:ro" -v "$tmp:/out" zricethezav/gitleaks:v8.30.0 \
	dir /scan --redact --report-path /out/gitleaks.json
