// Autopilot pack (premium pass `autopilot`, part of All Access): pick yearly routines that run automatically every time you age,
// and skip-ahead (pick a routine, choose N years, play them out with a per-year summary).
// Routines are thin wrappers over the SAME actions the player triggers by hand (adapter.quickAction / adapter.interact), so costs, effects,
// skill gains and once-per-year flags are identical. Nothing here has its own balance numbers.
// State lives in the save: s.auto = { on, routines:[ids], floor, last, skipRemaining }.
import { D } from './data.js';
import * as Premium from './premium.js';
import * as P from './people.js';
import { money } from './rng.js';

export const PASS = 'autopilot';
export const MAX_SKIP = 50;
export const DEFAULT_FLOOR = 5000;
export const unlocked = () => Premium.isUnlocked(PASS);
export const ensure = (s) => { if (!s.auto) s.auto = { on: false, routines: ['train', 'read'], floor: DEFAULT_FLOOR, last: null, skipRemaining: 0 }; return s.auto; };

// id, label, quick id (adapter.quickAction) or interaction (adapter.interact with a person picker)
export const ROUTINES = [
  { id: 'train', icon: '🏋️', label: 'Train', desc: 'Gym session every year', q: 'train' },
  { id: 'read', icon: '📖', label: 'Read', desc: 'Library visit every year', q: 'read' },
  { id: 'study', icon: '📚', label: 'Study', desc: 'Hit the books', q: 'study' },
  { id: 'meditate', icon: '🧘', label: 'Meditate', desc: 'Calm the mind', q: 'meditate' },
  { id: 'workharder', icon: '💼', label: 'Work harder', desc: 'Extra effort at your job', q: 'workharder' },
  { id: 'practice', icon: '🔥', label: 'Practice passions', desc: 'Practice every active passion once this year (same as the Practice button on each)', k: 'passion_practice' },
  { id: 'passion_pick', icon: '🌱', label: 'Pick a passion', desc: 'Fill a free passion slot (your preferred passion, else the best fit for your skills)', k: 'passion_pick' },
  { id: 'talk_partner', icon: '💬', label: 'Talk to partner / spouse', desc: 'A real conversation (free)', i: 'talk', who: 'partner' },
  { id: 'date_night', icon: '🌹', label: 'Date night', desc: 'Romantic night with your partner / spouse ($100)', i: 'romance', who: 'partner' },
  { id: 'gift_partner', icon: '🎁', label: 'Gift for partner / spouse', desc: 'A gift so they stay ($50)', i: 'gift', who: 'partner' },
  { id: 'family_time', icon: '👪', label: 'Family time', desc: 'Spend time with the relative you have neglected most', i: 'spend', who: 'family' },
  { id: 'friend_time', icon: '🍻', label: 'Friend time', desc: 'Spend time with the friend you have neglected most', i: 'spend', who: 'friend' },
  { id: 'volunteer', icon: '🤝', label: 'Volunteer', desc: 'Service hours (10+)', v: 'volunteer' },
  // social media, streaming and production companies: same adapter calls as the manual screens (see CUSTOM below)
  { id: 'social_post', icon: '📱', label: 'Post on social media', desc: 'One safe, well-fitting post on your best open platform', k: 'social_post' },
  { id: 'social_reply', icon: '💬', label: 'Reply to comments', desc: 'Answer comments on every open platform', k: 'social_reply' },
  { id: 'social_deal', icon: '🤝', label: 'Accept best sponsor deal', desc: 'Take the best-paying sponsor offer you qualify for', k: 'social_deal' },
  { id: 'stream_start', icon: '🎥', label: 'Go live (streamer)', desc: 'Start or keep up your streaming career', k: 'stream_start' },
  { id: 'stream_sponsor', icon: '💰', label: 'Seek a stream sponsor', desc: 'Look for a streaming sponsor', k: 'stream_sponsor' },
  { id: 'prod_music', icon: '🎵', label: 'Greenlight an album', desc: 'Your record label signs and records with your default policy', k: 'prod_greenlight', m: 'music' },
  { id: 'prod_film', icon: '🎬', label: 'Greenlight a movie', desc: 'Your film studio greenlights a film with your default policy', k: 'prod_greenlight', m: 'film' },
  { id: 'prod_tv', icon: '📺', label: 'Greenlight a TV show', desc: 'Your TV studio greenlights a show with your default policy', k: 'prod_greenlight', m: 'tv' },
  { id: 'prod_game', icon: '🎮', label: 'Greenlight a game', desc: 'Your game studio greenlights a game with your default policy', k: 'prod_greenlight', m: 'game' },
  // racing (same adapter calls as the Racing screens)
  { id: 'racing_train', icon: '🏎️', label: 'Racing: train', desc: 'Train your weakest driving stat (or craft) once a year', k: 'racing_train' },
  { id: 'racing_license', icon: '🪪', label: 'Racing: apply for next licence', desc: 'Buy the next racing licence as soon as you qualify', k: 'racing_license' },
  { id: 'racing_race', icon: '🏁', label: 'Racing: run the season', desc: 'Race the rest of the season for your career and your team', k: 'racing_race' },
  { id: 'racing_sponsor', icon: '📣', label: 'Racing: sign best team sponsor', desc: 'Take the best-paying sponsor offer that fits a free slot', k: 'racing_sponsor' },
  { id: 'racing_staff', icon: '🧑‍🔧', label: 'Racing: fill vacant team staff', desc: 'Hire the best affordable candidate for each required role', k: 'racing_staff' },
  { id: 'racing_upgrade', icon: '🛠️', label: 'Racing: upgrade the garage', desc: 'Upgrade the lowest facility if it costs under 10% of team cash', k: 'racing_upgrade' },
  { id: 'prod_back', icon: '📨', label: 'Back a pitched project', desc: 'Invest a small slice of spare cash in the best pitch (revenue cut)', k: 'prod_back' },
];
export const routineDef = (id) => ROUTINES.find((r) => r.id === id);

