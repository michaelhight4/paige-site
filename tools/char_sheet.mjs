// node tools/char_sheet.mjs -> /workspace/lifesim/tests/shots/characters.html (+ png when puppeteer is available)
import fs from 'node:fs'; import * as E from '../src/engine.js'; import * as C from '../src/character.js'; import { D } from '../src/data.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const root = new URL('../assets/art/characters/', import.meta.url);
const get = (p) => fs.readFileSync(new URL(p, root), 'utf8');
let html = '<body style="background:#cfe3f0;font:12px sans-serif">';
const ages = [1, 8, 16, 35, 70];
for (let i = 0; i < 4; i++) { html += '<div style="display:flex">'; const ch = C.newChar('k' + i); for (const a of ages) html += `<div style="text-align:center">${C.compose(ch, a, get, { size: 150 })}<br>${a}</div>`; html += '</div>'; }
const ch = C.newChar('z9'); ch.parts.top = { id: 'blazer', c: { fabric: '#222233', trim: '#f3efe4' } }; ch.parts.hat = { id: 'top_hat', c: { fabric: '#222233', trim: '#c0392b' } }; ch.parts.glasses = { id: 'round', c: { metal: '#b8bcc8' } }; ch.parts.facial = { id: 'beard', c: { hair: '#5a3a22' } }; ch.parts.neck = { id: 'necklace_pearl', c: { trim: '#fff', metal: '#c8a2c8' } };
html += '<div style="display:flex">' + C.layerDef('hair', 'afro') ? '' : ''; html += '<div style="display:flex">';
for (const t of ['hoodie', 'evening_gown', 'police_uniform', 'lab_coat', 'trench_coat']) { const c2 = JSON.parse(JSON.stringify(ch)); c2.parts.top = { id: t, c: { fabric: '#7a4aa5', trim: '#f3efe4' } }; c2.build = ['slim', 'avg', 'broad'][t.length % 3]; html += `<div>${C.compose(c2, 35, get, { size: 150 })}</div>`; }
html += '</div>';
for (const h of ['spiky', 'bob', 'bun', 'afro', 'mohawk']) { const c2 = JSON.parse(JSON.stringify(ch)); c2.parts.hair = { id: h, c: { hair: '#c0392b' } }; c2.parts.hat = null; html += `<span>${C.compose(c2, 25, get, { size: 100 })}</span>`; }
fs.mkdirSync(new URL('../tests/shots/', import.meta.url), { recursive: true }); fs.writeFileSync(new URL('../tests/shots/characters.html', import.meta.url), html);
console.log('size of a saved character:', C.saveSize(ch), 'bytes');
