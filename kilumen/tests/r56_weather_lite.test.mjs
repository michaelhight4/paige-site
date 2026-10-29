import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { mountWeather, weatherFor, flashAllowed, createWeatherStack, FLASH } from '../src/region56/weather_lite.js';

const R = (p) => new URL('../' + p, import.meta.url);
// tiny fake DOM + fake clock
function fakeEl(tag) {
  const e = { tagName: tag, children: [], style: {}, className: '', hidden: false, parentNode: null, attrs: {}, _html: '',
    setAttribute(k, v) { this.attrs[k] = v; }, classList: { add() {} },
    insertBefore(c, ref) { c.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
    appendChild(c) { return this.insertBefore(c, null); },
    remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; },
    set innerHTML(h) { this._html = h; this._flash = /wx-flash/.test(h) ? { style: {}, querySelector: () => ({ src: '' }) } : null; }, get innerHTML() { return this._html; },
    querySelector(s) { return s === '.wx-flash' ? this._flash : null; },
    getContext() { const c = { cleared: [], clearRect: (...a) => c.cleared.push(a) }; return (this._ctx ||= c); } };
  return e;
}
function env() {
  let t = 0, id = 0; const q = new Map();
  return { t: () => t, doc: { createElement: fakeEl }, now: () => t, random: () => 0.5,
    setTimeout: (f, ms) => { q.set(++id, { f, at: t + ms }); return id; }, clearTimeout: (i) => q.delete(i),
    run(ms) { const end = t + ms; for (;;) { let n = null; for (const [k, v] of q) if (v.at <= end && (!n || v.at < q.get(n).at)) n = k; if (!n) break; const v = q.get(n); q.delete(n); t = v.at; v.f(); } t = end; },
    pending: () => q.size };
}

test('layer order: backdrop, .wx, sprites/HUD', () => {
  const E = env(), host = fakeEl('div'), bg = fakeEl('div'), field = fakeEl('div');
  host.appendChild(bg); host.appendChild(field);
  const wx = mountWeather(host, { before: field, weather: 'fog', env: E });
  assert.deepEqual(host.children, [bg, wx.el, field]);
  const st = createWeatherStack(fakeEl('div'), { width: 64, height: 36, env: E });
  assert.deepEqual([st.back.className, st.wx.el.className.split(' ')[0], st.top.className], ['wx-back', 'wx', 'wx-top']);
  st.clearDirty([{ x: 10, y: 10, w: 8, h: 8 }]);
  assert.equal(st.topCtx.cleared.length, 1); assert.deepEqual(st.topCtx.cleared[0], [9, 9, 10, 10]); // dirty rect only
});

test('classes only change on a weather change; pause/reduce-flashing classes', () => {
  const E = env(), host = fakeEl('div'), wx = mountWeather(host, { weather: 'rain', env: E });
  assert.equal(wx.el.className, 'wx wx-rain'); const html = wx.el.innerHTML;
  wx.set('rain'); assert.equal(wx.el.innerHTML, html);
  wx.set('storm'); assert.match(wx.el.innerHTML, /wx-flash/); assert.match(wx.el.innerHTML, /art\/world\/weather\/r56\/lightning_bolt_\d\.webp/);
  wx.pause(true); assert.match(wx.el.className, /wx-paused/); assert.equal(E.pending(), 0, 'no lightning while paused');
  wx.pause(false); wx.reduceFlashing(true); assert.match(wx.el.className, /reduce-flashing/); assert.equal(E.pending(), 0);
  wx.set(null); assert.equal(wx.el.hidden, true);
});

test('lightning: 6-14 s timer, <= 0.55, max 3 flashes per 10 s', () => {
  for (const r of [0, 0.5, 0.999]) {
    const E = env(); E.random = () => r; const host = fakeEl('div'), wx = mountWeather(host, { weather: 'storm', env: E });
    const seen = []; const f = wx.el._flash; let last = '0';
    const peek = () => { if (f.style.opacity !== last) { last = f.style.opacity; seen.push(+last); } };
    E.run(5999); assert.equal(wx.flashes.length, 0, 'nothing before 6 s');
    for (let i = 0; i < 120 * 100; i++) { E.run(10); peek(); }
    assert.ok(wx.flashes.length > 0);
    assert.ok(Math.max(...seen) <= FLASH.max);
    for (const t of wx.flashes) assert.ok(wx.flashes.filter((u) => u >= t && u - t < 10000).length <= 3, 'cap');
    wx.destroy(); assert.equal(E.pending(), 0);
  }
  assert.equal(flashAllowed([0, 1, 2], 5), false); assert.equal(flashAllowed([0, 1, 2], 10001), true);
});

test('weatherFor: R5/R6 only, storm variant/season, fog opt-in', () => {
  assert.equal(weatherFor({ map: 'brookhollow', life: 'rain' }), null);
  assert.equal(weatherFor({ map: 'route_coast_storm' }), 'storm');
  assert.equal(weatherFor({ map: 'mirefen', flags: new Set(['storm_season']) }), 'storm');
  assert.equal(weatherFor({ map: 'tidewater_coast', life: 'rain' }), 'rain');
  assert.equal(weatherFor({ map: 'mirefen' }), null);
  assert.equal(weatherFor({ map: 'x', override: 'fog' }), 'fog');
});

test('lite.css: game paths resolve, no CSS lightning loop, pause rule', () => {
  const css = readFileSync(R('src/region56/weather_lite.css'), 'utf8');
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 4);
  for (const u of urls) { assert.match(u, /_f0\.webp$|fog_band/); assert.ok(existsSync(new URL(u, R('src/region56/weather_lite.css'))), u); }
  assert.doesNotMatch(css, /wxFlash/); assert.match(css, /animation-play-state:paused/); assert.match(css, /\.reduce-flashing \.wx-flash/);
  assert.match(readFileSync(R('index.html'), 'utf8'), /src\/region56\/weather_lite\.css/);
  for (const b of [0, 1, 2]) assert.ok(existsSync(R(`art/world/weather/r56/lightning_bolt_${b}.webp`)));
});