const interactionOf = (rel, id) => (D.life.interactions[rel] || []).find((x) => x.id === id);
function target(s, def) {
  const live = P.living(s);
  if (def.who === 'partner') return P.partnerOf(s);
  const pool = live.filter((p) => (def.who === 'family' ? ['mother', 'father', 'sibling', 'child'].includes(p.rel) : p.rel === 'friend') && P.interactionsFor(s, p).some((i) => i.id === def.i));
  return pool.sort((a, b) => a.bar - b.bar)[0] || null;
}
// ---- custom routines (each returns { ok, reason, cost, run() } and run() calls the SAME adapter method the manual screen calls) ----
const sd = (ad, pid) => ad.getPlatform(pid);
const openPlats = (ad) => (ad.getSocial().platforms || []).filter((p) => p.open && !p.locked && p.status === 'active');
function bestPost(ad, p) { const rank = { Safe: 0, Spicy: 1, Risky: 2 }, fits = { great: 0, good: 1, ok: 2 }; return p.posts.filter((x) => !x.locked && x.tag === 'Safe').sort((x, y) => (fits[x.fit] ?? 3) - (fits[y.fit] ?? 3) || (rank[x.tag] - rank[y.tag]))[0]; }
const CUSTOM = {
  passion_practice(ad) { const st = ad.getPassions(); if (st.locked) return { ok: false, reason: 'Passions start at ' + st.minAge }; if (!st.active.length) return { ok: false, reason: 'No active passion (add the Pick a passion routine)' }; const todo = st.active.filter((a) => !a.practiced); if (!todo.length) return { ok: false, reason: 'Already practiced this year' }; return { ok: true, cost: 0, who: todo.map((a) => a.name).join(', '), run: () => { let last = { ok: false, message: '' }; const msgs = []; for (const a of todo) { last = ad.practicePassion(a.id); msgs.push(last.message); } return { ok: todo.length > 0, message: msgs.join(' ') }; } }; },
  passion_pick(ad) { const st = ad.getPassions(), A = ensure(ad.s); if (st.locked) return { ok: false, reason: 'Passions start at ' + st.minAge }; if (st.used >= st.slots) return { ok: false, reason: 'No free passion slot' }; if (!st.available.length) return { ok: false, reason: 'No passion left to pick' }; const fit = (p) => p.skills.reduce((a, k) => a + ((ad.s.skills && ad.s.skills[k]) || 0), 0) / p.skills.length; const pref = A.passion && st.available.find((p) => p.id === A.passion), best = pref || st.available.slice().sort((x, y) => fit(y) - fit(x) || (x.id < y.id ? -1 : 1))[0]; return { ok: true, cost: 0, who: best.name, run: () => ad.pickPassion(best.id) }; },
  racing_train(ad) { const st = ad.getRacing(); if (!st.career) return { ok: false, reason: 'No racing career' }; if (st.trainedThisYear) return { ok: false, reason: 'Already trained this year' }; if (ad.s.cash < st.trainCost) return { ok: false, reason: 'Cannot afford training' }; const weak = st.career.role === 'driver' ? Object.entries(st.statValues).sort((a, b) => a[1] - b[1])[0][0] : null; return { ok: true, cost: st.trainCost, run: () => ad.rcAction('train', weak) }; },
  racing_license(ad) { const st = ad.getRacing(); if (!st.career) return { ok: false, reason: 'No racing career' }; const n = st.license.next; if (!n) return { ok: false, reason: 'All licences held' }; if (!n.eligible) return { ok: false, reason: n.reason }; return { ok: true, cost: n.fee, run: () => ad.rcAction('license') }; },
  racing_race(ad) { const st = ad.getRacing(); const c = st.career && st.career.season && !st.career.season.done, t = st.team && st.team.canRace; if (!c && !t) return { ok: false, reason: 'No race left this season' }; return { ok: true, cost: 0, run: () => { let r = { ok: false, message: '' }; const msgs = []; if (c) { r = ad.rcAction('race', true); msgs.push(r.message); } if (t) { r = ad.rcAction('teamRace', true); msgs.push(r.message); } return { ok: r.ok, message: msgs.join(' ') }; } }; },
  racing_sponsor(ad) { const t = ad.getRacing().team; if (!t) return { ok: false, reason: 'No racing team' }; const free = (k) => t.sponsors.deals.filter((x) => x.kind === k).length < t.sponsors.slots[k]; const o = t.sponsors.offers.filter((x) => free(x.kind)).sort((a, b) => b.pay - a.pay)[0]; if (!o) return { ok: false, reason: 'No sponsor offer fits a free slot' }; return { ok: true, cost: 0, run: () => ad.rcAction('sponsor', o.id) }; },
  racing_staff(ad) { const st = ad.getRacing(), t = st.team; if (!t) return { ok: false, reason: 'No racing team' }; const role = st.troles.find((r) => r.required && !t.staff.some((x) => x.role === r.id)); if (!role) return { ok: false, reason: 'No vacant required role' }; const c = ad.getRacingStaff(role.id).filter((x) => x.fee <= t.cash * 0.2).sort((a, b) => b.skill - a.skill)[0]; if (!c) return { ok: false, reason: 'No affordable candidate' }; return { ok: true, cost: 0, run: () => ad.rcAction('hire', role.id, c.id) }; },
  racing_upgrade(ad) { const t = ad.getRacing().team; if (!t) return { ok: false, reason: 'No racing team' }; const f = t.facilities.filter((x) => x.cost && x.cost <= t.cash * 0.1).sort((a, b) => a.level - b.level)[0]; if (!f) return { ok: false, reason: 'Nothing affordable to upgrade' }; return { ok: true, cost: 0, run: () => ad.rcAction('upgrade', f.id) }; },
  social_post(ad) { const s = ad.s; if (s.age < 13) return { ok: false, reason: 'Social media starts at 13' }; let best = null; for (const sp of openPlats(ad)) { const p = sd(ad, sp.id); if (!p || p.postsLeft <= 0) continue; const post = bestPost(ad, p); if (post && (!best || sp.followers > best.f)) best = { pid: sp.id, post, f: sp.followers }; } if (!best) return { ok: false, reason: 'No open platform with a safe post to make' }; return { ok: true, cost: 0, who: best.pid, run: () => ad.socialAction(best.pid, 'post', best.post.id) }; },
  social_reply(ad) { const t = openPlats(ad).filter((sp) => { const p = sd(ad, sp.id); return p && !p.done.reply; })[0]; if (!t) return { ok: false, reason: 'Nothing to reply to' }; return { ok: true, cost: 0, who: t.id, run: () => { let last; for (const sp of openPlats(ad)) { const p = sd(ad, sp.id); if (p && !p.done.reply) last = ad.socialAction(sp.id, 'reply'); } return last; } }; },
  social_deal(ad) { let best = null; for (const sp of openPlats(ad)) { const p = sd(ad, sp.id); if (!p || !p.canSponsor || p.deals.length >= p.maxDeals) continue; for (const o of p.offers) if (o.fit !== 'poor' && (!best || o.pay > best.o.pay)) best = { pid: sp.id, o }; } if (!best) return { ok: false, reason: 'No sponsor offer to take' }; return { ok: true, cost: 0, who: best.o.brand, run: () => ad.socialAction(best.pid, 'accept', best.o.id) }; },
  stream_start(ad) { const st = ad.getStreamer(); if (st.locked) return { ok: false, reason: 'Streaming starts at ' + st.minAge }; if (st.active) return { ok: false, reason: 'Already streaming (it runs every year)' }; if (st.bannedYears) return { ok: false, reason: 'Banned' }; return { ok: true, cost: 0, run: () => ad.streamerAction('start', st.topics[0].id) }; },
  stream_sponsor(ad) { const st = ad.getStreamer(); if (!st.active) return { ok: false, reason: 'You are not streaming' }; if (!st.canSponsor) return { ok: false, reason: 'Needs ' + st.minSubsForSponsor + ' subs' }; if (st.done.sponsor) return { ok: false, reason: 'Already done this year' }; if (st.sponsors.length >= st.maxSponsors) return { ok: false, reason: 'Sponsor slots full' }; return { ok: true, cost: 0, run: () => ad.streamerAction('sponsor') }; },
  prod_greenlight(ad, def) { const co = ad.getProdCos().media.find((x) => x.id === def.m); if (!co || !co.owned) return { ok: false, reason: 'You do not own that company' }; const c = co.company; if (c.slate.length >= Math.min(c.policy.slots, c.maxSlots)) return { ok: false, reason: 'Slate is full' }; const t = c.tiers.find((x) => x.id === c.policy.tier); if (t.locked) return { ok: false, reason: 'Budget tier locked' }; if (def.m === 'music' && !c.roster.some((a) => !a.busy)) return { ok: false, reason: 'No free artist' }; return { ok: true, cost: Math.max(0, t.cost - c.cash), run: () => ad.prodAction(def.m, 'greenlight', {}) }; },
  prod_back(ad, def, floor) { const s = ad.s, room = Math.floor((s.cash - floor) * 0.1); let best = null; for (const m of ad.getProdCos().media) for (const p of m.pitches) { const amt = Math.min(p.ask, room); if (amt < p.min) continue; const q = p.buzz - p.risk * 5 + p.heat / 40; if (!best || q > best.q) best = { m: m.id, p, amt, q }; } if (!best) return { ok: false, reason: 'No pitch fits your spare cash' }; return { ok: true, cost: best.amt, who: best.p.title, run: () => ad.prodAction(best.m, 'invest', best.p.id, best.amt) }; },
};
// is the routine runnable right now? -> { ok, reason, cost, pid }
export function check(ad, def, floor) {
  const s = ad.s; if (s.prison) return { ok: false, reason: 'Not in prison' };
  if (def.k) { try { const c = CUSTOM[def.k](ad, def, floor ?? ensure(ad.s).floor); return c.ok ? { ok: true, cost: c.cost || 0, who: c.who, custom: c } : { ok: false, reason: c.reason }; } catch (e) { return { ok: false, reason: 'Not available' }; } }
  if (def.q) {
    const q = ad.getQuickActions('skills').actions.find((a) => a.id === def.q) || ad.getQuickActions('work').actions.find((a) => a.id === def.q);
    if (!q) return { ok: false, reason: 'Not available' };
    return q.disabled ? { ok: false, reason: q.done ? 'Already done this year' : q.reason || 'Not available' } : { ok: true, cost: 0 };
  }
  if (def.v) { if (s.age < 10) return { ok: false, reason: 'Service starts at 10' }; return s.acted.volunteer_hrs ? { ok: false, reason: 'Already done this year' } : { ok: true, cost: 0 }; }
  const p = target(s, def); if (!p) return { ok: false, reason: def.who === 'partner' ? 'No partner or spouse' : 'Nobody to see' };
  const a = interactionOf(p.rel, def.i); if (!a || !P.interactionsFor(s, p).some((i) => i.id === def.i)) return { ok: false, reason: 'Not available' };
  if (s.acted['p' + p.id + def.i]) return { ok: false, reason: 'Already done this year' };
  return { ok: true, cost: a.cost || 0, pid: p.id, who: p.first };
}
function runOne(ad, def, floor) {
  const s = ad.s, c = check(ad, def, floor);
  if (!c.ok) return { id: def.id, label: def.label, icon: def.icon, ran: false, reason: c.reason };
  if (c.cost && s.cash - c.cost < floor) return { id: def.id, label: def.label, icon: def.icon, ran: false, reason: `Would drop cash below your ${money(floor)} floor` };
  const before = s.cash; let r;
  if (def.k) r = c.custom.run(); else if (def.q) r = ad.quickAction(def.q); else if (def.v) r = ad.volunteerHours(); else r = ad.interact(c.pid, def.i);
  return { id: def.id, label: def.label, icon: def.icon, ran: !!r.ok, who: c.who || null, cost: Math.max(0, Math.round(before - s.cash)), msg: r.message || '', reason: r.ok ? '' : r.message || 'Failed' };
}

