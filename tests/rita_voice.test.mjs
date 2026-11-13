// RITA voice wiring (Oct 23 2026): variant key -> manifest page, slot fill, region scope, text-only fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pageFor, sequenceFor, planFor, loadVoiceOn, RitaVoice, attachRitaVoice, VOICE_KEY } from '../src/systems/rita_voice.js';
import { CompanyVoice, TRAINER1_INTRO } from '../src/systems/company_voice.js';

const M = JSON.parse(readFileSync(new URL('../assets/audio/rita/manifest.json', import.meta.url)));
const LINES = JSON.parse(readFileSync(new URL('../text/overworld_lines.json', import.meta.url))).system_company_voice;
const CFG = JSON.parse(readFileSync(new URL('../data/company_voice.json', import.meta.url)));

test('every region 1 manifest line matches the current text and all its clips exist', () => {
  const keys = Object.keys(M.lines);
  assert.ok(keys.length >= 80, 'region 1 lines voiced');
  for (const k of keys) {
    assert.equal(M.lines[k].region, 'region_1');
    const src = LINES[k] || (k === 'rita_trainer1' ? TRAINER1_INTRO : null); // code default until Text Bot syncs it (data/textbot_requests_trainer1.md)
    const pages = (src.pages || src).slice(0, CFG.timing.max_pages);
    M.lines[k].pages.forEach((p, i) => assert.equal(p.src, pages[i], `${k} page ${i} stale`));
  }
  for (const stem of Object.keys(M.clips)) for (const ext of M.formats) assert.ok(existsSync(new URL(`../assets/audio/rita/${stem}.${ext}`, import.meta.url)), stem + '.' + ext);
});

test('region 2+ lines are not voiced yet (text only)', () => {
  for (const [k, v] of Object.entries(LINES)) if (v?.region > 1) assert.equal(M.lines[k], undefined, k);
});

test('variant key picks its own clips; another variant text never plays', () => {
  const pick = { key: 'first_catch_3', raw: LINES.first_catch_3.pages, vars: { employee_id: '001893', creature: 'Nibbin' } };
  const plan = planFor(M, { voice: pick, page: 0 });
  assert.ok(plan, 'first_catch_3 page 0 has a plan');
  assert.equal(plan.key, 'first_catch_3');
  assert.equal(pageFor(M, { ...pick, raw: LINES.first_catch_2.pages }, 0), null, 'mismatched text = silent');
});

test('employee id reads digit by digit; slots fill from names / numbers', () => {
  const seq = sequenceFor(M, { segs: [{ s: 'employee_id' }, { p: 220 }, { s: 'area' }] }, { employee_id: '001893', area: 'Trail 1' });
  const clips = seq.filter((x) => x.c).map((x) => x.c);
  assert.deepEqual(clips.slice(0, 6), ['0', '0', '1', '8', '9', '3'].map((d) => M.digits[d]));
  assert.equal(clips[6], M.names.area['trail 1']);
  assert.equal(sequenceFor(M, { segs: [{ s: 'area' }] }, { area: 'Saltmere' }), null, 'no clip for a region 2 name -> silent');
  assert.equal(sequenceFor(M, { segs: [{ s: 'employee_id' }] }, { employee_id: '' }), null);
});

test('company_voice records the exact variant key it showed (and none for FALLBACK)', () => {
  const scene = { lines: { system_company_voice: LINES }, seen: {}, flags: new Set(), log: [] };
  const cv = new CompanyVoice(scene, { ...CFG, maxRegion: 1 }, { rng: () => 0.99 });
  const pages = cv.pages('first_catch', { creature: 'Nibbin' });
  assert.match(cv.lastPick.key, /^first_catch(_\d)?$/);
  assert.deepEqual(cv.lastPick.raw, (LINES[cv.lastPick.key].pages).slice(0, 2));
  assert.equal(pages.length, cv.lastPick.raw.length);
  cv.pages('master_beaten', { key: 'saltmere', master: 'Saltmere' }); // region 2 line hidden at maxRegion 1 -> generic
  assert.ok(!/saltmere/.test(cv.lastPick.key));
  const bare = new CompanyVoice({ lines: {}, seen: {} }, { ...CFG, maxRegion: 1 });
  bare.pages('first_catch', {});
  assert.equal(bare.lastPick.key, null, 'FALLBACK text has no voice');
});

test('toggle defaults on and persists; locked / muted / off = silent, no throw', async () => {
  const store = new Map(); const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(loadVoiceOn(storage), true);
  const cv = { now: () => 0, current: null };
  const rv = attachRitaVoice(cv, { storage, audio: () => ({ unlocked: false, settings: { master: 1, muted: false } }), win: null });
  assert.equal(rv.toggle(), false); assert.equal(JSON.parse(store.get(VOICE_KEY)).on, false); assert.equal(loadVoiceOn(storage), false);
  rv.setOn(true);
  const cur = { voice: { key: 'first_catch', raw: LINES.first_catch.pages, vars: { employee_id: '001893' } }, page: 0, pageEnd: 10 };
  cv.current = cur;
  assert.equal(await rv.onPage(cur), false); // audio locked (before first tap)
  const muted = new RitaVoice(cv, { audio: () => ({ unlocked: true, settings: { master: 1, muted: true }, voiceOut: () => ({}) }) });
  assert.equal(await muted.onPage(cur), false);
});

