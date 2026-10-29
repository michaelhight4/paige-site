#!/bin/sh
# Asset quality gate (local + CI): every asset must pass grid_fit_and_swap.py --check.
cd "$(dirname "$0")/../.." && exec python3 tools/furniture/grid_fit_and_swap.py . --check --overworld --report "${TMPDIR:-/tmp}/grid_fit_report.md"
