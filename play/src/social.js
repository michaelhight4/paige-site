// Social media ("Feed"): 8 fictional platforms, post picker, sponsorships, verification, drama/appeal/cancel, fame + reputation, content calendar,
// team, merch business, gear boosts, story events. Data: data/social.json, state: s.social. Ties into the Streamer/Influencer careers (src/online.js):
// LiveLoop mirrors the streamer's subscribers, Snapfolio mirrors the influencer's followers; those two accounts are paid by the careers (no double pay).
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn, spend, addStat } from './core.js';
import * as Skills from './skills.js';
import * as PFx from './premium_fx.js';
import * as Ev from './events.js';
import * as P from './people.js';

const C = () => D.social, TAX = 0.22;
const age = (s) => Math.floor(s.age);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n)));
export const platDef = (id) => C().platforms.find((p) => p.id === id);
export const postDef = (id) => C().posts.find((p) => p.id === id);
const net = (g) => g * (1 - (PFx.noTax() ? 0 : TAX));
export const ensure = (s) => { if (!s.social) s.social = { accounts: {}, reputation: 50, brandSafety: 70, cancelledUntil: 0, history: [], archive: [], plan: {}, streak: 0, burnout: 0, team: {}, offers: {}, prompt: null, earned: 0, last: null, year: {}, ambassador: null, lastSuspend: -99, cancels: 0, merch: null, heldMoney: 0, rivals: [], nextStory: 0 }; return s.social; };
export const has = (s) => !!(s.social && Object.keys(s.social.accounts).length);
export const totalFollowers = (s) => (s.social ? Object.values(s.social.accounts).reduce((a, x) => a + x.followers, 0) : 0);
export const careerOwned = (s, pid) => (pid === 'liveloop' && s.stream && s.stream.active) || (pid === 'snapfolio' && s.infl && s.infl.active);
const teen = (s) => age(s) < 18;

// ---------- age gating ----------
export function gate(s, pid) { const p = platDef(pid), a = age(s); if (a < 13) return 'Social media starts at age 13.'; if (a < p.minAge) return `${p.name} is ${p.minAge}+.`; if (s.prison) return 'No signal in prison.'; return ''; }
export function postGate(s, pid, type) { const t = postDef(type); if (!t) return 'Unknown post.'; if (!t.plats.includes(pid)) return 'Not for this platform.'; const a = age(s); if (a < t.minAge) return `${t.minAge}+ only.`; if (t.mature && a < 18) return '18+ only.'; if (a < 16 && type === 'hottake') return 'Parents blocked that one (16+).'; return ''; }

// ---------- gear (bought in the Creator Gear Hub; assets live in s.sl.assets.gear) ----------
export function gearBoost(s) {
  const own = (s.sl && s.sl.assets && s.sl.assets.gear) || [], best = {}, def = (tpl) => C().gear.find((g) => g.id === tpl);
  for (const a of own) { const d = def(a.tpl); if (!d || (a.cond != null && a.cond <= 0)) continue; if (!best[d.kind] || d.tier > best[d.kind].tier) best[d.kind] = d; }
  const sum = (k) => Object.values(best).reduce((x, g) => x + g[k], 0);
  return { growth: Math.min(0.8, sum('growth')), viral: Math.min(1, sum('viral')), sponsor: Math.min(0.8, sum('sponsor')), items: Object.values(best).map((g) => ({ id: g.id, name: g.name, kind: g.kind, tier: g.tier })) };
}

// ---------- accounts ----------
const mkAcct = (s, pid) => ({ followers: Math.round(8 + s.stats.looks / 6 + Skills.get(s, 'people') / 8 + (careerOwned(s, pid) ? 0 : 0)), engagement: 0.08, niche: null, nicheCounts: {}, postsThisYear: 0, manual: 0, status: 'active', suspendedUntil: 0, verified: false, verifyCooldownUntil: 0, boughtThisYear: false, deals: [], opened: age(s), peak: 0, years: 0, acted: {}, ambassador: false });
export function openAccount(s, pid) {
  const so = ensure(s), why = gate(s, pid); if (why) return { ok: false, msg: why }; if (so.accounts[pid]) return { ok: false, msg: 'You already have an account there.' };
  const a = so.accounts[pid] = mkAcct(s, pid); if (pid === 'liveloop' && s.stream && s.stream.subs) a.followers = Math.max(a.followers, s.stream.subs); if (pid === 'snapfolio' && s.infl && s.infl.followers) a.followers = Math.max(a.followers, s.infl.followers);
  a.peak = a.followers; s.flags.has_social = 1; log(s, `I made a ${platDef(pid).name} account. My first follower was my mother.`, 'fame'); return { ok: true, msg: `Opened ${platDef(pid).name}.` };
}
export function deleteAccount(s, pid) { const so = ensure(s); if (!so.accounts[pid]) return { ok: false, msg: 'No account.' }; if (careerOwned(s, pid)) return { ok: false, msg: 'Your career runs on this account. Quit the career first.' }; delete so.accounts[pid]; delete so.plan[pid]; delete so.offers[pid]; if (!Object.keys(so.accounts).length) delete s.flags.has_social; log(s, `I deleted my ${platDef(pid).name} account. The silence was loud.`, 'fame'); return { ok: true, msg: 'Account deleted.' }; }
const A = (s, pid) => { const a = ensure(s).accounts[pid]; return a || null; };
const active = (s, a) => a.status === 'active' || (a.status === 'suspended' && a.suspendedUntil <= s.age && (a.status = 'active'));
export function fameFromFollowers(n) { return n >= 1000 ? Math.min(60, 12 * Math.log10(n / 1000) + 2) : 0; }
function syncFame(s) { const t = fameFromFollowers(totalFollowers(s)); if (t > s.stats.fame) addStat(s, 'fame', Math.min(t - s.stats.fame, 6)); }
const cap = (s) => (age(s) < 13 ? 0 : 12);
export const postsLeft = (s, pid) => { const a = A(s, pid); return a ? Math.max(0, cap(s) - a.postsThisYear) : 0; };
export function fitOf(pid, type) { const p = platDef(pid), t = postDef(type); let f = 1; for (const st of t.styles) { if (p.likes.includes(st)) f += 0.22; if (p.dislikes.includes(st)) f -= 0.26; } return clamp(f, 0.45, 1.6); }
export const fitLabel = (f) => (f >= 1.15 ? 'great' : f >= 0.9 ? 'ok' : 'poor');
const emult = (a) => clamp(a.engagement / 0.1, 0.4, 2);
export function quality(s, t) {
  const so = ensure(s), st = t.stat === 'happiness' ? s.stats.happiness : s.stats[t.stat] ?? 50; let q = 0.35 * (st / 100) + 0.15 * (s.stats.health / 100) + 0.2 * (s.stats.happiness / 100) + 0.3 * rnd(s);
  if (so.team.editor) q += 0.05; q *= 1 - so.burnout / 220; return clamp(q, 0, 1);
}
function nicheOf(a) { let best = null, n = 0; for (const [k, v] of Object.entries(a.nicheCounts)) if (v > n) { n = v; best = k; } return best; }
function archive(s, pid, t) { const so = ensure(s); if (t.tag === 'Safe' && t.risk < 0.2) return; so.archive.push({ pid, type: t.id, name: t.name, age: s.age, sev: t.tag === 'Risky' ? 2 : 1 }); if (so.archive.length > 40) so.archive.shift(); }

