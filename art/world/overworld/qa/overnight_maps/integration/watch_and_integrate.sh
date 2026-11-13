#!/bin/bash
# checks the backup gate every 3 min until 01:45 CT; runs integrate_live.sh --live once it opens
while true; do
  if bash /workspace/kilumen/art/world/overworld/qa/autotile_port/port/gate_check.sh | grep -q VERIFIED-TEXT; then
    echo "$(date +%H:%M) GATE_OPEN -> integrating"; bash /workspace/kilumen/art/world/overworld/qa/overnight_maps/integration/integrate_live.sh --live; echo "$(date +%H:%M) LIVE_DONE exit $?"; exit 0; fi
  echo "$(date +%H:%M) gate closed"
  [ $(date +%H%M) -ge 0145 ] && [ $(date +%H) -lt 12 ] && { echo "$(date +%H:%M) WATCH_DEADLINE"; exit 0; }
  sleep 180
done
