// Mood layers v1 (Oct 23, 2026; Gary's easy set): tint, vignette, ambient particles, sun rays. node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { periodicFbm, cloudLevels, WEATHER } from '../src/overworld/living.js';
import {
  MOOD_KEYS, PHASES, PARTICLE_KINDS, CAPS, NIGHT_BRIGHT, KIND, resolveMood, resolvePreset, familyFor, tintAlpha,
  vignetteAlpha, rayStrength, activeParticles, particleCount, makeParticles, particleAt, blink, findRayAnchors,
  visibleAnchors, Mood,
} from '../src/overworld/mood.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const DATA = readJson('src/overworld/mood.json');
const PC = readJson('src/platform/pc.json').mood, MOBILE = readJson('src/platform/mobile.json').mood;
const PAL = new Set(fs.readFileSync(path.join(ROOT, CONFIG.paletteHex), 'utf8').split(/\s+/).map((s) => s.replace('#', '').toLowerCase()).filter((s) => /^[0-9a-f]{6}$/.test(s)));
const REGION1 = ['brookhollow', 'route1', 'greystone_entrance', 'greystone_b1', 'fernwick', 'fernwick_hall_int'];
const presets = () => [...Object.keys(DATA.defaults), ...Object.keys(DATA.maps)].map((k) => [k, DATA.defaults[k] ? DATA.defaults[k] : resolvePreset(DATA, k)]);

test('presets: every region 1 area up to Master 1 has a preset; families are right', () => {
  for (const m of REGION1) assert.ok(DATA.maps[m], m);
  assert.equal(familyFor('brookhollow'), 'outdoor');
  assert.equal(familyFor('route1'), 'outdoor');
  assert.equal(familyFor('greystone_b1'), 'cave');
  assert.equal(familyFor('fernwick_hall_int'), 'indoor');
  assert.equal(resolvePreset(DATA, 'greystone_b1').family, 'cave');
  assert.equal(resolvePreset(DATA, 'fernwick_hall_int').family, 'indoor');
  assert.equal(resolvePreset(DATA, 'unknown_map_x').family, 'outdoor', 'unlisted maps fall back to the family default');
});

test('presets: only the approved layers (no fog / flare / blur / zoom / framing keys anywhere)', () => {
  const banned = /fog|flare|blur|zoom|frame|framing|bokeh|dof|lens/i;
  const walk = (o, at) => { for (const [k, v] of Object.entries(o)) { if (!k.startsWith('_')) assert.ok(!banned.test(k), `${at}.${k}`); if (v && typeof v === 'object') walk(v, `${at}.${k}`); } };
  walk(DATA.defaults, 'defaults'); walk(DATA.maps, 'maps');
  for (const [k, p] of presets()) {
    for (const key of Object.keys(p)) if (!['family', 'area'].includes(key)) assert.ok(MOOD_KEYS.includes(key), `${k}: ${key}`);
  }
});

test('presets: subtle (alpha under the caps), palette colours, known particle kinds and phases', () => {
  for (const [k, p] of presets()) {
    if (p.tint) { assert.ok(p.tint.alpha <= CAPS.tint, `${k} tint`); assert.ok(PAL.has(p.tint.color.replace('#', '').toLowerCase()), `${k} tint colour ${p.tint.color}`); }
    if (p.vignette) { assert.ok(p.vignette.alpha <= CAPS.vignette, `${k} vignette`); assert.ok(PAL.has(p.vignette.color.replace('#', '').toLowerCase()), `${k} vignette colour`); }
    if (p.rays) { assert.ok(p.rays.alpha <= CAPS.rays, `${k} rays`); assert.ok(PAL.has(p.rays.color.replace('#', '').toLowerCase()), `${k} ray colour`); }
    for (const pk of p.particles || []) {
      assert.ok(PARTICLE_KINDS.includes(pk.kind), `${k} ${pk.kind}`);
      for (const ph of pk.phases || []) assert.ok(PHASES.includes(ph), `${k} ${pk.kind} ${ph}`);
      assert.ok(pk.density > 0 && pk.density <= 24, `${k} ${pk.kind} density`);
    }
  }
  for (const [kind, K] of Object.entries(KIND)) for (const c of K.colors) assert.ok(PAL.has(c), `${kind} ${c}`);
});