// ---------- posting ----------
export function post(s, pid, type, o = {}) {
  const so = ensure(s), a = A(s, pid), t = postDef(type), p = platDef(pid); if (!a) return { ok: false, msg: 'Open an account first.' };
  if (!active(s, a)) return { ok: false, msg: a.status === 'break' ? 'You are on a break from this platform.' : a.status === 'hacked' ? 'Account hacked: deal with it first.' : 'This account is suspended.' };
  const why = gate(s, pid) || postGate(s, pid, type); if (why) return { ok: false, msg: why };
  if (a.postsThisYear >= cap(s)) return { ok: false, msg: 'Posting limit reached this year (12).' };
  const gb = gearBoost(s), F = a.followers, q = quality(s, t), eff = 1 / (1 + 0.25 * Math.max(0, a.postsThisYear - 5)), fb = 1 + s.stats.fame / 50, niche = nicheOf(a);
  const nm = niche && niche === t.niche ? 1.15 : niche && niche !== t.niche && F > 1000 ? 0.7 : 1, fit = fitOf(pid, type), boost = o.boost || 1;
  let gain = (200 + 0.02 * F) * t.base * (0.5 + q) * eff * fb * nm * fit * p.growth * (1 + gb.growth) * boost * (1 + Math.min(0.2, so.streak * 0.03)) * (so.burnout > 80 ? 0.7 : 1);
  const vp = Math.min(0.15, t.viral * p.viral * (0.5 + q) * (a.engagement + 0.5) * (1 + gb.viral)), viral = chance(s, vp);
  if (viral) { gain *= rint(s, 5, 25); addStat(s, 'fame', rint(s, 1, 3)); }
  let loss = 0; const off = nm < 1, risky = t.tag === 'Risky', rl = (off ? 0.06 : 0) + t.risk * p.risk * 0.5 + (risky ? 0.05 : 0);
  if (!viral && chance(s, Math.min(0.6, rl))) loss = Math.round(F * (0.01 + rnd(s) * 0.07));
  const delta = Math.round(gain) - loss; a.followers = Math.max(0, F + delta); a.peak = Math.max(a.peak, a.followers); a.postsThisYear++; if (!o.planned) a.manual++;
  a.nicheCounts[t.niche] = (a.nicheCounts[t.niche] || 0) + 1; const Qavg = (q + 0.5) / 2; a.engagement = clamp(0.06 + 0.1 * Qavg * 0.6 + 0.05 * (nicheOf(a) === t.niche ? 1 : 0.3) - a.followers / 1e8 + (a.engagement - 0.08) * 0.5, 0.02, 0.25);
  const likes = Math.round(a.followers * a.engagement * (0.6 + rnd(s) * 0.8) * (viral ? 6 : 1)), comments = Math.round(likes * (0.05 + rnd(s) * 0.1));
  so.burnout = clamp(so.burnout + (a.postsThisYear > 6 ? 2.2 : 0.6) * (so.team.editor ? 0.6 : 1), 0, 100); if (!o.planned) addStat(s, 'stress', a.postsThisYear > 8 ? 1 : 0);
  if (type === 'hottake' || type === 'rant') addStat(s, 'karma', -1); if (type === 'charity') { addStat(s, 'karma', 2); so.reputation = clamp(so.reputation + 1.5, 0, 100); }
  if (t.mature) so.brandSafety = clamp(so.brandSafety - 6, 0, 100); else if (t.tag === 'Risky') so.brandSafety = clamp(so.brandSafety - 2, 0, 100);
  if (careerOwned(s, pid)) { if (pid === 'liveloop' && s.stream) s.stream.subs = Math.max(s.stream.subs, a.followers); if (pid === 'snapfolio' && s.infl) s.infl.followers = Math.max(s.infl.followers, a.followers); }
  Skills.use(s, 'creativity', 0.4); archive(s, pid, t); syncFame(s);
  let drama = null; const dp = (t.risk * p.risk * (so.team.manager ? 0.7 : 1) * (a.verified ? 0.7 : 1)) * (0.5 + Math.log10(a.followers + 10) / 8);
  if (!so.prompt && !o.planned && chance(s, Math.min(0.5, dp * 0.45))) drama = makeDrama(s, pid, t);
  const res = { ok: true, pid, type, likes, comments, delta, viral, loss, fit: fitLabel(fit), msg: `${t.name} on ${p.name}: ${delta >= 0 ? '+' : ''}${delta} followers, ${fmt(likes)} likes${viral ? ' (VIRAL!)' : ''}.`, drama: !!drama };
  so.history.push({ age: age(s), pid, type, delta, viral }); if (so.history.length > 60) so.history.shift(); so.year.last = res;
  if (viral) log(s, `My ${t.name.toLowerCase()} on ${p.name} went viral: +${fmt(delta)} followers.`, 'fame');
  return res;
}
function makeDrama(s, pid, t) {
  const so = ensure(s), p = platDef(pid); const who = pick(s, ['a stranger', 'a rival creator', 'a former friend', 'an anonymous account']);
  so.prompt = { kind: 'drama', pid, text: `${who} on ${p.name} is attacking your ${t.name.toLowerCase()} in the replies. It is spreading.`, choices: [{ label: 'Ignore it' }, { label: 'Block them' }, { label: 'Fight back' }, { label: 'Offer to talk it out' }] };
  return so.prompt;
}
export function resolvePrompt(s, i) {
  const so = ensure(s), pr = so.prompt; if (!pr) return { ok: false, msg: 'Nothing to answer.' }; const a = A(s, pr.pid), p = platDef(pr.pid); let msg = ''; so.prompt = null;
  if (pr.kind === 'drama') {
    if (i === 0) { if (chance(s, 0.25)) { lose(s, a, 0.02); msg = 'Ignoring it cost a few followers.'; } else msg = 'It blew over.'; }
    else if (i === 1) { msg = 'Blocked. The comments went quiet.'; addStat(s, 'stress', -2); }
    else if (i === 2) { addStat(s, 'karma', -4); a && (a.abuse = true); if (chance(s, 0.5)) { a.followers = Math.round(a.followers * 1.04); addStat(s, 'fame', 1); msg = 'Your clapback landed. Fans cheered.'; } else { lose(s, a, 0.05); so.reputation = clamp(so.reputation - 5, 0, 100); msg = 'Your clapback was screenshotted for all the wrong reasons.'; } if (a && chance(s, 0.12)) { suspend(s, pr.pid, 'abuse'); msg += ' You were suspended.'; } }
    else { if (chance(s, 0.6)) { so.reputation = clamp(so.reputation + 3, 0, 100); msg = 'You talked it out. People noticed the maturity.'; } else msg = 'They did not want to talk.'; }
  } else if (pr.kind === 'appeal') {
    const guilty = !!pr.guilty, pOk = [guilty ? 0.75 : 0.5, guilty ? 0.3 : 0.7, 0.3, 0.08][i] ?? 0.2;
    if (chance(s, pOk)) { a.status = 'active'; a.suspendedUntil = 0; msg = 'Appeal granted. You are back.'; so.lastSuspend = s.age - 1; } else { const y = rint(s, 1, 2); a.suspendedUntil = s.age + y; msg = `Appeal denied: suspended for ${y} year${y > 1 ? 's' : ''}.`; }
  } else if (pr.kind === 'cancel') {
    if (i === 0) { so.reputation = clamp(so.reputation + 8, 0, 100); recover(s, 0.06); msg = 'You apologized. Reputation recovers slowly.'; }
    else if (i === 1) { if (chance(s, 0.4)) { addStat(s, 'fame', 5); so.reputation -= 6; recover(s, 0.12); msg = 'Doubling down worked, mostly.'; } else { so.reputation = clamp(so.reputation - 12, 0, 100); loseAll(s, 0.1); msg = 'Doubling down made it much worse.'; } }
    else if (i === 2) { so.cancelledUntil = s.age + 1; for (const x of Object.values(so.accounts)) { x.status = x.status === 'active' ? 'break' : x.status; x.breakUntil = s.age + 1; } msg = 'You went dark for a year.'; }
    else { if (s.cash >= 5000) { s.cash -= 5000; so.reputation = clamp(so.reputation + 5, 0, 100); msg = 'The lawyers cleaned it up ($5,000).'; } else { msg = 'You could not afford the lawyers.'; so.prompt = pr; return { ok: false, msg }; } }
  } else if (pr.kind === 'hack') {
    if (i === 0) { a.status = 'active'; msg = 'Reported. Platform restored the account.'; } else if (i === 1) { a.status = 'active'; lose(s, a, 0.08); msg = 'You ignored it; the hacker kept posting for a while.'; } else if (s.cash >= 2000) { s.cash -= 2000; a.status = 'active'; msg = 'Ransom paid ($2,000). They actually gave it back.'; } else { msg = 'You could not pay.'; so.prompt = pr; return { ok: false, msg }; }
  }
  log(s, msg, 'fame'); return { ok: true, msg, p: p && p.id };
}
const lose = (s, a, f) => { if (a) a.followers = Math.max(0, Math.round(a.followers * (1 - f))); };
const loseAll = (s, f) => { for (const a of Object.values(ensure(s).accounts)) lose(s, a, f); };
const recover = (s, f) => { for (const a of Object.values(ensure(s).accounts)) a.followers = Math.round(a.followers * (1 + f)); };
export function suspend(s, pid, why) {
  const so = ensure(s), a = A(s, pid); if (!a) return; a.status = 'suspended'; a.suspendedUntil = s.age + rint(s, 1, 2); so.lastSuspend = s.age; a.verified = false;
  so.prompt = { kind: 'appeal', pid, guilty: why === 'abuse' || why === 'spam', text: `${platDef(pid).name} suspended your account (${why}). How do you appeal?`, choices: [{ label: 'Apologize' }, { label: 'Explain what happened' }, { label: 'Act confused' }, { label: 'Threaten them' }] };
  log(s, `My ${platDef(pid).name} account was suspended (${why}).`, 'fame');
}
export function cancel(s, why) {
  const so = ensure(s); so.cancels++; const f = 0.1 + rnd(s) * 0.3 * (so.team.manager ? 0.7 : 1); loseAll(s, f); so.reputation = clamp(so.reputation - rint(s, 15, 40), 0, 100); const n = Object.values(so.accounts).reduce((m, a) => m + a.deals.length, 0);
  for (const a of Object.values(so.accounts)) { a.deals = []; a.verified = a.verified && chance(s, 0.5); } so.ambassador = null; addStat(s, 'happiness', -10); addStat(s, 'fame', -3); if (s.stream && s.stream.active) s.stream.subs = Math.round(s.stream.subs * (1 - f)); if (s.infl && s.infl.active) s.infl.followers = Math.round(s.infl.followers * (1 - f));
  so.prompt = { kind: 'cancel', pid: Object.keys(so.accounts)[0], text: `You have been cancelled (${why}). Followers fled${n ? ' and ' + n + ' sponsor deal(s) vanished' : ''}. How do you respond?`, choices: [{ label: 'Apologize' }, { label: 'Double down' }, { label: 'Go dark for a year' }, { label: 'Lawyer up ($5,000)' }] };
  log(s, `I was cancelled (${why}).`, 'fame');
}

