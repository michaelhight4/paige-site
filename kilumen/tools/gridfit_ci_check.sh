#!/usr/bin/env bash
# Local mirror of .github/workflows/kilumen-asset-grid-fit.yml (run from the repo root or kilumen/).
# NOTE: `grid_fit_and_swap.py --check .` alone is NOT what CI runs: CI adds --overworld and also runs grid_fit_world.py + the reach test.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/furniture/grid_fit_and_swap.py . --check --overworld --report /tmp/grid_fit_report.md
python3 tools/gridfit_world/grid_fit_world.py . --check --report /tmp/grid_fit_world_report.md
python3 tools/gridfit_world/wellspire_solid_check.py .
node --test tests/grid_fit_world_reach.test.mjs
