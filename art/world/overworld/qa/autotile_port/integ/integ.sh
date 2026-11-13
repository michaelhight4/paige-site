#!/bin/bash
# Overnight maps integration WITHOUT the autotile port (port held per parent 00:44 CT). usage: integ.sh dry|live
set -u
OW=/workspace/kilumen/art/world/overworld; ST=$OW/qa/overnight_maps/staging; ME=$OW/qa/autotile_port/integ
MODE=$1; L=$ME/logs/${MODE}_$(date +%H%M); mkdir -p $L
SNAP=$ME/snapshot; rm -rf $SNAP; mkdir -p $SNAP/patches
cp $ST/overnight_maps.py $ST/encounters_overnight.json $SNAP/ && for f in world_data interiors_merge progression; do diff -u $OW/tools/$f.py $ST/sandbox/overworld/tools/$f.py > $SNAP/patches/$f.py.diff; done; cat $ME/postfix_block.py >> $SNAP/overnight_maps.py && (cd $SNAP && sha1sum overnight_maps.py encounters_overnight.json patches/*) > $L/snapshot.sha1
if [ $MODE = live ]; then
  T=$OW; BK=/workspace/kilumen/backups/overnight_integration_20261023_mine; mkdir -p $BK
  [ -e $BK/DONE ] && { echo "already applied (backup DONE exists) -> stop"; exit 2; }
  tar -C $OW --exclude=./qa --exclude='__pycache__' -czf $BK/overworld_pre_integration.tgz . && tar -tzf $BK/overworld_pre_integration.tgz >/dev/null && \
   (cd $OW && find . -path ./qa -prune -o -type f -not -path '*__pycache__*' -print0 | xargs -0 sha1sum) > $BK/manifest.sha1 && touch $BK/DONE || { echo BACKUP FAILED; exit 3; }
  echo "backup ok $BK"
else
  T=/tmp/kil_integ_noport/overworld; rm -rf /tmp/kil_integ_noport; mkdir -p $T
  tar -C $OW --exclude=./qa --exclude='__pycache__' -cf - . | tar -C $T -xf -
  mkdir -p $T/qa && cp -r $OW/qa/furniture_colours $T/qa/
fi
cd $T
[ -e maps_new/zz_overnight.py ] && { echo "zz_overnight.py already present in target -> stop"; exit 4; }
for f in world_data interiors_merge progression; do patch --dry-run -p0 tools/$f.py < $SNAP/patches/$f.py.diff >/dev/null || { echo "PATCH $f DOES NOT APPLY"; exit 5; }; done
# step 1: tool patches + encounter tables -> --check
patch -p0 tools/world_data.py < $SNAP/patches/world_data.py.diff >> $L/patches.log || exit 5
cp $SNAP/encounters_overnight.json encounters_overnight.json
python3 tools/run.py --check > $L/check1.log 2>&1; echo "STEP1 (world_data patch+encounters) CHECK EXIT $?"; grep -a "in-memory problems\|PROGRESSION\|TEXT IDS\|WORLD DATA" $L/check1.log | tail -5
# step 2: 28 maps + Fernwick west exit (hook) -> --check, then full run (live) and --check again
for f in interiors_merge progression; do patch -p0 tools/$f.py < $SNAP/patches/$f.py.diff >> $L/patches.log || exit 5; done
cp $SNAP/overnight_maps.py maps_new/zz_overnight.py
python3 tools/run.py --check > $L/check2.log 2>&1; echo "STEP2 (interiors_merge+progression patches + 28-map hook) CHECK EXIT $?"; grep -a "in-memory problems\|PROGRESSION\|TEXT IDS\|WORLD DATA" $L/check2.log | tail -5
if [ $MODE = live ]; then
  python3 tools/run.py > $L/run.log 2>&1; echo "FULL RUN EXIT $?"; grep -a "problems" $L/run.log | tail -3
  python3 tools/run.py --check > $L/check3.log 2>&1; echo "POST-RUN CHECK EXIT $?"; grep -a "in-memory problems\|PROGRESSION\|TEXT IDS\|WORLD DATA" $L/check3.log | tail -5
  (cd /tmp/tbval2 && PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/workspace/kilumen/text python3 b.py) > $L/textbot.log 2>&1; echo "TEXTBOT EXIT $?"; tail -3 $L/textbot.log
  ls maps | wc -l
fi
echo "logs $L"