// ---------- actions ----------
const need = (s, pid, key) => { const a = A(s, pid); if (!a) return 'No account.'; if (a.acted[key]) return 'Already done this year.'; if (!active(s, a)) return 'Account not active.'; return ''; };
export function reply(s, pid) { const w = need(s, pid, 'reply'); if (w) return { ok: false, msg: w }; const a = A(s, pid); a.acted.reply = 1; a.engagement = clamp(a.engagement + 0.015, 0.02, 0.25); const g = Math.round(a.followers * 0.01 + 5); a.followers += g; ensure(s).reputation = clamp(ensure(s).reputation + 0.5, 0, 100); return { ok: true, msg: `You answered comments: engagement up, +${g} followers.` }; }
export function buyBoost(s, pid, pack = 1) {
  const w = need(s, pid, 'boost'); if (w) return { ok: false, msg: w }; const a = A(s, pid), k = [1, 5, 20][pack] ?? 1, cost = k * 20; if (s.cash < cost) return { ok: false, msg: `Costs ${money(cost)}.` }; if (age(s) < 16) return { ok: false, msg: 'Under 16: no card on file.' };
  s.cash -= cost; a.acted.boost = 1; a.boughtThisYear = true; a.followers += k * 1000; a.engagement = clamp(a.engagement * 0.8, 0.02, 0.25); let m = `+${k * 1000} followers for ${money(cost)}. Engagement dips.`;
  if (chance(s, 0.25)) { suspend(s, pid, 'spam'); m += ' The platform noticed: suspended.'; } log(s, `I bought ${k}k followers. Most of them were bots.`, 'fame'); return { ok: true, msg: m };
}
export function collab(s, pid) {
  const w = need(s, pid, 'collab'); if (w) return { ok: false, msg: w }; const a = A(s, pid), so = ensure(s), who = pick(s, C().rivals); a.acted.collab = 1; addStat(s, 'stress', 2);
  if (chance(s, 0.1)) { so.reputation = clamp(so.reputation - 4, 0, 100); lose(s, a, 0.02); return { ok: true, msg: `${who} turned the collab into a beef. -2% followers.` }; }
  const g = Math.round(a.followers * (0.03 + rnd(s) * 0.09) + 40); a.followers += g; addStat(s, 'fame', 1); log(s, `I did a collab with ${who}: +${fmt(g)} followers.`, 'fame'); return { ok: true, msg: `Collab with ${who}: +${fmt(g)} followers.` };
}
export function takeBreak(s, pid) { const a = A(s, pid); if (!a) return { ok: false, msg: 'No account.' }; if (a.status === 'break') { a.status = 'active'; return { ok: true, msg: 'You are back online.' }; } if (a.status !== 'active') return { ok: false, msg: 'Not available.' }; a.status = 'break'; a.breakUntil = s.age + 1; ensure(s).burnout = clamp(ensure(s).burnout - 15, 0, 100); addStat(s, 'stress', -4); return { ok: true, msg: 'On break until next year: burnout down.' }; }

