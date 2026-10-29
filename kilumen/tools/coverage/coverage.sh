#!/usr/bin/env bash
# Test coverage with c8 12.0.0 (ISC, github.com/bcoe/c8) via pinned npx; nothing added to the repo.
# Shows which src/ files the node tests never touch (where new region 5-8 code needs tests). Report: /tmp/kilumen_coverage
set -e; cd "$(dirname "$0")/../.."
npx -y c8@12.0.0 --reporter=text-summary --reporter=html --report-dir=/tmp/kilumen_coverage --include='src/**' \
  --exclude='src/vendor/**' --exclude='src/battle/engine.js' node --test tests/*.test.mjs "$@" | tail -8
