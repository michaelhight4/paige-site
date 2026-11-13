#!/bin/bash
# Autotile port: apply to LIVE. Run ONLY after FULL_BACKUP_20261022 is verified.  usage: bash apply_live.sh
set -u
OW=/workspace/kilumen/art/world/overworld; P=$OW/qa/autotile_port/port; BK=/workspace/kilumen/backups/autotile_port_20261023
cd $OW; L=$P/logs/live_$(date +%H%M); mkdir -p $L
[ -e $BK/DONE_BACKUP ] && { echo "backup already exists -> already applied? stop"; exit 2; }
# 1) back up everything the full run touches (whole OW minus qa/) + sha manifest
mkdir -p $BK && tar -C $OW --exclude=./qa --exclude='__pycache__' -czf $BK/overworld_pre_port.tgz . && \
  (cd $OW && find . -path ./qa -prune -o -type f -not -path '*__pycache__*' -print0 | xargs -0 sha1sum) > $BK/manifest.sha1 && \
  tar -tzf $BK/overworld_pre_port.tgz >/dev/null && touch $BK/DONE_BACKUP || { echo BACKUP FAILED; exit 3; }
echo "backup ok: $(du -sh $BK | cut -f1)"
# 2) apply the tool changes (patches against today's live tools; dry-run first)
patch --dry-run -p0 tools/build.py < $P/build.py.patch >/dev/null && patch --dry-run -p0 tools/run.py < $P/run.py.patch >/dev/null || { echo PATCH DOES NOT APPLY; exit 4; }
patch -p0 tools/build.py < $P/build.py.patch && patch -p0 tools/run.py < $P/run.py.patch && \
cp $P/sandbox/overworld/tools/autotile_rules.json $P/sandbox/overworld/tools/tile_id_ledger.json tools/ || exit 5
# 3) full run (takes the run lock) + --check
python3 tools/run.py > $L/run.log 2>&1; echo "RUN EXIT $?"; grep -a "AUTOTILE\|problems" $L/run.log | tail -5
python3 tools/run.py --check > $L/check.log 2>&1; echo "CHECK EXIT $?"; grep -a "in-memory problems" $L/check.log
# 4) Text Bot validator (on its /tmp copy, read-only)
(cd /tmp/tbval2 && PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/workspace/kilumen/text python3 b.py) > $L/textbot.log 2>&1; echo "TEXTBOT EXIT $?"; tail -3 $L/textbot.log
# 5) live should now equal the sandbox: expect moved 0, new 0, no per-map diffs
python3 $P/compare.py > $L/compare_live_vs_sandbox.log 2>&1; head -3 $L/compare_live_vs_sandbox.log
# 6) before/afters: before = backup, after = live
rm -rf /tmp/at_before && mkdir -p /tmp/at_before && tar -C /tmp/at_before -xzf $BK/overworld_pre_port.tgz
python3 $P/make_before_after.py /tmp/at_before $OW $OW/qa/autotile_port > $L/ba.log 2>&1; echo "BA EXIT $?"; tail -9 $L/ba.log
echo "logs: $L"