// ---------- sponsorships ----------
export const maxDeals = (a) => (a.verified ? 4 : 3);
export function genOffers(s, pid) {
  const so = ensure(s), a = A(s, pid), p = platDef(pid); if (!a || a.followers < 5000 || age(s) < 13 || p.id === 'velvet') { so.offers[pid] = []; return; }
  const gb = gearBoost(s), n = rint(s, 1, 3) + (so.team.agent ? 1 : 0), out = [], used = new Set(a.deals.map((d) => d.brand));
  let pool = C().brands.filter((b) => age(s) >= b.minAge && (age(s) >= 18 || b.kidSafe) && !used.has(b.name) && (!b.premium || so.brandSafety >= 60 || true));
  if (so.brandSafety < 40) pool = pool.filter((b) => !b.premium); if (age(s) >= 18 && so.brandSafety < 40) pool = pool.concat(C().brands.filter((b) => b.cat === 'dubious'));
  for (let i = 0; i < n && pool.length; i++) {
    const b = pool.splice(Math.floor(rnd(s) * pool.length), 1)[0], nic = nicheOf(a), fit = nic && b.niches.includes(nic) ? 1.5 : b.niches.some((x) => Object.keys(a.nicheCounts).includes(x)) ? 1 : 0.5;
    const pay = Math.round(a.followers / 1000 * 8 * emult(a) * fit * b.pay * p.sponsor * (a.verified ? 1.2 : 1) * (so.brandSafety >= 75 ? 1.3 : 1) * (1 + gb.sponsor) * (so.team.agent ? 1.15 : 1) * (so.team.manager ? 1.1 : 1) * (0.85 + rnd(s) * 0.3) / 10) * 10;
    out.push({ id: i, brand: b.name, cat: b.cat, pay: Math.max(40, pay), fit: fit >= 1.5 ? 'great' : fit >= 1 ? 'ok' : 'poor', yrs: rint(s, 1, 2) });
  }
  so.offers[pid] = out;
}
export function acceptOffer(s, pid, id) {
  const so = ensure(s), a = A(s, pid), o = (so.offers[pid] || []).find((x) => x.id === id); if (!a || !o) return { ok: false, msg: 'That offer is gone.' }; if (a.followers < 5000) return { ok: false, msg: 'Sponsorships open at 5k followers.' }; if (a.deals.length >= maxDeals(a)) return { ok: false, msg: 'Deal limit reached.' };
  if (so.ambassador && so.ambassador.exclusive) return { ok: false, msg: `Exclusive with ${so.ambassador.brand}: no other deals.` };
  so.offers[pid] = so.offers[pid].filter((x) => x.id !== id); a.deals.push({ brand: o.brand, pay: o.pay, yrsLeft: o.yrs, fit: o.fit }); log(s, `${o.brand} signed me for ${money(o.pay)} a year on ${platDef(pid).name}.`, 'fame'); return { ok: true, msg: `${o.brand}: ${money(o.pay)}/yr.` };
}
export const declineOffer = (s, pid, id) => { const so = ensure(s); so.offers[pid] = (so.offers[pid] || []).filter((x) => x.id !== id); return { ok: true, msg: 'Declined.' }; };
export function ambassador(s, pid) {
  const so = ensure(s), a = A(s, pid); if (!a || a.followers < 500000) return { ok: false, msg: 'Brand ambassador needs 500k followers.' }; if (so.ambassador) return { ok: false, msg: 'You already have an ambassador deal.' }; if (age(s) < 18) return { ok: false, msg: '18+.' };
  const b = pick(s, C().brands.filter((x) => x.kidSafe)); const pay = Math.round(a.followers / 1000 * 20 * emult(a)); so.ambassador = { brand: b.name, pay, exclusive: true, pid, yrs: 3 }; a.deals = []; log(s, `I became ${b.name}'s brand ambassador for ${money(pay)} a year (exclusive).`, 'fame'); return { ok: true, msg: `${b.name} ambassador: ${money(pay)}/yr, exclusive. Ending it early costs a penalty.` };
}
export function endAmbassador(s) { const so = ensure(s); if (!so.ambassador) return { ok: false, msg: 'None.' }; const pen = Math.round(so.ambassador.pay * 0.5); spend(s, pen); so.ambassador = null; return { ok: true, msg: `Ended early: penalty ${money(pen)}.` }; }