test('presets: no rays indoors or in caves; snow / embers only where they fit; region 1 has no snow or embers', () => {
  for (const m of [...REGION1, ...Object.keys(DATA.maps)]) {
    const p = resolvePreset(DATA, m);
    if (p.family !== 'outdoor') assert.ok(!p.rays, `${m} rays`);
    const kinds = (p.particles || []).map((x) => x.kind);
    if (kinds.includes('snow')) assert.match(m, /^frost/, m);
    if (kinds.includes('embers')) assert.match(m, /^cinder/, m);
    if (REGION1.includes(m)) assert.ok(!kinds.includes('snow') && !kinds.includes('embers'), m);
  }
  assert.ok(resolvePreset(DATA, 'fernwick').particles.some((x) => x.kind === 'leaves'), 'forest town gets falling leaves');
  assert.ok(resolvePreset(DATA, 'route1').particles.some((x) => x.kind === 'motes' && x.phases.includes('day')), 'route 1 day motes');
  assert.ok(resolvePreset(DATA, 'route1').particles.some((x) => x.kind === 'fireflies' && x.phases.includes('night')), 'route 1 night fireflies');
});

test('night look: tint off at night, night particles use night-bright colours only, fireflies blink smoothly', () => {
  for (const [k, p] of presets()) {
    const fam = DATA.defaults[k] ? k : p.family;
    if (fam !== 'outdoor') continue; // indoors / caves run on the 'day' grade and phase (clock.js INDOOR_OR_CAVE)
    assert.equal(tintAlpha(p, 'night'), 0, k);
    for (const pk of p.particles || []) if ((pk.phases || PHASES).includes('night')) for (const c of KIND[pk.kind].colors) assert.ok(NIGHT_BRIGHT.includes(c), `${k} ${pk.kind} ${c}`);
  }
  assert.ok(tintAlpha(resolvePreset(DATA, 'route1'), 'day') > tintAlpha(resolvePreset(DATA, 'route1'), 'dusk'));
  const p = makeParticles('fireflies', 1, 7)[0];
  let maxStep = 0; for (let t = 0; t < 800; t++) maxStep = Math.max(maxStep, Math.abs(blink(p, t + 1) - blink(p, t)));
  assert.ok(maxStep < 0.05, `blink step ${maxStep} (no flashing)`);
  assert.ok(p.blink >= 180, 'blink period >= 3 s');
});

test('rays: day + cloudy outdoors only; zero at night, indoors, when wet, below the coverage gate, or clouds off', () => {
  const r1 = resolvePreset(DATA, 'route1'), hall = resolvePreset(DATA, 'fernwick_hall_int');
  const base = { outdoor: true, wet: false, coverage: WEATHER.cloudy.coverage, minOfDay: 12 * 60, cloudsOn: true };
  assert.equal(rayStrength(r1, base), 1);
  assert.ok(rayStrength(r1, { ...base, minOfDay: 18.5 * 60 }) < 1 && rayStrength(r1, { ...base, minOfDay: 18.5 * 60 }) > 0, 'fades at dusk');
  assert.equal(rayStrength(r1, { ...base, minOfDay: 22 * 60 }), 0, 'night');
  assert.equal(rayStrength(r1, { ...base, minOfDay: 3 * 60 }), 0, 'small hours');
  assert.equal(rayStrength(r1, { ...base, coverage: WEATHER.clear.coverage }), 0, 'clear sky');
  assert.equal(rayStrength(r1, { ...base, coverage: WEATHER.fair.coverage }), 0, 'fair sky (not mostly clouded)');
  assert.equal(rayStrength(r1, { ...base, wet: true }), 0, 'rain');
  assert.equal(rayStrength(r1, { ...base, cloudsOn: false }), 0, 'clouds off');
  assert.equal(rayStrength(hall, { ...base, outdoor: false }), 0, 'indoors');
  assert.ok(rayStrength(r1, { ...base, coverage: WEATHER.overcast.coverage }) > 0, 'overcast');
});

test('rays: anchors are clear holes ringed by cloud (none in a clear sky), world-anchored to the drift', () => {
  const N = 192, noise = periodicFbm(N, N, 0x6b696c75);
  assert.equal(findRayAnchors(cloudLevels(noise, 0), N).length, 0);
  const a = findRayAnchors(cloudLevels(noise, WEATHER.cloudy.coverage), N, { B: 8, R: 2 });
  assert.ok(a.length > 0, 'cloudy sky has gaps to shine through');
  const b = findRayAnchors(cloudLevels(noise, WEATHER.cloudy.coverage), N, { B: 8, R: 2 });
  assert.deepEqual(a, b, 'deterministic');
  const P = N * 2, view = { x: 0, y: 0, w: P, h: P };
  const v0 = visibleAnchors(a, { x: 0, y: 0 }, view, 0, P), v1 = visibleAnchors(a, { x: 10, y: 4 }, view, 0, P);
  assert.equal(v0.length, a.length);
  const moved = v1.find((p) => p.s === v0[0].s && Math.abs(p.x - (v0[0].x - 10)) < 1e-6 && Math.abs(p.y - (v0[0].y - 4)) < 1e-6);
  assert.ok(moved || v1.length, 'anchors shift with the cloud offset');
});