// ---- safety stops ----
export const SAFETY = ['dead', 'event', 'prison', 'illness', 'floor', 'crisis'];
export function safetyBefore(s, floor) {
  if (!s.alive) return { stop: true, kind: 'dead', reason: 'You have died.' };
  if (s.pending && s.pending.length) return { stop: true, kind: 'event', reason: 'A choice is waiting for you.' };
  if (s.prison) return { stop: true, kind: 'prison', reason: 'You are in prison.' };
  if (s.league && s.league.finals && !s.league.finals.done && false) return null;
  if (s.diseases && s.diseases.length) return { stop: true, kind: 'illness', reason: 'You are ill (' + s.diseases.length + ' condition' + (s.diseases.length > 1 ? 's' : '') + ').' };
  if (s.stats.health < 25) return { stop: true, kind: 'crisis', reason: `Your health is critical (${Math.round(s.stats.health)}).` };
  if (s.cash < floor) return { stop: true, kind: 'floor', reason: `Cash ${money(s.cash)} is below your ${money(floor)} floor.` };
  return null;
}
// what happened during the year that should pause the autopilot (compare snapshots)
export const snapshot = (s) => ({ age: Math.floor(s.age), cash: s.cash, debt: s.debt, stats: { ...s.stats }, job: s.job ? s.job.id : null, diseases: (s.diseases || []).length, prison: !!s.prison, partner: P.partnerOf(s) ? P.partnerOf(s).id : null, logSeq: s.logSeq || 0, online: ((s.stream && s.stream.bans) || 0) + ((s.infl && s.infl.cancelled) || 0) });
export function safetyAfter(s, a, b, floor) {
  const out = [];
  if (!s.alive) out.push({ kind: 'dead', reason: 'You died.' });
  if (s.pending && s.pending.length) out.push({ kind: 'event', reason: 'A big event or choice came up.' });
  if (b.diseases > a.diseases) out.push({ kind: 'illness', reason: 'You fell ill.' });
  if (!a.prison && b.prison) out.push({ kind: 'prison', reason: 'You were arrested.' });
  if (a.job && !b.job) out.push({ kind: 'crisis', reason: 'You lost your job.' });
  if (a.partner && b.partner !== a.partner) out.push({ kind: 'crisis', reason: 'Your partner is gone.' });
  if (b.online > a.online) out.push({ kind: 'crisis', reason: 'Your channel was banned or you were cancelled.' });
  if (a.stats.health - b.stats.health >= 20 || b.stats.health < 25) out.push({ kind: 'crisis', reason: 'Your health dropped sharply.' });
  if (s.cash < floor && s.alive) out.push({ kind: 'floor', reason: `Cash fell below your ${money(floor)} floor.` });
  return out;
}