// ---------- verification ----------
export function verifyInfo(s, pid) {
  const so = ensure(s), a = A(s, pid), p = platDef(pid); if (!a) return null; const reqF = Math.round(100000 * p.verify), famReq = 20, clean = s.age - so.lastSuspend >= 2, cool = a.verifyCooldownUntil > s.age;
  const rF = Math.min(1, a.followers / reqF), rM = Math.min(1, s.stats.fame / famReq), rC = clean ? 1 : 0, progress = Math.round(((rF + rM + rC) / 3) * 100), chanceOk = clamp(0.6 + s.stats.fame / 500 + (so.reputation - 50) / 300, 0.1, 0.95);
  return { verified: a.verified, reqFollowers: reqF, followers: a.followers, reqFame: famReq, fame: Math.round(s.stats.fame), clean, cooldown: cool ? Math.ceil(a.verifyCooldownUntil - s.age) : 0, progress, eligible: rF >= 1 && rM >= 1 && clean && !cool, chance: Math.round(chanceOk * 100) };
}
export function applyVerify(s, pid) {
  const a = A(s, pid), v = verifyInfo(s, pid); if (!a) return { ok: false, msg: 'No account.' }; if (a.verified) return { ok: false, msg: 'Already verified.' }; if (!v.eligible) return { ok: false, msg: v.cooldown ? `Rejected recently: wait ${v.cooldown} yr.` : 'Requirements not met yet.' };
  if (chance(s, v.chance / 100)) { a.verified = true; addStat(s, 'fame', 3); ensure(s).reputation = clamp(ensure(s).reputation + 3, 0, 100); log(s, `My ${platDef(pid).name} account got VERIFIED.`, 'fame'); return { ok: true, won: true, msg: 'Verified! Sponsors +20%, trolls -30%.' }; }
  a.verifyCooldownUntil = s.age + 1; return { ok: true, won: false, msg: 'Application rejected. Try again in a year.' };
}

// ---------- team, calendar ----------
export function hire(s, role) { const so = ensure(s), r = C().team.find((x) => x.id === role); if (!r) return { ok: false, msg: 'Unknown role.' }; if (so.team[role]) return { ok: false, msg: 'Already hired.' }; if (age(s) < 18) return { ok: false, msg: 'Adults only.' }; if (totalFollowers(s) < r.minFollowers) return { ok: false, msg: `Needs ${fmt(r.minFollowers)} total followers.` }; so.team[role] = { name: pick(s, C().teamNames), salary: r.salary, since: age(s) }; log(s, `I hired ${so.team[role].name} as my ${r.name.toLowerCase()}.`, 'fame'); return { ok: true, msg: `Hired ${so.team[role].name} (${r.name}).` }; }
export function fireTeam(s, role) { const so = ensure(s); if (!so.team[role]) return { ok: false, msg: 'Nobody there.' }; const n = so.team[role].name; delete so.team[role]; return { ok: true, msg: `${n} let go.` }; }
export function setPlan(s, pid, n, type) { const so = ensure(s), a = A(s, pid); if (!a) return { ok: false, msg: 'No account.' }; n = clamp(Math.round(n), 0, 12); if (!n) { delete so.plan[pid]; return { ok: true, msg: 'Plan cleared.' }; } const t = type || (so.plan[pid] && so.plan[pid].type) || C().posts.find((x) => x.plats.includes(pid) && age(s) >= x.minAge && !x.mature).id; if (postGate(s, pid, t)) return { ok: false, msg: 'That post type is not allowed here.' }; so.plan[pid] = { n, type: t }; return { ok: true, msg: `Plan: ${n} ${postDef(t).name.toLowerCase()} posts a year on ${platDef(pid).name}.` }; }

// ---------- merch / channel business (tied to the existing business system) ----------
export function canMerch(s, type) { const t = D.bizTypes[type]; if (!t) return 'Unknown.'; const need = (t.req && t.req.followers) || 0; if (totalFollowers(s) < need) return `Needs ${fmt(need)} total followers`; return ''; }
const BIZ_TYPES = ['creator_merch', 'creator_channel'];
export function biz(s) { return s.biz.filter((b) => BIZ_TYPES.includes(b.type)); }