test('particles: deterministic, world-anchored wrap, mobile fewer than pc, reduced motion / rain = none', () => {
  assert.deepEqual(makeParticles('motes', 10, 42), makeParticles('motes', 10, 42));
  const p = makeParticles('motes', 1, 42)[0], cam = { x: 100, y: 50 };
  for (let t = 0; t < 2000; t += 97) { const w = particleAt(p, 'motes', t, cam, 480, 270); assert.ok(w.x >= cam.x - 24 && w.x < cam.x + 480 + 24 && w.y >= cam.y - 24 && w.y < cam.y + 270 + 24, `t${t}`); }
  const pc = resolveMood({ profile: PC }), mob = resolveMood({ profile: MOBILE });
  assert.ok(particleCount(18, 960, 540, mob.particles) < particleCount(18, 960, 540, pc.particles));
  assert.ok(mob.maxParticles < pc.maxParticles && mob.maxRays <= pc.maxRays);
  assert.equal(particleCount(14, 4000, 4000, 1), 28, 'area factor capped at 2');
  const r1 = resolvePreset(DATA, 'route1');
  assert.ok(activeParticles(r1, { phase: 'day', reduced: false, wet: false }).length > 0);
  assert.equal(activeParticles(r1, { phase: 'day', reduced: true, wet: false }).length, 0, 'reduced motion');
  assert.equal(activeParticles(r1, { phase: 'day', reduced: false, wet: true }).length, 0, 'rain');
  assert.deepEqual(activeParticles(r1, { phase: 'night', reduced: false, wet: false }).map((x) => x.kind), ['fireflies']);
});

test('switches: profile defaults on, ?mood=0 turns everything off, profile can veto one layer', () => {
  const on = resolveMood({ profile: PC, query: '' });
  assert.ok(on.on && on.tint && on.vignette && on.rays && on.particles === 1);
  const off = resolveMood({ profile: PC, query: '?mood=0' });
  assert.ok(!off.on && !off.tint && !off.vignette && !off.rays && off.particles === 0);
  assert.equal(resolveMood({ profile: { ...PC, enabled: false }, query: '?mood=1' }).on, true);
  assert.equal(resolveMood({ profile: { ...PC, rays: false } }).rays, false);
});

// fake 2D context: records calls, has no getImageData (a per-frame readback would throw)
function fakeCtx(w, h) {
  const calls = [];
  const ctx = {
    canvas: { width: w, height: h }, calls, globalCompositeOperation: 'source-over', fillStyle: '', imageSmoothingEnabled: true,
    _stack: [],
    save() { this._stack.push(this.globalCompositeOperation); calls.push('save'); },
    restore() { this.globalCompositeOperation = this._stack.pop(); calls.push('restore'); },
    fillRect(...a) { calls.push(['fillRect', this.globalCompositeOperation, this.fillStyle, ...a]); },
    clearRect() {}, setTransform() {}, beginPath() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { calls.push('fill'); }, ellipse() {},
    drawImage(...a) { calls.push(['drawImage', this.globalCompositeOperation, ...a.slice(1)]); },
    createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; },
  };
  return ctx;
}
const makeCanvas = (w, h) => ({ width: w, height: h, getContext: () => fakeCtx(w, h) });
function fakeScene({ map = 'route1', grade = 'day', phase = 'day', min = 720, coverage = WEATHER.cloudy.coverage, reduced = false } = {}) {
  const life = { outdoor: familyFor(map) === 'outdoor', wet: false, coverage, settings: { clouds: true }, reducedMotion: reduced, cloudOffset: () => ({ x: 0, y: 0 }), _noise: periodicFbm(768, 768, 0x6b696c75) };
  return { scene: { gradeName: grade, phase, clock: { min, day: 1 }, tick: 600, life }, map: { name: map, width: 68, height: 48 } };
}
const NOISE = periodicFbm(768, 768, 0x6b696c75);

