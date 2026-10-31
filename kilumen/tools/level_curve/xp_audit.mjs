#!/usr/bin/env node
// Per-Master XP audit (Oct 31 2026). For Master N: the lead starts at Master N-1's ace level (Master 1: L5) and must reach
// Master N's ace level. Trainer XP = every authored trainer in region N (map NPC teams, TRAINER_TEAMS, hall helpers +
// the Master; post-game r9_ / fin_ ids excluded), the lead taking every KO at full XP (engine rule, rules.js).
// Wild L = mean slot level of the region's grass / cave / water zones; extra wild fights = XP still missing / XP of one
// wild KO at that level (mean baseXp of the pool). Model only: no level scaling, no difficulty scaling, no XP share.
// Usage: node tools/level_curve/xp_audit.mjs [--mult=1.5] [--json]   (--mult forces one trainer multiplier everywhere)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KILUMEN_RULES as K } from '../../src/battle/data/rules.js';
import { TRAINER_TEAMS } from '../../src/battle/data/trainer_teams.js';
import { buildCreatures } from '../../src/battle/data/creatures.js';
import { regionOf, trainerXpMult } from '../../src/battle/data/xp_regions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}`))?.split('=')[1];
const forced = arg('mult') ? +arg('mult') : null;
const CR = buildCreatures(), bx = (sp) => CR[sp]?.baseXp ?? 50;
const curve = (l) => Math.floor(K.xpCurveMult * l ** 3);
const ko = (sp, l, m) => Math.max(1, Math.floor(bx(sp) * l / K.xpDivisor * m));
const postGame = (id) => /^(r9_|fin_)/.test(id);

export function audit({ masters = J('data/masters.json'), mapsDir = 'art/world/overworld/maps', mult = forced } = {}) {
  const trainers = []; // {region, key, team}
  for (const f of fs.readdirSync(path.join(ROOT, mapsDir)).filter((f) => f.endsWith('.json'))) {
    const map = f.slice(0, -5), d = J(path.join(mapsDir, f));
    for (const n of d.npcs || []) {
      if (!n.team || postGame(n.id)) continue;
      const team = Array.isArray(n.team) ? n.team : Object.values(n.team)[0];
      trainers.push({ key: `${map}.${n.id}`, map, id: n.id, team });
    }
  }
  const seen = new Set(trainers.map((t) => t.key));
  for (const [key, v] of Object.entries(TRAINER_TEAMS)) {
    const [map, id] = [key.slice(0, key.indexOf('.')), key.slice(key.indexOf('.') + 1)];
    if (seen.has(key) || postGame(id) || /_slip$/.test(id)) continue;
    trainers.push({ key, map, id, team: Array.isArray(v) ? v : Object.values(v.byStarter)[0] });
  }
  for (const h of masters.halls) {
    for (const t of h.trainers) trainers.push({ key: `${h.hall_map}.${t.id}`, map: h.hall_map, id: t.id, team: t.team.map((m) => ({ species: m.battle_species || m.species, level: m.level })), region: h.coin_number });
    trainers.push({ key: `${h.hall_map}.master`, map: h.hall_map, id: 'master', team: h.master.team.map((m) => ({ species: m.battle_species || m.species, level: m.level })), region: h.coin_number, masterNumber: h.coin_number });
  }
  const zones = J('data/encounters_wired.json').zones;
  const rows = [];
  let start = 5;
  for (const h of masters.halls) {
    const N = h.coin_number, ace = Math.max(...h.master.team.map((m) => m.level));
    const mine = trainers.filter((t) => (t.region ?? regionOf(t.map, t.id)) === N);
    let txp = 0, tmin = Infinity, tmax = -Infinity, kilu = 0;
    for (const t of mine) {
      const m = mult ?? trainerXpMult({ map: t.map, id: t.id, masterNumber: t.masterNumber });
      for (const f of t.team) { txp += ko(f.species, f.level, m); kilu++; if (t.id !== 'master') { tmin = Math.min(tmin, f.level); tmax = Math.max(tmax, f.level); } }
    }
    let wl = 0, wb = 0, wn = 0, wmin = Infinity, wmax = -Infinity;
    for (const [z, v] of Object.entries(zones)) {
      if (regionOf(z, '') !== N) continue;
      for (const s of v.slots) { const l = (s.level[0] + s.level[1]) / 2, w = s.weight || 1; wl += l * w; wb += bx(s.species) * w; wn += w; wmin = Math.min(wmin, s.level[0]); wmax = Math.max(wmax, s.level[1]); }
    }
    const wildL = wl / wn, wildXp = Math.max(1, Math.floor((wb / wn) * wildL / K.xpDivisor));
    const need = Math.max(0, curve(ace) - curve(start)), gap = Math.max(0, need - txp);
    rows.push({ master: N, zone: h.zone, from: start, ace, aceField: h.master.ace_level, wild: `${wmin}-${wmax}`, wildL: +wildL.toFixed(1),
      trainer: `${tmin}-${tmax}`, trainers: mine.length, kilu, need, trainerXp: txp, pct: Math.round(100 * Math.min(1, txp / need || 1)), extraWild: Math.ceil(gap / wildXp) });
    start = ace;
  }
  return rows;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rows = audit();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('M  zone              wild L   trainer L  ace L (from) ace_level  trainers/kilu  XP need  trainer XP  %cov  extra wild');
    for (const r of rows) console.log(`${r.master}  ${r.zone.padEnd(16)}  ${r.wild.padEnd(7)}  ${r.trainer.padEnd(9)}  ${String(r.ace).padStart(2)} (${String(r.from).padStart(2)})    ${String(r.aceField).padStart(3)}      ${String(r.trainers).padStart(3)}/${String(r.kilu).padEnd(4)}   ${String(r.need).padStart(7)}  ${String(r.trainerXp).padStart(9)}  ${String(r.pct).padStart(4)}%  ${String(r.extraWild).padStart(5)}`);
  }
}