// ---------- yearly tick ----------
function careerSync(s, up) {
  const so = ensure(s), L = so.accounts.liveloop, S = so.accounts.snapfolio;
  if (up) { if (s.stream && s.stream.active) { if (!L) { so.accounts.liveloop = mkAcct(s, 'liveloop'); so.accounts.liveloop.followers = s.stream.subs; s.flags.has_social = 1; } else L.followers = Math.max(L.followers, s.stream.subs); }
    if (s.infl && s.infl.active) { if (!S) { so.accounts.snapfolio = mkAcct(s, 'snapfolio'); so.accounts.snapfolio.followers = s.infl.followers; s.flags.has_social = 1; } else S.followers = Math.max(S.followers, s.infl.followers); } }
  else { if (s.stream && s.stream.active && so.accounts.liveloop) s.stream.subs = Math.max(s.stream.subs, so.accounts.liveloop.followers); if (s.infl && s.infl.active && so.accounts.snapfolio) s.infl.followers = Math.max(s.infl.followers, so.accounts.snapfolio.followers); }
  for (const [pid, a] of Object.entries(so.accounts)) { if (pid === 'liveloop' && s.stream && s.stream.active) a.followers = Math.max(a.followers, s.stream.subs); if (pid === 'snapfolio' && s.infl && s.infl.active) a.followers = Math.max(a.followers, s.infl.followers); }
}
export function yearTick(s) {
  if (age(s) < 13) return; const so = ensure(s); careerSync(s, true); if (!Object.keys(so.accounts).length) return;
  const res = { age: age(s), income: 0, parts: {}, events: [], before: totalFollowers(s) }; let planOk = true, planCount = 0, totalPosts = 0;
  if (so.prompt) { log(s, 'I ignored the drama and it resolved itself, mostly.', 'fame'); so.prompt = null; }
  for (const a of Object.values(so.accounts)) { if (a.status === 'hacked') { a.status = 'active'; lose(s, a, 0.05); } if (a.status === 'break' && a.breakUntil && a.breakUntil <= s.age) a.status = 'active'; if (a.status === 'suspended' && a.suspendedUntil <= s.age) a.status = 'active'; }
  if (so.cancelledUntil && so.cancelledUntil <= s.age) so.cancelledUntil = 0;
  const gb = gearBoost(s);
  // calendar
  for (const [pid, pl] of Object.entries(so.plan)) { const a = so.accounts[pid]; if (!a || !active(s, a)) { planOk = false; continue; } planCount++; let done = 0; for (let i = 0; i < pl.n; i++) { const r = post(s, pid, pl.type, { planned: true }); if (r.ok) done++; else break; } if (done < pl.n) planOk = false; }
  if (planCount) { so.streak = planOk ? so.streak + 1 : 0; if (planOk && so.streak >= 3) res.events.push(`Consistency streak: ${so.streak} years`); } else so.streak = 0;
  for (const a of Object.values(so.accounts)) totalPosts += a.postsThisYear;
  // burnout
  const over = Math.max(0, totalPosts - 18), plat = Object.values(so.accounts).some((a) => a.postsThisYear > 10);
  so.burnout = clamp(so.burnout - 8 + over * 2.2 + (plat && s.stats.stress > 60 ? 8 : 0) - (so.team.editor ? 5 : 0) - (totalPosts < 6 ? 4 : 0), 0, 100); if (so.burnout >= 80) { res.events.push('BURNOUT: quality and growth suffer'); addStat(s, 'happiness', -4); addStat(s, 'health', -2); log(s, 'Posting nonstop wore me out. My followers could tell.', 'fame'); }
  const others = Object.values(so.accounts).filter((a) => a.followers > 1000).length;
  let gross = 0;
  for (const [pid, a] of Object.entries(so.accounts)) {
    const p = platDef(pid); if (a.status === 'break' && a.breakUntil && a.breakUntil <= s.age) a.status = 'active'; if (a.status === 'suspended' && a.suspendedUntil <= s.age) a.status = 'active';
    if (a.status === 'hacked') a.status = 'active';
    const own = careerOwned(s, pid), before = a.followers;
    if (a.status === 'active' || a.status === 'break') {
      let g = 1 + (a.engagement - 0.3) * 0.1 - (a.postsThisYear < 2 ? 0.03 : 0); if (planCount) g += Math.min(0.12, so.streak * 0.02); g += Math.max(0, others - 1) * 0.01 * (a.followers > 1000 ? 1 : 0) + gb.growth * 0.15; if (so.burnout > 80) g -= 0.04;
      a.followers = Math.max(0, Math.round(a.followers * g)); if (a.status === 'break') a.followers = Math.round(a.followers * 0.97);
    } else a.followers = Math.round(a.followers * 0.93);
    // income
    if (!own && a.status !== 'suspended' && age(s) >= p.minAge) {
      const E = emult(a), ads = ['vidnest', 'clipwave'].includes(pid) && a.followers >= 10000 ? a.followers * 0.4 * E : 0;
      const subOk = (pid === 'liveloop' && age(s) >= 16 && a.followers >= 1000) || (pid === 'velvet' && age(s) >= 18), subs = subOk ? a.followers * 0.01 * a.engagement / 0.1 * 4 * 12 * (pid === 'velvet' ? 2 : 1) : 0;
      let spons = 0; for (const d of a.deals) { spons += d.pay; d.yrsLeft--; if (d.fit === 'poor' && chance(s, 0.4)) { lose(s, a, 0.02 + rnd(s) * 0.04); res.events.push(`${d.brand}: poor fit cost followers`); } } a.deals = a.deals.filter((d) => d.yrsLeft > 0 || (res.events.push(`${d.brand} deal ended`), false));
      const donations = pid === 'liveloop' && age(s) >= 16 ? a.followers * 0.02 * E : 0; const g2 = ads + subs + spons + donations; gross += g2; res.parts[p.name] = Math.round(g2);
    } else if (own) for (const d of a.deals) d.yrsLeft = 0;
    if (a.followers >= 10000 && !a.m10k) { a.m10k = 1; log(s, `I passed 10,000 followers on ${p.name}.`, 'fame'); } if (a.followers >= 1e6 && !a.m1m) { a.m1m = 1; log(s, `One million followers on ${p.name}.`, 'fame'); }
    a.peak = Math.max(a.peak, a.followers); a.years++; a.postsThisYear = 0; a.manual = 0; a.acted = {}; a.boughtThisYear = false; a.abuse = false; res[pid] = a.followers - before;
    if (so.accounts[pid]) genOffers(s, pid);
  }
  if (so.ambassador) { gross += so.ambassador.pay; so.ambassador.yrs--; if (so.ambassador.yrs <= 0) { res.events.push(`${so.ambassador.brand} ambassador deal ended`); so.ambassador = null; } }
  // merch / channel businesses ride on your following
  const tf = totalFollowers(s); for (const b of biz(s)) { const floor = clamp(30 + 14 * Math.log10(1 + tf / 1000), 0, 90); b.rep = Math.max(b.rep, Math.min(95, floor)); b.socialBoost = Math.round(floor); }
  // team
  let cost = 0; for (const [r, m] of Object.entries(so.team)) { const d = C().team.find((x) => x.id === r); cost += m.salary; if (d.cut) { const c = gross * d.cut; cost += c; } } gross = Math.max(0, gross);
  let incomeNet = net(gross); if (teen(s)) { const held = incomeNet * 0.5; incomeNet -= held; res.events.push('Under 18: parents took half of the payouts'); }
  earn(s, incomeNet); spend(s, cost); if (so.jobIncome) { earn(s, net(so.jobIncome)); res.parts['Media job'] = so.jobIncome; } res.income = Math.round(incomeNet - cost); so.earned += incomeNet - cost; so.reputation = clamp(so.reputation + (50 - so.reputation) * 0.04 + (so.brandSafety < 40 ? -1 : 0), 0, 100); so.brandSafety = clamp(so.brandSafety + 4, 0, 100);
  // fame: decays unless posting 3+/yr (handled by core -2/yr); give back when active
  if (totalPosts >= 3) addStat(s, 'fame', 2 * (s.stats.fame > 5 ? 1 : 0)); syncFame(s); careerSync(s, false);
  res.after = totalFollowers(s); so.last = res; stories(s, res);
  log(s, `Social media year: ${fmt(res.after)} followers across ${Object.keys(so.accounts).length} platforms, ${res.income >= 0 ? 'earned' : 'spent'} ${money(Math.abs(res.income))}.`, 'fame');
}
function pickAcct(s) { const l = Object.entries(ensure(s).accounts).sort((a, b) => b[1].followers - a[1].followers); return l[0]; }
function stories(s, res) {
  const so = ensure(s), top = pickAcct(s); if (!top) return; const [pid, a] = top, F = totalFollowers(s), rival = pick(s, C().rivals), ctx = { rival, collab: pick(s, C().rivals), plat: platDef(pid).name, parent: (P.living(s).find((p) => p.rel === 'mother' || p.rel === 'father') || { first: 'my mother' }).first, partner: P.partnerOf(s) ? P.partnerOf(s).first : 'my partner' };
  if (s.pending.length >= 2) return;
  const q = (id, p) => { if (chance(s, p)) { Ev.queue(s, id, ctx); return true; } return false; };
  if (a.followers > 2000 && so.archive.length) { const old = so.archive.filter((x) => s.age - x.age >= 2); if (old.length && chance(s, 0.06 + 0.02 * old.length * (s.flags.pol_running ? 3 : 1))) { const x = pick(s, old); ctx.post = x.name.toLowerCase(); ctx.postAge = Math.floor(x.age); ctx.plat = platDef(x.pid).name; so.archive.splice(so.archive.indexOf(x), 1); Ev.queue(s, 'soc_resurface', ctx); return; } }
  if (F > 3000 && q('soc_feud', 0.07)) return; if (F > 3000 && q('soc_collab', 0.08)) return; if (F > 1000 && P.living(s).some((p) => p.rel === 'mother' || p.rel === 'father') && q('soc_family', 0.07)) return;
  if (F > 1000 && P.partnerOf(s) && q('soc_partner', 0.08)) return; if (F > 8000 && q('soc_shoutout', 0.06)) return; if (F > 10000 && age(s) >= 18 && q('soc_agency', 0.04)) return;
  if (F > 20000 && age(s) >= 16 && age(s) <= 18 && s.school && q('soc_scholarship', 0.35)) return; if (F > 50000 && age(s) >= 18 && q('soc_job', 0.05)) return;
  if (a.followers > 5000 && a.status === 'active' && chance(s, 0.03)) { a.status = 'hacked'; so.prompt = { kind: 'hack', pid, text: `Your ${platDef(pid).name} account was hacked.`, choices: [{ label: 'Report it' }, { label: 'Ignore it' }, { label: 'Pay the ransom ($2,000)' }] }; lose(s, a, 0.05 + rnd(s) * 0.1); }
  else if (a.followers > 500 && chance(s, 0.07 * (platDef(pid).risk)) && !so.prompt) makeDrama(s, pid, postDef('rant'));
  if (!so.prompt && chance(s, 0.015) && a.followers > 1000) suspend(s, pid, 'a random sweep');
}
const fxHandlers = { followersPct(s, v) { const so = ensure(s); for (const a of Object.values(so.accounts)) a.followers = Math.max(0, Math.round(a.followers * (1 + v / 100))); if (s.stream && s.stream.active) s.stream.subs = Math.max(1, Math.round(s.stream.subs * (1 + v / 100))); if (s.infl && s.infl.active) s.infl.followers = Math.max(1, Math.round(s.infl.followers * (1 + v / 100))); },
  rep(s, v) { const so = ensure(s); so.reputation = clamp(so.reputation + v, 0, 100); }, safety(s, v) { const so = ensure(s); so.brandSafety = clamp(so.brandSafety + v, 0, 100); }, burnout(s, v) { const so = ensure(s); so.burnout = clamp(so.burnout + v, 0, 100); },
  cancel(s) { cancel(s, 'a resurfaced post'); }, scholarship(s, v) { addScholarship(s, v); }, job(s, v) { s.social.jobIncome = (s.social.jobIncome || 0) + v; } };