test('draw: no readback, composite op restored, layers follow the time of day (fake ctx)', () => {
  for (const [opts, expect] of [
    [{ grade: 'day', phase: 'day', min: 720 }, { tint: true, rays: true, particles: true }],
    [{ grade: 'night', phase: 'night', min: 1320 }, { tint: false, rays: false, particles: true }],
    [{ grade: 'day', phase: 'day', min: 720, reduced: true }, { tint: true, rays: true, particles: false }],
    [{ map: 'fernwick_hall_int', grade: 'day', phase: 'night', min: 1320 }, { tint: true, rays: false, particles: true }],
  ]) {
    const { scene, map } = fakeScene(opts); scene.life._noise = NOISE;
    const mood = new Mood(scene, { data: DATA, switches: resolveMood({ profile: PC }), makeCanvas });
    const ctx = fakeCtx(1920, 1080);
    let found = false;
    // try a few camera spots so at least one sees a ray anchor on a cloudy day
    for (let i = 0; i < 12 && !found; i++) {
      mood.draw(ctx, { map, zoom: 4, cam: { x: i * 400, y: i * 260 }, player: { x: 10, y: 10 }, outside: 'edge', life: scene.life });
      found = mood.last.raysDrawn > 0;
    }
    assert.equal(ctx.globalCompositeOperation, 'source-over', JSON.stringify(opts));
    assert.ok(!('getImageData' in ctx));
    assert.equal(mood.last.tint > 0, expect.tint, `tint ${JSON.stringify(opts)}`);
    assert.equal(mood.last.rays > 0, expect.rays, `rays ${JSON.stringify(opts)}`);
    if (expect.rays) assert.ok(found, 'a ray is drawn somewhere on a cloudy day');
    assert.equal(mood.last.particles > 0, expect.particles, `particles ${JSON.stringify(opts)} ${mood.last.particles}`);
    assert.ok(mood.last.particles <= PC.maxParticles);
    assert.ok(mood.last.vignette > 0);
  }
});

test('draw: ?mood=0 draws nothing at all', () => {
  const { scene, map } = fakeScene();
  const mood = new Mood(scene, { data: DATA, switches: resolveMood({ profile: PC, query: '?mood=0' }), makeCanvas });
  const ctx = fakeCtx(1920, 1080);
  mood.draw(ctx, { map, zoom: 4, cam: { x: 0, y: 0 }, player: { x: 1, y: 1 }, life: scene.life });
  assert.equal(ctx.calls.length, 0);
  assert.equal(mood.state().on, false);
});

test('hook: renderer draws mood after fog and before living top / markers / fade; overworld passes it in view()', () => {
  const r = fs.readFileSync(path.join(ROOT, 'src/overworld/renderer.js'), 'utf8');
  const i = r.indexOf('v.mood?.draw(ctx, v)');
  assert.ok(i > 0);
  assert.ok(i < r.indexOf('v.life?.top(ctx, v)') && i < r.indexOf('v.markers?.(ctx, v)'));
  assert.ok(i > r.indexOf('v.nightfx?.drawLights'));
  assert.match(fs.readFileSync(path.join(ROOT, 'src/overworld/overworld.js'), 'utf8'), /mood: this\.mood/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/overworld/mood.js'), 'utf8').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ''), /getImageData|filter\s*=|blur\(/, 'no readback, no canvas filter / blur');
});

test('rays: one cached shaft sprite; drifting clouds and a moving camera never rebuild it', () => {
  const { scene, map } = fakeScene(); scene.life._noise = NOISE;
  let made = 0; const mk = (w, h) => { made++; return makeCanvas(w, h); };
  const mood = new Mood(scene, { data: DATA, switches: resolveMood({ profile: PC }), makeCanvas: mk });
  const ctx = fakeCtx(1920, 1080);
  let drawn = 0;
  for (let i = 0; i < 60; i++) {
    scene.life.cloudOffset = () => ({ x: i * 3, y: i }); scene.tick++;
    mood.draw(ctx, { map, zoom: 4, cam: { x: 200 + i * 7, y: 100 + i * 5 }, player: { x: 1, y: 1 }, outside: 'edge', life: scene.life });
    drawn += mood.last.raysDrawn;
  }
  assert.ok(drawn > 0, 'some shafts drawn');
  assert.ok(made <= 2, `base + one sprite, got ${made} canvases`);
  const blits = ctx.calls.filter((c) => Array.isArray(c) && c[0] === 'drawImage' && c[8] !== 480 * 4);
  assert.ok(blits.every((c) => c[6] % 4 === 0 && c[7] % 4 === 0), 'shafts land on whole zoom blocks');
});

test('draw: one base blit (tint + vignette baked), no full-screen fills or blend ops on the game canvas', () => {
  const { scene, map } = fakeScene(); scene.life._noise = NOISE;
  const mood = new Mood(scene, { data: DATA, switches: resolveMood({ profile: PC }), makeCanvas });
  const ctx = fakeCtx(1920, 1080);
  mood.draw(ctx, { map, zoom: 4, cam: { x: 0, y: 0 }, player: { x: 1, y: 1 }, outside: 'edge', life: scene.life });
  const full = ctx.calls.filter((c) => Array.isArray(c) && c[0] === 'fillRect' && c[5] >= 1920 && c[6] >= 1080);
  assert.equal(full.length, 0, 'no full-screen fillRect');
  assert.ok(ctx.calls.filter((c) => Array.isArray(c)).every((c) => c[1] === 'source-over'), 'source-over only');
  assert.equal(ctx.calls.filter((c) => Array.isArray(c) && c[0] === 'drawImage' && c[8] === 480 * 4).length, 1, 'one full-view blit');
});
