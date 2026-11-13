#!/bin/bash
# Map integrator (Oct 23 2026, DRAFT). Usage:
#   bash integrate_live.sh --dry-run   -> copies live overworld to /tmp/kil_integ_dry and runs every step there (--check only, nothing live touched)
#   bash integrate_live.sh --live      -> ONLY after FULL_BACKUP_20261022 is verified (gate_check.sh prints VERIFIED-TEXT)
set -u
OW=/workspace/kilumen/art/world/overworld; I=$OW/qa/overnight_maps/integration; ST=$OW/qa/overnight_maps/staging; AP=$OW/qa/autotile_port/port
QADEPS='./qa/furniture_colours ./qa/interior_scale_audit ./qa/interiors_hookup ./qa/seams'   # tool inputs under qa/
MODE=${1:---dry-run}; L=$I/logs/${MODE#--}_$(date +%H%M); mkdir -p $L
BASE=$L/tools_base; mkdir -p $BASE; cp $OW/tools/*.py $OW/tools/*.json $BASE/ 2>/dev/null   # pre-port baseline: WD diffs are taken against this, never against already-ported tools
if [ "$MODE" = --live ]; then
  bash $AP/gate_check.sh | tee $L/gate.txt | grep -q VERIFIED-TEXT || { echo "GATE CLOSED: FULL_BACKUP_20261022 not verified -> stop"; exit 9; }
  T=$OW
  grep -q "AUTOTILE" $OW/tools/run.py && { echo "autotile port already live -> skip; baseline from its backup"; rm -rf $BASE/*; tar -C $BASE -xzf /workspace/kilumen/backups/autotile_port_20261023/overworld_pre_port.tgz ./tools && mv $BASE/tools/* $BASE/ || exit 7; } || { bash $AP/apply_live.sh > $L/autotile_apply.log 2>&1; rc=$?; echo "AUTOTILE APPLY EXIT $rc (log $L/autotile_apply.log)"; [ $rc = 0 ] || exit 7; }
  [ -e $OW/maps_new/zz_overnight.py ] && { echo "overnight maps already integrated (zz_overnight.py live) -> stop, nothing else done"; exit 8; }
  BK=/workspace/kilumen/backups/overnight_integration_20261023; mkdir -p $BK
  [ -e $BK/DONE ] || { tar -C $OW --exclude=./qa --exclude='__pycache__' -czf $BK/overworld_pre_integration.tgz . && tar -C $OW -czf $BK/qa_tool_inputs.tgz $QADEPS && tar -tzf $BK/overworld_pre_integration.tgz >/dev/null && touch $BK/DONE || { echo BACKUP FAILED; exit 3; }; }
else
  T=/tmp/kil_integ_dry/overworld; rm -rf /tmp/kil_integ_dry; mkdir -p /tmp/kil_integ_dry
  tar -C $OW --exclude=./qa --exclude='__pycache__' -cf - . | (mkdir -p $T && tar -C $T -xf -); tar -C $OW -cf - $QADEPS | tar -C $T -xf -
  # autotile port tool changes (same as apply_live.sh step 2)
  (cd $T && patch -p0 tools/build.py < $AP/build.py.patch && patch -p0 tools/run.py < $AP/run.py.patch && cp $AP/sandbox/overworld/tools/autotile_rules.json $AP/sandbox/overworld/tools/tile_id_ledger.json tools/) > $L/autotile_patch.log 2>&1 || { echo "AUTOTILE PATCH FAILED"; cat $L/autotile_patch.log; exit 4; }
  echo "autotile port tool patches applied to copy"
fi
cd $T
# overnight maps: tool changes = live tools vs WD sandbox tools (fresher than staging/patches/*.diff), applied on top of the autotile port
SBT=$ST/sandbox/overworld/tools; : > $L/patches.log
for f in $(cd $SBT && ls *.py *.json 2>/dev/null); do
  if [ ! -e $BASE/$f ]; then cp $SBT/$f tools/$f; echo "new tool file $f" >> $L/patches.log
  elif ! cmp -s $BASE/$f $SBT/$f; then
    case $f in autotile_rules.json|tile_id_ledger.json) continue;; esac
    diff -u $BASE/$f $SBT/$f > $L/wd_$f.diff
    patch -p0 --dry-run tools/$f < $L/wd_$f.diff >> $L/patches.log 2>&1 && patch -p0 tools/$f < $L/wd_$f.diff >> $L/patches.log 2>&1 || { echo "WD PATCH $f DOES NOT APPLY on top of autotile port"; exit 5; }
    echo "patched $f" >> $L/patches.log
  fi
done
cp $ST/overnight_maps.py maps_new/zz_overnight.py && cp $ST/encounters_overnight.json encounters_overnight.json
for x in $(cd $ST/sandbox/overworld && ls -d maps_new/* 2>/dev/null); do [ -e $x ] || { cp -r $ST/sandbox/overworld/$x $x; echo "new hook $x" >> $L/patches.log; }; done
grep -h "patched\|new " $L/patches.log | tr '\n' ';'; echo
# Greystone DRAFT re-band (L20-27 -> L12-18)
python3 - <<'PY' || { echo "GREYSTONE DRAFT FAILED"; exit 6; }
p='tools/world_data.py'; s=open(p).read()
a="'greystone_glowfern': (20, 25)"; b="_s('tumbloam', a, b - 2, 15)])"
assert s.count(a)==1 and s.count(b)==1, 'anchor moved'
s=s.replace(a,"'greystone_glowfern': (12, 16)").replace(b, b+"\n    T['greystone_glowfern']['draft'] = ('DRAFT (Oct 23 2026, map integrator): re-banded from L20-27 to L12-18 per Game dev overnight_gd '\n                                         '(Greystone opens right after coin 1). Not signed off by Gary; revert = LV (20, 25) and drop this key.')")
open(p,'w').write(s)
PY
echo "overnight hook + encounters + 3 patches + greystone draft in place ($T)"
[ "$MODE" = --live ] && { python3 tools/run.py > $L/run.log 2>&1; echo "FULL RUN EXIT $?"; }
python3 tools/run.py --check > $L/check.log 2>&1; echo "CHECK EXIT $?"; grep -a "in-memory problems\|PROGRESSION\|TEXT IDS\|WORLD DATA" $L/check.log | tail -6
python3 - <<'PY'
import sys,os; sys.path.insert(0,'tools'); import world_data as w
t=w.tables()['greystone_glowfern']; lv=[x for s in t['slots'] for x in s['level']]
print('GREYSTONE glowfern levels', min(lv), '-', max(lv), '| draft key:', 'draft' in t, '| overnight tables:', sum(1 for k in w.tables() if k not in ('sunmeadow_grass','thornwood_grass','greystone_glowfern') and not k.startswith('mirefen')))
PY
echo "logs: $L"
