// Dev console RITA voice panel (src/dev/rita_panel.js, v0.2.32): every line listed + grouped, statuses from the real
// planFor(), Play goes through the real CompanyVoice strip path + RitaVoice.onPage and writes nothing to the save.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ritaLines, lineStatus, createRitaPanel } from '../src/dev/rita_panel.js';
import { CompanyVoice } from '../src/systems/company_voice.js';
import { RitaVoice } from '../src/systems/rita_voice.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const lines = J('text/overworld_lines.json'), cfg = J('data/company_voice.json');
const RITA = 'assets/audio/rita/';
const manifest = () => { const m = J(RITA + 'manifest.json'); for (const f of Object.values(m.parts || {})) { const p = J(RITA + f); Object.assign(m.lines, p.lines); Object.assign(m.clips, p.clips); Object.assign(m.numbers ||= {}, p.numbers); for (const [s, d] of Object.entries(p.names || {})) Object.assign((m.names ||= {})[s] ||= {}, d); } return m; };
const scene = () => ({ lines, flags: new Set(['rita_installed']), seen: { 'cv#trainer1': true }, log: [], ms: 0, company: { employeeId: '482913' }, _dirty: false });

test('lists every system_company_voice line incl. variants, grouped by event', () => {
  const rows = ritaLines(lines, cfg), L = lines.system_company_voice;
  const want = Object.keys(L).filter((k) => !k.startsWith('_') && k !== 'speaker');
  assert.equal(rows.length, want.length);
  assert.ok(rows.some((r) => r.key === 'first_catch_4' && r.base === 'first_catch'));
  assert.ok(rows.find((r) => r.key === 'kilindex_milestone_10_2').base === 'kilindex_milestone');
  assert.ok(rows.every((r) => r.base !== '(no event)'), rows.filter((r) => r.base === '(no event)').map((r) => r.key).join());
});

test('static status: shipped region 1 lines have text, no unresolved placeholder; region 1 base lines voice OK', () => {
  const m = manifest(), s = scene(), rows = ritaLines(lines, cfg);
  const bad = rows.map((r) => [r, lineStatus(r, m, s)]).filter(([, x]) => x.text !== 'ok');
  assert.deepEqual(bad.map(([r, x]) => r.key + ': ' + x.why), []);
  for (const k of ['first_catch', 'first_catch_2', 'kilindex_new']) assert.equal(lineStatus(rows.find((r) => r.key === k), m, s).audio, 'ok', k);
  const broken = lineStatus({ key: 'x_1', base: 'x', raw: ['{employee_id}: {nope}'] }, m, s);
  assert.equal(broken.text, 'placeholder'); assert.equal(broken.audio, 'missing');
});

test('Play: real strip + real RitaVoice.onPage, voice plays, nothing written to the save', async () => {
  const s = scene(); let t = 0; s.ms = 0;
  const cv = new CompanyVoice(s, cfg, { now: () => t });
  const shown = []; cv.view = { el: { style: {} }, show: (c) => shown.push(c.pages[c.page]), hide: () => shown.push('hide') };
  const started = [];
  const ctx = { currentTime: 0, decodeAudioData: async () => ({ duration: 0.2 }), createBufferSource: () => ({ connect() {}, start() { started.push(1); }, stop() {}, disconnect() {} }) };
  const out = { context: ctx };
  const audio = { unlocked: true, settings: { muted: false, master: 1 }, voiceOut: () => out, duck: () => true, unduck() {} };
  const fetch = async (u) => { const f = path.join(ROOT, u); return fs.existsSync(f) ? { ok: true, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')), arrayBuffer: async () => new ArrayBuffer(8) } : { ok: false, status: 404 }; };
  const rv = new RitaVoice(cv, { audio: () => audio, fetch, base: RITA, doc: { createElement: () => ({ canPlayType: () => 'probably' }) } });
  cv.ritaVoice = rv; cv.onPage = (c) => { rv.onPage(c).catch(() => {}); };
  s.companyVoice = cv; cv.audio = () => audio;
  const msgs = []; const panel = createRitaPanel({ scene: s, say: (m) => msgs.push(m) });
  await panel.loadManifest();
  const row = panel.rows().find((r) => r.key === 'first_catch_2');
  const before = JSON.stringify({ f: [...s.flags], seen: s.seen, log: s.log });
  const ticker = setInterval(() => { t += 400; cv.tick(); }, 20);
  const res = await panel.play(row); clearInterval(ticker);
  assert.equal(res.spoke, true, res.why);
  assert.ok(started.length > 0, 'clips started on the voice bus');
  assert.equal(shown[0], lineStatus(row, panel.state.manifest, s).pages[0]);
  assert.ok(!/\{\w+\}/.test(shown[0]));
  assert.equal(cv.current, null);
  assert.equal(JSON.stringify({ f: [...s.flags], seen: s.seen, log: s.log }), before);
  assert.equal(s._dirty, false);
});
