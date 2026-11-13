#!/usr/bin/env bash
# Runs the QA suite. Pass extra Vitest flags, e.g. `--coverage.enabled`.
set -euo pipefail
cd "$(dirname "$0")/.."
# The QA test files live outside editor-ui; this link lets them resolve its packages.
ln -sfn ../packages/frontend/editor-ui/node_modules qa/node_modules
cd packages/frontend/editor-ui
# WorkflowSettings.test.ts (reused) runs out of the default heap; 8 GB is enough.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"
exec pnpm exec vitest run --config ../../../qa/vitest.config.mts "$@"
