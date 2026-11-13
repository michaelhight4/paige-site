#!/bin/bash
while true; do
  out=$(bash /workspace/kilumen/art/world/overworld/qa/autotile_port/port/gate_check.sh); echo "$out"
  echo "$out" | grep -q "VERIFIED-TEXT" && { echo GATE_OPEN; exit 0; }
  [ $(date +%H%M) -ge 0200 ] && [ $(date +%H) -lt 12 ] && { echo GATE_DEADLINE; exit 0; }
  sleep 600
done
