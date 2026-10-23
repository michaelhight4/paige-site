// Kilumen: boot. Dev URL params: ?map=route1&x=4&y=30&facing=up&debug=1&zoom=3&touch=1&flags=has_run_shoes,has_bike
// Save: localStorage 'kilumen.save.v1' (+ .bak). ?save=0 = no persistence, ?reset=1 = wipe the save first.
// Soul-pass dev params: ?hour=22 | ?phase=night, ?timescale=0 (freeze clock), ?lead=rillop&warmth=80&nick=Bubbles
import { CONFIG } from './config.js';
import { Input } from './overworld/input.js';
import { Overworld } from './overworld/overworld.js';
import { SaveStore } from './overworld/save.js';
import { Dialog } from './overworld/dialog.js';

const q = new URLSearchParams(location.search);
const num = (k) => (q.has(k) && q.get(k) !== '' && Number.isFinite(+q.get(k)) ? +q.get(k) : undefined);
const start = q.has('map')
  ? { map: q.get('map'), x: num('x') ?? 0, y: num('y') ?? 0, facing: q.get('facing') || 'down' }
  : null; // null: continue from the save, else CONFIG.start

const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200 + 1400 * (text.split('\n').length - 1));
}

const touchPad = document.getElementById('touchpad');
const wantTouch = q.get('touch') === '1' || (q.get('touch') !== '0' && matchMedia('(pointer: coarse)').matches);
touchPad.hidden = !wantTouch;

let storage = null;
try { storage = q.get('save') === '0' ? null : window.localStorage; } catch { storage = null; } // private mode: play without saving
const store = new SaveStore(storage);
if (q.get('reset') === '1') store.clear();
const saveData = store.load();
if (store.lastError) console.warn('save:', store.lastError, store.loadedFrom ? `(loaded ${store.loadedFrom})` : '');

const canvas = document.getElementById('world');
const input = new Input(window);
input.attachTouch(touchPad);
const flags = (q.get('flags') || '').split(',').map((f) => f.trim()).filter(Boolean); // dev only, merged into the save
const scene = new Overworld(canvas, input, CONFIG, {
  start, debug: q.get('debug') === '1', zoom: num('zoom'), toast, flags, store, saveData: saveData || undefined,
  dialog: new Dialog(document.body), hour: num('hour'), phase: q.get('phase') || undefined, timescale: num('timescale'),
  lead: q.get('lead') || undefined, warmth: num('warmth'), nick: q.get('nick') || undefined,
});

window.kilumen = { scene, state: () => scene.state(), ready: scene.init().then(() => { scene.run(); return true; }) };
window.kilumen.ready.catch((e) => { console.error(e); toast('Failed to load: ' + e.message); });
