// finish-a item 3: Ondravel waits on the Wellspire summit dome as his own idle overworld sprite until the reveal / face-off.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSummitFx } from '../src/region9/summit_fx.js';
const map = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/maps/fin_lab1_now.json', import.meta.url)));
const scene = (flags = []) => ({ map: { name: 'fin_lab1_now', json: map }, flags: new Set(flags) });

test('idle sheet is wired and anchored on the dome cell', () => {
  const dir = new URL('../art/fx/wellspire/ondravel_ow_idle_down/', import.meta.url);
  const m = JSON.parse(fs.readFileSync(new URL('ondravel_ow_idle_down.json', dir)));
  assert.ok(fs.existsSync(new URL('ondravel_ow_idle_down.png', dir)));
  assert.equal(m.frame_w, 64); assert.equal(m.frames, m.ms.length); assert.ok(m.loop);
  const dome = map.interact_spots.find((s) => s.id === 'fin_dome');
  assert.deepEqual([map.ondravel.x, map.ondravel.y + 1], [dome.x, dome.y]); // he stands right above the dome prop
});

test('idle shows before the face-off and gives way to the reveal', () => {
  const s = scene(); const fx = makeSummitFx(s);
  assert.equal(fx.idleNow(), true);
  fx.active = true; assert.equal(fx.idleNow(), false); fx.active = false;
  fx.row = 1; assert.equal(fx.idleNow(), false); fx.row = null;
  assert.equal(makeSummitFx(scene(['fin_timeslip'])).idleNow(), false);
  assert.equal(makeSummitFx(scene(['fin_woke_home'])).idleNow(), false);
  assert.equal(makeSummitFx({ map: { name: 'fin_summit_camp', json: {} }, flags: new Set() }).idleNow(), false);
});
