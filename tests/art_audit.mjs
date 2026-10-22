// 7c1 11a: asset image remaps (IMAGE_AUDIT.csv) resolve to the intended existing art. node tests/art_audit.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import { artFor } from '../src/slice_bridge.js';
await E.loadData();
const want = { 'property:bungalow': 'craftsman', 'car:aurelian': 'sedan', 'car:nova': 'supercar', 'car:silverwing': 'classic_clean', 'boat:tug': 'fishing_boat', 'boat:superyacht': 'yacht', 'instrument:violin': 'violin', 'instrument:piano': 'piano', 'instrument:drums': 'drum_kit', 'instrument:guitar': 'acoustic_guitar', 'instrument:cello': 'violin', 'car:wreck_silverwing': 'classic_wrecked' };
for (const [k, v] of Object.entries(want)) { const [cat, tpl] = k.split(':'); assert.equal(artFor({ cat, tpl }), v, k); }
console.log('PASS art_audit');
