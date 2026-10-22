#!/bin/bash
# runs every test; logs in /tmp/t_<name>.log
cd "$(dirname "$0")/.." ; p=0; f=0
for t in tests/*.mjs; do n=$(basename $t .mjs); [ "$n" = lib ] && continue; if timeout 300 node $t > /tmp/t_$n.log 2>&1; then p=$((p+1)); echo "PASS $n"; else f=$((f+1)); echo "FAIL $n"; fi; done
echo "pass=$p fail=$f"
