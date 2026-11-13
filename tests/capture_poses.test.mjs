// Kilumen: capture poses bone_v2 (Oct 23, 2026; Gary approved 12:00 AM CT). Every bone_v2 character's hold_points.json
// loads, has one hold point per frame, and every hold point is inside its frame; the strip matches the json; the frame
// is padded evenly so it centres on the original 64 px centre; and the game config (src/ui/fx_art.js) has poses ON.
// Run: node --test tests/capture_poses.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FX_CFG, poseJsonOk } from '../src/ui/fx_art.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, FX_CFG.poses.dir);
const CHARS = fs.readdirSync(DIR).filter((d) => !d.startsWith('_') && fs.statSync(path.join(DIR, d)).isDirectory()).sort();
const pngSize = (f) => { const b = fs.readFileSync(f); assert.equal(b.toString('latin1', 12, 16), 'IHDR', `${f} is a PNG`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('poses flag is ON by default and points at bone_v2', () => {
  assert.equal(FX_CFG.poses.on, true);
  assert.match(FX_CFG.poses.dir, /capture_poses\/bone_v2\/$/);
  assert.equal(FX_CFG.poses.player, 'cal');
});

test('bone_v2 has the player and the 15 trainers (17 characters)', () => {
  assert.equal(CHARS.length, 17, CHARS.join(','));
  for (const id of ['cal', 'mira']) assert.ok(CHARS.includes(id), id);
  for (const id of CHARS) assert.ok(FX_CFG.poses.roster.includes(id), `${id} in FX_CFG.poses.roster`);
});

for (const id of CHARS) {
  test(`bone_v2 ${id}: json loads, hold points inside the frame, strip matches`, () => {
    const hp = JSON.parse(fs.readFileSync(path.join(DIR, FX_CFG.poses.points(id)), 'utf8'));
    assert.equal(hp.char_id, id);
    assert.ok(poseJsonOk(hp), 'poseJsonOk');
    assert.ok(hp.frames.includes('raise') && hp.frames.includes('hold'), `frames ${hp.frames}`);
    assert.equal(hp.hold_px.length, hp.frames.length);
    hp.hold_px.forEach(([x, y], i) => {
      assert.ok(x >= 0 && x < hp.frame_w && y >= 0 && y < hp.frame_h, `${hp.frames[i]} [${x},${y}] in ${hp.frame_w}x${hp.frame_h}`);
      assert.deepEqual(hp.hold_px_by_frame?.[hp.frames[i]], [x, y], `hold_px_by_frame.${hp.frames[i]}`);
    });
    assert.equal(hp.pad.left, hp.pad.right, 'pad even on both sides');
    assert.equal(hp.frame_w - hp.pad.left - hp.pad.right, 64, 'unpadded width is the original 64 px');
    assert.equal(hp.frame_h, id === 'cal' || id === 'mira' ? 96 : 128);
    assert.deepEqual(pngSize(path.join(DIR, FX_CFG.poses.sheet(id))), [hp.frames.length * hp.frame_w, hp.frame_h], 'strip size');
    for (const f of hp.frames) assert.deepEqual(pngSize(path.join(DIR, id, `${id}_capture_${f}.png`)), [hp.frame_w, hp.frame_h], `${f} frame size`);
  });
}

test('poseJsonOk rejects a point outside the frame, a short hold list and an uneven pad', () => {
  const ok = { frames: ['raise', 'hold'], frame_w: 68, frame_h: 128, hold_px: [[6, 71], [3, 52]], pad: { left: 2, right: 2 } };
  assert.ok(poseJsonOk(ok));
  assert.ok(!poseJsonOk({ ...ok, hold_px: [[6, 71], [68, 52]] }));
  assert.ok(!poseJsonOk({ ...ok, hold_px: [[6, 71], [3, -1]] }));
  assert.ok(!poseJsonOk({ ...ok, hold_px: [[6, 71]] }));
  assert.ok(!poseJsonOk({ ...ok, pad: { left: 2, right: 4 } }));
  assert.ok(!poseJsonOk(null));
});