test('plays once unlocked, stretches the page timer, stops on the next page (no overlap)', async () => {
  const started = []; const stopped = [];
  const ctx = { currentTime: 0, decodeAudioData: async () => ({ duration: 0.3 }), createBufferSource: () => { const s = { connect() {}, disconnect() {}, start: (t) => started.push(t), stop: () => stopped.push(1) }; return s; } };
  const out = { context: ctx };
  const audio = { unlocked: true, settings: { master: 0.8, muted: false }, voiceOut: () => out };
  const fetch = async (u) => (u.endsWith('manifest.json') ? { ok: true, json: async () => M } : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  const cv = { now: () => 1000, current: null };
  const rv = new RitaVoice(cv, { audio: () => audio, fetch, doc: null });
  const cur = { voice: { key: 'kilindex_new', raw: LINES.kilindex_new.pages, vars: { employee_id: '001893' } }, page: 0, pageEnd: 1500 };
  cv.current = cur;
  assert.equal(await rv.onPage(cur), true);
  assert.ok(started.length >= 7, 'digits + fragments scheduled');
  assert.ok(cur.pageEnd > 1500 + 1000, 'timer stretched to the voice');
  const n = started.length; rv.stop('page');
  assert.equal(stopped.length, n); assert.equal(rv.sources.length, 0);
  const bad = new RitaVoice(cv, { audio: () => audio, fetch: async (u) => (u.endsWith('manifest.json') ? { ok: true, json: async () => M } : { ok: false, status: 404 }), doc: null });
  assert.equal(await bad.onPage(cur), false, 'missing clip -> silent text');
});

test('region 2 part: excluded keys never voiced; part lines/names load lazily and speak', async () => {
  const P = JSON.parse(readFileSync(new URL('../assets/audio/rita/manifest_region_2.json', import.meta.url)));
  const scope = JSON.parse(readFileSync(new URL('../data/rita_voice_scope.json', import.meta.url)));
  for (const k of (scope.regions.region_2.exclude_keys || [])) assert.ok(!M.lines[k] && !P.lines[k], k);
  for (const [k, v] of Object.entries(P.lines)) { assert.equal(v.region, 'region_2'); v.pages.forEach((p, i) => assert.equal(p.src, (LINES[k].pages || LINES[k])[i], k)); }
  for (const stem of Object.keys(P.clips)) assert.ok(existsSync(new URL(`../assets/audio/rita/${stem}.ogg`, import.meta.url)), stem);
  assert.equal(M.parts.region_2, 'manifest_region_2.json');
  const fetched = [];
  const ctx = { currentTime: 0, decodeAudioData: async () => ({ duration: 0.2 }), createBufferSource: () => ({ connect() {}, disconnect() {}, start() {}, stop() {} }) };
  const audio = { unlocked: true, settings: { master: 1, muted: false }, voiceOut: () => ({ context: ctx }) };
  const fetch = async (u) => { fetched.push(u); const m = u.endsWith('manifest.json') ? structuredClone(M) : u.endsWith('manifest_region_2.json') ? P : null; return m ? { ok: true, json: async () => m } : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; };
  const cv = { now: () => 0, current: null };
  const rv = new RitaVoice(cv, { audio: () => audio, fetch, doc: null });
  const r1 = { voice: { key: 'first_catch', raw: LINES.first_catch.pages, vars: { employee_id: '001893', creature: 'Nibbin' } }, page: 0, pageEnd: 0 };
  cv.current = r1; await rv.onPage(r1);
  assert.ok(!fetched.some((u) => u.includes('region_2')), 'region 1 page does not pull the region 2 part');
  const r2 = { voice: { key: 'area_new', raw: LINES.area_new.pages, vars: { employee_id: '001893', area: 'Salt Road' } }, page: 0, pageEnd: 0 };
  cv.current = r2; assert.equal(await rv.onPage(r2), true, 'generic line + region 2 name speaks after the part loads');
  const r3 = { voice: { key: 'master_beaten_saltmere', raw: LINES.master_beaten_saltmere.pages, vars: { employee_id: '001893' } }, page: 0, pageEnd: 0 };
  cv.current = r3; assert.equal(await rv.onPage(r3), true);
  assert.equal(fetched.filter((u) => u.includes('region_2')).length, 1, 'part fetched once');
});

test('Trainer 1: id slot -> one clip; intro chain plays the number on page 1, the line after it', () => {
  assert.ok(M.id_words?.['Trainer 1'] && M.clips[M.id_words['Trainer 1']]);
  assert.deepEqual(sequenceFor(M, { segs: [{ s: 'employee_id' }] }, { employee_id: 'Trainer 1' }), [{ c: M.id_words['Trainer 1'] }]);
  const intro = M.lines.rita_trainer1.pages.map((p) => p.src);
  const then = { key: 'first_catch_3', raw: LINES.first_catch_3.pages, vars: { employee_id: 'Trainer 1', creature: 'Nibbin' } };
  const voice = { key: 'rita_trainer1', raw: intro, vars: { employee_id: '800142' }, n: 2, then };
  const p0 = planFor(M, { voice, page: 0 }); assert.equal(p0.key, 'rita_trainer1'); assert.equal(p0.seq.filter((x) => x.c).length, 6);
  assert.equal(planFor(M, { voice, page: 1 }).key, 'rita_trainer1');
  const p2 = planFor(M, { voice, page: 2 }); assert.equal(p2.key, 'first_catch_3');
  if (LINES.first_catch_3.pages[0].includes('{employee_id}')) assert.ok(p2.stems.includes(M.id_words['Trainer 1']));
  assert.equal(planFor(M, { voice: { ...voice, then: null }, page: 2 }), null); // fallback line after the intro: silent
});
