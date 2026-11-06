// Poor-start soft-lock check: each race, wealth=poor, force gold=0 at age 6, play to 25; need >=80g.
import fs from 'fs';
import { loadPack } from '../src/pack.js';
import * as E from '../src/bw_engine.js';
import { spendLeftover, runOneYear } from '../src/autopilot.js';

const pack = await loadPack(async (f) => JSON.parse(fs.readFileSync(new URL('../data_fantasy/' + f, import.meta.url))));
E.setPack(pack);

const races = (pack.races || []).map((r) => r.id);
const TARGET_AGE = 25;
const NEED_GOLD = 80;
const results = [];

function resolveAll(s) {
  let guard = 0;
  while (s.pending?.length && s.alive && guard++ < 40) {
    const c = E.pendingCard(s);
    if (!c?.choices?.length) break;
    const ok = c.choices.map((x, i) => i).filter((i) => !c.choices[i].locked);
    if (!ok.length) break;
    // Prefer non-dangerous / first unlocked
    E.resolve(s, ok[0]);
  }
}

function playPoor(raceId, seed) {
  const f = E.rollFate(seed, {}, { race: raceId, rerolls: 0 });
  f.wealth = 'poor';
  f.race = raceId;
  const s = E.begin(f, {});
  s.wealth = 'poor';
  // Drain to 0 before work age to stress the soft-lock path
  s.gold = 0;
  let guard = 0;
  while (s.alive && E.cage(s) < 6 && guard++ < 20) {
    resolveAll(s);
    if (!s.pending.length) E.ageUp(s);
  }
  s.gold = 0; // ensure broke at work age
  // Manual path: take free job + odd jobs + workHard until 25
  guard = 0; let peak = 0;
  while (s.alive && E.cage(s) < TARGET_AGE && guard++ < 80) {
    resolveAll(s);
    peak = Math.max(peak, s.gold || 0);
    if (!s.alive) break;
    if (!s.route && E.cage(s) >= 8) E.chooseRoute(s, 'route_craft');
    if (!s.job && E.cage(s) >= 6) {
      const opens = E.openings(s).filter((x) => x.ok);
      const free = opens.filter((x) => (x.joinFee || 0) <= 0);
      const pick = (free[0] || opens[0]);
      if (pick) E.takeJob(s, pick.job.id);
    }
    // spend acts: odd if unemployed else workHard, else train/rest
    let aGuard = 0;
    while ((s.budget?.act || 0) > 0 && aGuard++ < 8) {
      if (!s.job) {
        const r = E.oddJobs(s);
        if (!r?.ok) break;
        continue;
      }
      const r = E.workHard(s);
      if (!r?.ok) {
        const t = E.train(s, 'endurance');
        if (!t?.ok) E.rest(s);
      }
    }
    if (!s.pending.length) E.ageUp(s);
  }
  peak = Math.max(peak, s.gold || 0);
  return {
    mode: 'manual',
    race: raceId,
    alive: s.alive,
    age: E.cage(s),
    gold: s.gold,
    peak,
    job: s.job?.id || null,
    kitDebt: s.job?.kitDebt || 0,
    ok: peak >= NEED_GOLD,
  };
}

function playAutopilot(raceId, seed) {
  const f = E.rollFate(seed + 99, {}, { race: raceId, rerolls: 0 });
  f.wealth = 'poor';
  f.race = raceId;
  const s = E.begin(f, {});
  s.wealth = 'poor';
  s.gold = 0;
  let guard = 0;
  while (s.alive && E.cage(s) < 6 && guard++ < 20) {
    resolveAll(s);
    if (!s.pending.length) E.ageUp(s);
  }
  s.gold = 0;
  if (!s.route && E.cage(s) >= 8) E.chooseRoute(s, 'route_craft');
  guard = 0; let peak = s.gold || 0;
  while (s.alive && E.cage(s) < TARGET_AGE && guard++ < 80) {
    // Mimic autopilot year without pausing on "important"
    resolveAll(s);
    peak = Math.max(peak, s.gold || 0);
    if (!s.alive) break;
    if (!s.route && E.cage(s) >= 8) E.chooseRoute(s, 'route_craft');
    spendLeftover(s);
    if (!s.pending.length) E.ageUp(s);
    else resolveAll(s);
  }
  peak = Math.max(peak, s.gold || 0);
  return {
    mode: 'autopilot',
    race: raceId,
    alive: s.alive,
    age: E.cage(s),
    gold: s.gold,
    peak,
    job: s.job?.id || null,
    kitDebt: s.job?.kitDebt || 0,
    ok: peak >= NEED_GOLD,
  };
}

// Sanity: free entries exist
const probe = E.begin(Object.assign(E.rollFate(7, {}, { race: 'human' }), { wealth: 'poor' }), {});
probe.gold = 0; probe.age = 6;
const freeAt0 = E.openings(probe).filter((x) => x.ok && x.joinFee <= 0).map((x) => x.job.id);
const odd = E.oddJobs(probe);
console.log('freeEntryAt0Gold', freeAt0);
console.log('oddJobsSample', odd);

for (const race of races) {
  const m = playPoor(race, 1000 + races.indexOf(race) * 17);
  const a = playAutopilot(race, 2000 + races.indexOf(race) * 17);
  results.push(m, a);
  console.log(JSON.stringify(m));
  console.log(JSON.stringify(a));
}

const fails = results.filter((r) => !r.ok);
console.log(JSON.stringify({ races, needGold: NEED_GOLD, targetAge: TARGET_AGE, freeEntryAt0Gold: freeAt0, failCount: fails.length, fails }, null, 2));
if (fails.length) {
  console.error('POOR_START FAIL');
  process.exit(1);
}
console.log('POOR_START PASS');
