// Headless smoke: plays many seeded lives with a simple bot through the real engine + pack. node tests/smoke.mjs
import fs from 'fs'; import { loadPack } from '../src/pack.js'; import * as E from '../src/bw_engine.js';
const pack = await loadPack(async (f) => JSON.parse(fs.readFileSync(new URL('../data_fantasy/' + f, import.meta.url))));
E.setPack(pack);
const ev = new Set(pack.events.map((e) => e.id)); for (const e of pack.events) for (const c of e.choices) for (const b of [c, c.win || {}]) if (b.chain && !ev.has(b.chain.id)) throw new Error('bad chain ' + b.chain.id);
let meta = {}, ages = [], jobs = new Set(), promos = 0, events = 0, heirsUsed = 0, reinc = 0, seenEv = new Set(), races = {};
let s = E.begin(E.rollFate(1), meta);
for (let life = 0; life < 120; life++) {
  races[s.race] = (races[s.race] || 0) + 1; let guard = 0;
  while (s.alive && guard++ < 400) {
    while (s.pending.length) { seenEv.add(s.pending[0]); const c = E.pendingCard(s); const i = c.choices.findIndex((x) => !x.locked); const ok = c.choices.map((x, j) => j).filter((j) => !c.choices[j].locked); E.resolve(s, ok[(s.rs >>> 3) % ok.length]); events++; if (!s.alive) break; }
    if (!s.alive) break;
    if (!s.route && E.hage(s) >= 9) E.chooseRoute(s, ['route_magic', 'route_sword', 'route_hybrid', 'route_craft'][life % 4]);
    if (!s.job && E.hage(s) >= 12) { const o = E.openings(s).filter((x) => x.ok); if (o.length) { E.takeJob(s, o[(life + guard) % o.length].job.id); jobs.add(s.job.id.split('_')[0]); } }
    const sk = E.primarySkills(s)[0] || 'endurance'; E.train(s, sk); E.train(s, sk);
    if (E.canAdventure(s)) E.adventure(s); else E.rest(s);
    if (E.hage(s) > 18 && !E.partnerOf(s)) E.meetSomeone(s, true); const p = E.living(s)[0]; if (p) E.socialize(s, p.id);
    // Tournament team + guild hall (light coverage once adult)
    if (E.cage(s) >= 16 && !s.team && (s.skills.swordsmanship || 0) >= 20 && s.gold >= 80 && (s.budget?.act || 0) > 0) {
      E.foundTeam(s, (s.last || 'Vale') + ' Circle', 'swordsmanship');
      if (s.team) { E.hireTeamNpc(s); E.setTeamCaptain(s, true); }
    }
    if (s.team && E.cage(s) >= 16 && (s.flags.team_meets_count || 0) < 2 && (s.budget?.act || 0) > 0 && s.gold >= 10) {
      s.flags.meet_venue_ready = s.flags.meet_venue_ready || 'Ribbon Green Lists';
      E.enterRealmMeet(s);
    }
    if (s.team && E.isTournamentYear(s) && !s.flags.tour_team_entered && (s.team.roster||[]).length >= 2 && s.gold >= 20 && (s.budget?.act || 0) > 0) {
      if ((s.team.renown || 0) < 5) s.team.renown = 5;
      E.enterTeamGrand(s);
    }
    if (E.cage(s) >= 18 && !s.guild && s.gold >= 150 && (s.budget?.act || 0) > 0) {
      E.foundGuild(s, s.region || 'hearthfold');
      if (s.guild) { E.setGuildFee(s, 1); E.hireGuildAdventurer(s); }
    }
    if (!s.pending.length) E.ageUp(s);
  }
  if (s.alive) throw new Error('life did not end: age ' + s.age + ' ' + s.race);
  ages.push(Math.floor(s.age)); promos += s.log.filter((l) => l.kind === 'promo').length;
  const h = E.heirs(s);
  if (h.length && life % 2) { s = E.continueAsHeir(meta, s, h[0].id, 1000 + life); heirsUsed++; }
  else { s = E.reincarnate(meta, s, E.echoChoices(s)[0], 1000 + life); reinc++; }
}
console.log(JSON.stringify({ lives: ages.length, medianAge: ages.sort((a, b) => a - b)[ages.length >> 1], races, careersHeld: [...jobs], promotions: promos, events, distinctEvents: seenEv.size + '/' + pack.events.length, heirsUsed, reinc, cemetery: meta.cemetery.length, codex: meta.codex.length, echoes: meta.echoes }));
console.log('SMOKE PASS');
