// RITA install (Gary 3:58 / 3:59 PM CT Oct 23 2026): the lab tech installs RITA in the tutorial before the starter pick;
// her first strip (Trainer 1 intro) fires right after; nothing of hers before; old saves auto-marked. Run: node --test tests/rita_install.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scene, pump, readJson } from './story_harness.mjs';
import { HOME, OPEN } from '../src/overworld/intro.js';
import { CompanyVoice, TRAINER1_KEY, RITA_INSTALLED } from '../src/systems/company_voice.js';

const CFG = readJson('data/company_voice.json');
const attach = (s) => { let t = 1e6; const cv = new CompanyVoice(s, CFG, { storage: null, now: () => (t += 50) }); s.companyVoice = cv; return cv; };

test('install scene fires once in the lab, before the pick; RITA first strip = Trainer 1 intro', async () => {
  const { s, said } = await scene({ map: OPEN.lab, flags: [HOME.started, HOME.briefed, OPEN.promoted], at: { x: 7, y: 9, facing: 'up' } });
  const cv = attach(s);
  assert.equal(cv.emit('area_new', { key: 'brookhollow', area: 'Brookhollow' }), false, 'RITA held back before the install');
  assert.ok(await pump(s, 6000, () => s.log.some((e) => e.step === 'ritaInstalled') && !s.busy));
  assert.ok(s.flags.has(RITA_INSTALLED));
  const all = said.flatMap((x) => x.pages).join('\n');
  assert.match(all, /install RITA/); assert.match(all, /field teams/); assert.match(all, /Installing RITA/);
  const iIntro = said.findIndex((x) => /going by looks/.test(x.pages.join(' '))), iInst = said.findIndex((x) => /install RITA/.test(x.pages.join(' ')));
  assert.ok(iIntro >= 0 && iInst > iIntro, 'after the starter intro');
  assert.ok(!s.flags.has(OPEN.starter), 'before the pick');
  for (let i = 0; i < 5 && !cv.current; i++) cv.tick();
  assert.equal(cv.current?.name, 'rita_install');
  assert.match(cv.current.pages[1], /Trainer 1/);
  assert.equal(cv.current.pages.length, 2, 'Trainer 1 intro alone');
  assert.ok(s.seen[TRAINER1_KEY]);
  const n = said.length;
  await pump(s, 300);
  assert.equal(s.log.filter((e) => e.step === 'ritaInstall').length, 1, 'once');
  assert.equal(said.length, n);
});

test('saves past the intro but not installed (v0.2.4 mid-tutorial): install only, then the pick', async () => {
  const { s, said } = await scene({ map: OPEN.lab, flags: [HOME.started, HOME.briefed, OPEN.promoted], at: { x: 7, y: 9, facing: 'up' } });
  s.seen[OPEN.introSeen] = true;
  assert.ok(await pump(s, 3000, () => s.flags.has(RITA_INSTALLED) && !s.busy));
  assert.ok(!said.some((x) => /going by looks/.test(x.pages.join(' '))));
  assert.ok(said.some((x) => /field teams/.test(x.pages.join(' '))));
});

test('old saves that already met RITA: auto-marked, no replay', async () => {
  for (const [flags, seen] of [[[OPEN.starter], {}], [[OPEN.starter], { [TRAINER1_KEY]: true }]]) {
    const { s } = await scene({ map: 'brookhollow', flags, at: { x: 20, y: 20 } });
    s.seen = { ...seen };
    const cv = attach(s);
    assert.ok(cv.started());
    assert.ok(s.flags.has(RITA_INSTALLED));
  }
  const { s } = await scene({ map: 'brookhollow', flags: [HOME.started], at: { x: 20, y: 20 } });
  const cv = attach(s);
  assert.equal(cv.started(), false, 'new game before the lab: RITA silent');
  assert.ok(!s.flags.has(RITA_INSTALLED));
});