// ---- catalog / status for the UI ----
export function status(ad) {
  const s = ad.s, A = ensure(s), un = unlocked();
  const routines = ROUTINES.map((def) => { const c = s.alive ? check(ad, def) : { ok: false, reason: 'Not alive' }; return { id: def.id, icon: def.icon, label: def.label, desc: def.desc, selected: A.routines.includes(def.id), available: c.ok, reason: c.reason || '', cost: c.cost || 0 }; });
  const safe = safetyBefore(s, A.floor);
  return { passion: A.passion || null, unlocked: un, price: 5.99, on: !!A.on && un, wantsOn: !!A.on, routines, floor: A.floor, selected: [...A.routines], safety: safe, last: A.last, skipRemaining: A.skipRemaining || 0, maxSkip: MAX_SKIP, nextAge: Math.floor(s.age) + 1 };
}
export function configure(s, o = {}) {
  const A = ensure(s);
  if (o.routines) A.routines = o.routines.filter((id, i, arr) => routineDef(id) && arr.indexOf(id) === i);
  if (o.floor != null) A.floor = Math.max(0, Math.min(1e9, Math.round(Number(o.floor) || 0)));
  if (o.on != null) A.on = !!o.on;
  if (o.passion !== undefined) A.passion = o.passion ? String(o.passion) : null;
  return A;
}

