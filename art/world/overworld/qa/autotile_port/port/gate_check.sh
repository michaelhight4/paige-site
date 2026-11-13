#!/bin/bash
# prints FOUND lines for any FULL_BACKUP_20261022 marker/manifest and whether it says verified
date '+%I:%M %p CT'
hits=$(timeout 90 find /workspace /home/box /tmp /cursor/stores /workspace/kilumen/backups -maxdepth 6 \( -iname '*FULL_BACKUP_2026102*' -o -iname '*full_backup*' \) -not -path '*/chrome-profile/*' -not -path '*/node_modules/*' 2>/dev/null)
for h in $hits; do echo "FOUND $h"; if [ -f "$h" ]; then grep -il 'verified' "$h" >/dev/null && echo "  VERIFIED-TEXT in $h"; else ls "$h" | grep -i -E 'verif|manifest|marker' | sed 's/^/  contains /'; grep -ril 'verified' "$h" --include='*.md' --include='*.txt' --include='*.json' 2>/dev/null | head -3 | sed 's/^/  VERIFIED-TEXT /'; fi; done
grep -rn "FULL_BACKUP_20261022" /workspace/quality/dev_notes /workspace/kilumen/OVERWORLD_DEV.md 2>/dev/null | head -5
[ -z "$hits" ] && echo "no marker yet"
