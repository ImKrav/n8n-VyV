#!/usr/bin/env bash
# Runs the unit suite of the plan. Pass extra Vitest flags, e.g. `--coverage.enabled`.
set -euo pipefail
cd "$(dirname "$0")"
# The test files live outside editor-ui; this link lets them resolve its packages.
ln -sfn ../../packages/frontend/editor-ui/node_modules node_modules
cd ../../packages/frontend/editor-ui
# WorkflowSettings.test.ts (reused) runs out of the default heap; 8 GB is enough.
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"
exec pnpm exec vitest run --config ../../../vyv/unitarias/vitest.config.mts "$@"