function addScholarship(s, pct) { const sch = (s.sch = s.sch || { clubs: [], clubYears: {}, service: 0, gpa: [], active: [], applied: {}, serviceYear: -1, renewed: {} }); s.awards = s.awards || []; sch.active.push({ id: 'creator_scholarship', name: 'Creator Scholarship', pct: pct / 100, basePct: pct / 100, yearsLeft: 4, level: 'college', awardedAt: age(s), kind: 'merit', renewals: 0, probation: 0 }); s.awards.push({ id: 'sch_creator', age: age(s), text: 'Creator Scholarship' }); }
export function eventFx(s, o) { ensure(s); for (const [k, v] of Object.entries(o)) if (fxHandlers[k]) fxHandlers[k](s, v); }
export function jobPay(s) { return s.social ? s.social.jobIncome || 0 : 0; }

// ---------- status for the UI ----------
export function status(s) {
  const so = ensure(s), a = age(s), gb = gearBoost(s);
  return { age: a, locked: a < 13, cash: Math.round(s.cash), fame: Math.round(s.stats.fame), reputation: Math.round(so.reputation), brandSafety: Math.round(so.brandSafety), burnout: Math.round(so.burnout), streak: so.streak, cancelledUntil: so.cancelledUntil, cancels: so.cancels, total: totalFollowers(s), earned: Math.round(so.earned), last: so.last, prompt: so.prompt ? { kind: so.prompt.kind, text: so.prompt.text, choices: so.prompt.choices, pid: so.prompt.pid } : null, ambassador: so.ambassador, teen: a < 18,
    gear: gb, team: Object.entries(so.team).map(([r, m]) => ({ role: r, name: m.name, salary: m.salary })), teamDefs: C().team.map((t) => ({ ...t, hired: !!so.team[t.id], locked: totalFollowers(s) < t.minFollowers || a < 18 })),
    platforms: C().platforms.map((p) => { const ac = so.accounts[p.id], g = gate(s, p.id); return { id: p.id, name: p.name, icon: p.icon, role: p.role, minAge: p.minAge, personality: p.personality, audience: p.audience, likes: p.likes, dislikes: p.dislikes, locked: !!g, lockReason: g, open: !!ac, career: careerOwned(s, p.id), followers: ac ? ac.followers : 0, engagement: ac ? Math.round(ac.engagement * 1000) / 10 : 0, status: ac ? ac.status : null, verified: ac ? ac.verified : false, postsLeft: ac ? postsLeft(s, p.id) : 0, niche: ac ? nicheOf(ac) : null, deals: ac ? ac.deals.length : 0, plan: so.plan[p.id] || null }; }),
    merch: biz(s).map((b) => ({ id: b.id, name: b.name, type: b.type })), canMerch: ['creator_merch', 'creator_channel'].map((t) => ({ type: t, name: D.bizTypes[t].name, why: canMerch(s, t) || (a < 16 ? 'Must be 16+' : ''), need: (D.bizTypes[t].req || {}).followers, have: !!biz(s).find((b) => b.type === t) })) };
}
export function platformStatus(s, pid) {
  const so = ensure(s), a = A(s, pid), p = platDef(pid); if (!p) return null; const ps = status(s).platforms.find((x) => x.id === pid);
  return { ...ps, followersFmt: fmt(ps.followers), posts: C().posts.filter((t) => t.plats.includes(pid)).map((t) => { const why = a ? postGate(s, pid, t.id) : 'No account'; const f = fitOf(pid, t.id); return { id: t.id, name: t.name, icon: t.icon, tag: t.tag, niche: t.niche, fit: fitLabel(f), locked: !!why && age(s) < t.minAge || (t.mature && age(s) < 18), reason: why, minAge: t.minAge }; }),
    offers: so.offers[pid] || [], deals: a ? a.deals.map((d, i) => ({ i, ...d })) : [], maxDeals: a ? maxDeals(a) : 3, canSponsor: !!a && a.followers >= 5000, verify: verifyInfo(s, pid), done: a ? { ...a.acted } : {}, plan: so.plan[pid] || null, careerOwned: careerOwned(s, pid), ambassadorOk: !!a && a.followers >= 500000 && age(s) >= 18, ambassadorDeal: so.ambassador && so.ambassador.pid === pid ? so.ambassador : null, suspendedYears: a && a.status === 'suspended' ? Math.max(0, Math.ceil(a.suspendedUntil - s.age)) : 0, nicheCounts: a ? a.nicheCounts : {}, cash: Math.round(s.cash), age: age(s) };
}
export const headlineExtra = (s) => (s.social && s.social.accounts && Object.values(s.social.accounts).some((a) => a.verified) ? 'Verified creator' : null);