// ---- one year of autopilot: routines -> age -> summary ----
// ad = EngineAdapter. opts.routines overrides the saved selection (skip-ahead). Returns { ran, skipped, stopBefore, stops, summary, age result }.
export async function playYear(ad, { routines, floor } = {}) {
  const s = ad.s, A = ensure(s), fl = floor ?? A.floor, ids = routines || A.routines;
  const before = snapshot(s), ran = [], skipped = [];
  const stopBefore = safetyBefore(s, fl);
  if (!stopBefore) for (const id of ids) { const d = routineDef(id); if (!d) continue; const r = runOne(ad, d, fl); (r.ran ? ran : skipped).push(r); }
  return { before, ran, skipped, stopBefore, floor: fl };
}
export function summarize(s, pre, ageRes, floor) {
  const b = snapshot(s), d = (k) => Math.round(b.stats[k] - pre.before.stats[k]);
  const stops = ageRes && ageRes.noAge ? [] : safetyAfter(s, pre.before, b, floor);
  const line = pre.ran.length ? 'Autopilot: ' + pre.ran.map((r) => r.label.toLowerCase() + (r.who ? ' (' + r.who + ')' : '')).join(', ') + '.' : pre.stopBefore ? 'Autopilot paused: ' + pre.stopBefore.reason : 'Autopilot had nothing to do this year.';
  return { fromAge: pre.before.age, toAge: b.age, ran: pre.ran.map((r) => ({ id: r.id, label: r.label, icon: r.icon, who: r.who, cost: r.cost, msg: r.msg })), skipped: pre.skipped.map((r) => ({ id: r.id, label: r.label, icon: r.icon, reason: r.reason })),
    paused: pre.stopBefore ? { kind: pre.stopBefore.kind, reason: pre.stopBefore.reason } : null, stops, cashBefore: Math.round(pre.before.cash), cashAfter: Math.round(s.cash), cashDelta: Math.round(s.cash - pre.before.cash),
    stats: { health: d('health'), happiness: d('happiness'), smarts: d('smarts'), looks: d('looks'), fame: d('fame') }, spent: pre.ran.reduce((t, r) => t + (r.cost || 0), 0), line, died: !s.alive };
}
