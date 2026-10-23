// Kilumen: boot. Dev URL params: ?map=route1&x=4&y=30&facing=up&debug=1&zoom=3&touch=1&flags=has_run_shoes,has_bike
import { CONFIG } from './config.js';
import { Input } from './overworld/input.js';
import { Overworld } from './overworld/overworld.js';

const q = new URLSearchParams(location.search);
const num = (k) => (q.has(k) && Number.isFinite(+q.get(k)) ? +q.get(k) : undefined);
const start = q.has('map')
  ? { map: q.get('map'), x: num('x') ?? 0, y: num('y') ?? 0, facing: q.get('facing') || 'down' }
  : CONFIG.start;

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

const canvas = document.getElementById('world');
const input = new Input(window);
input.attachTouch(touchPad);
const flags = (q.get('flags') || '').split(',').map((f) => f.trim()).filter(Boolean); // dev only, e.g. ?flags=has_run_shoes,has_bike
const scene = new Overworld(canvas, input, CONFIG, { start, debug: q.get('debug') === '1', zoom: num('zoom'), toast, flags });

window.kilumen = { scene, state: () => scene.state(), ready: scene.init().then(() => { scene.run(); return true; }) };
window.kilumen.ready.catch((e) => { console.error(e); toast('Failed to load: ' + e.message); });