// ---------- live stream chat (Streamer career): chat reacts to each choice ----------
export function chatStart(s) {
  const st = s.stream; if (!st || !st.active) return { ok: false, msg: 'Start streaming first.' }; if (st.bannedUntil > s.age) return { ok: false, msg: 'Channel suspended.' }; st.chatDone = st.chatDone || 0; if (st.chatYear !== age(s)) { st.chatYear = age(s); st.chatDone = 0; }
  if (st.chatDone >= 3) return { ok: false, msg: 'Three live sessions a year is plenty.' }; const sc = pick(s, C().chat.scenes); st.chat = { scene: sc.id, lines: [], done: false }; return { ok: true, msg: sc.prompt };
}
export const chatScene = (s) => { const st = s.stream; if (!st || !st.chat) return null; const sc = C().chat.scenes.find((x) => x.id === st.chat.scene); return { id: sc.id, prompt: sc.prompt, choices: sc.choices.map((c) => ({ label: c.label, tone: c.tone })), lines: st.chat.lines, done: st.chat.done }; };
export function chatChoose(s, i) {
  const st = s.stream; if (!st || !st.chat || st.chat.done) return { ok: false, msg: 'No live scene.' }; const sc = C().chat.scenes.find((x) => x.id === st.chat.scene), c = sc.choices[i]; if (!c) return { ok: false, msg: 'Pick one.' };
  const U = C().chat.users, L = C().chat.lines, mk = (tone, n) => Array.from({ length: n }, () => ({ user: pick(s, U), text: pick(s, L[tone]), tone }));
  const lines = [...mk(c.tone, 4), ...mk(c.strike ? 'risky' : c.subsPct > 3 ? 'hype' : 'chill', 2)]; st.chat.lines = lines; st.chat.done = true; st.chatDone++;
  st.subs = Math.max(1, Math.round(st.subs * (1 + (c.subsPct || 0) / 100))); if (c.burnout) st.burnout = clamp(st.burnout + c.burnout, 0, 100); if (c.money) earn(s, c.money * 0.78); if (c.rep) ensure(s).reputation = clamp(ensure(s).reputation + c.rep, 0, 100);
  let msg = `Chat reacts (${c.tone}): ${c.subsPct >= 0 ? '+' : ''}${c.subsPct || 0}% subscribers.`; if (c.strike && chance(s, c.strike)) { st.strikes++; msg += ' A moderator flagged it: community strike.'; log(s, 'A live moment earned my channel a strike.', 'career'); }
  const acc = ensure(s).accounts.liveloop; if (acc) acc.followers = Math.max(acc.followers, st.subs); st.peakSubs = Math.max(st.peakSubs, st.subs); log(s, `Live chat: ${sc.prompt} I chose: ${c.label.toLowerCase()}.`, 'career'); return { ok: true, msg, lines };
}
export function careerPost(s, pid, type) { const so = ensure(s); if (!so.accounts[pid]) { if (!careerOwned(s, pid)) return null; so.accounts[pid] = mkAcct(s, pid); so.accounts[pid].followers = pid === 'liveloop' ? s.stream.subs : s.infl.followers; s.flags.has_social = 1; } return post(s, pid, type, { planned: true, boost: 1.5 }); }
