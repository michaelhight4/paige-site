// RITA voice: full coverage, regions 1-8 + end-game (Oct 31 2026, Gary 1:47 AM CT: "rita's voice needs to be finished and tested").
// Every string CompanyVoice can show inside maxRegion has a clip plan; every clip file exists; manifest src == line text;
// mute / master 0 / toggle off keep RITA silent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { audit, loadManifest } from '../tools/rita_voice_audit.mjs';
import { RitaVoice, VOICE_KEY } from '../src/systems/rita_voice.js';

const CFG = JSON.parse(fs.readFileSync(new URL('../data/company_voice.json', import.meta.url)));
const LINES = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url))).system_company_voice).filter(([k, v]) => !k.startsWith('_') && k !== 'speaker' &&  Array.isArray(v?.pages)));
const DIR = new URL('../assets/audio/rita/', import.meta.url);

test('maxRegion covers regions 1-8 + end-game (9); quests 4-9 can fire', () => {
  assert.equal(CFG.maxRegion, 9);
  const kbr = Object.values(CFG).find((v) => v && typeof v === 'object' && v.events)?.events?.quest_done?.keys_by_region
    || JSON.stringify(CFG).match(/"keys_by_region":(\{[^}]*\})/) && JSON.parse(JSON.stringify(CFG).match(/"keys_by_region":(\{[^}]*\})/)[1]);
  for (const r of ['4', '5', '6', '7', '8', '9']) assert.ok(kbr[r]?.length, `keys_by_region ${r}`);
  const tags = new Set(Object.values(LINES).map((l) => l.region));
  for (const t of tags) assert.ok(t <= CFG.maxRegion, `line region ${t} above maxRegion`);
});

test('audit: every displayable page (all events, all slot values, both id forms) is voiced', () => {
  const a = audit({ maxRegion: 9 });
  const bad = a.rows.filter((r) => !r.ok);
  assert.ok(a.rows.length > 2000, `rows ${a.rows.length}`);
  assert.deepEqual(bad.slice(0, 5).map((r) => `${r.key}: ${r.shown} (${r.why})`), []);
});

test('every line key + page in the text is in the manifest with src == current text', () => {
  const M = loadManifest();
  for (const [key, line] of Object.entries(LINES)) {
    const pages = [].concat(line.text ?? line.pages ?? line);
    const ml = M.lines?.[key]; assert.ok(ml, `manifest missing ${key}`);
    pages.forEach((p, i) => assert.equal(ml.pages[i]?.src, typeof p === 'string' ? p : p.text, `${key} p${i + 1}`));
  }
});

test('every clip referenced by the manifest exists as ogg + m4a with ms > 0', () => {
  const M = loadManifest();
  const stems = Object.keys(M.clips);
  assert.ok(stems.length >= 1000, `clips ${stems.length}`);
  for (const s of stems) {
    assert.ok(M.clips[s].ms > 0, s);
    for (const f of ['ogg', 'm4a']) assert.ok(fs.statSync(new URL(`${s}.${f}`, DIR)).size > 200, `${s}.${f}`);
  }
});

function rv({ muted = false, master = 0.8, on = true } = {}) {
  const store = new Map([[VOICE_KEY, JSON.stringify({ on })]]);
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const out = { context: {} };
  return new RitaVoice({}, { storage, audio: () => ({ unlocked: true, settings: { muted, master }, voiceOut: () => out }) });
}
test('settings: mute, master volume 0 and the RITA voice toggle keep her silent', () => {
  assert.ok(rv().ready());
  assert.equal(rv({ muted: true }).ready(), null);
  assert.equal(rv({ master: 0 }).ready(), null);
  assert.equal(rv({ on: false }).ready(), null);
  const v = rv(); v.setOn(false); assert.equal(v.ready(), null); v.setOn(true); assert.ok(v.ready());
});
