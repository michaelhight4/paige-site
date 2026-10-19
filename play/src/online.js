// Online careers: LIVE STREAMER and INFLUENCER (data/online.json). Both start at age 13, run on the yearly tick, tie into fame, money, stress and happiness,
// and have yearly events (data/events.json, flags is_streamer / is_influencer; effects through the `stream` / `infl` fx keys, see eventFx).
// Streamer: pick a game/topic and schedule, subscribers + viewers, sponsors, donations, ban strikes, burnout, setup upgrades.
// Influencer: pick a niche, style and posting rate, follower growth, brand deals, controversy heat and cancellation risk.
import { D } from './data.js';
import { rnd, rint, pick, chance, clamp, gauss } from './rng.js';
import { log, earn, spend, addStat } from './core.js';
import * as Skills from './skills.js';
import * as PFx from './premium_fx.js';
import * as Ev from './events.js';
import * as Social from './social.js';

const O = () => D.online, TAX = 0.22;
export const minAge = () => O().minAge;
const net = (s, g) => g * (1 - (PFx.noTax() ? 0 : TAX));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const age = (s) => Math.floor(s.age);
const teen = (s) => age(s) < O().teenCap.age;
const tierName = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(Math.round(n)));
export const fmtCount = tierName;
// fame floor each online career pulls you toward (log scale)
const fameTarget = (n) => clamp(Math.log10(n + 1) * 13 - 12, 0, 88);
function pushFame(s, n) { const t = fameTarget(n); if (t > s.stats.fame) addStat(s, 'fame', (t - s.stats.fame) * 0.5); }

// ================= STREAMER =================
export const ensureStream = (s) => { if (!s.stream) s.stream = { active: false, topic: null, schedule: 'regular', subs: 0, viewers: 0, setup: { mic: 0, cam: 0, pc: 0, room: 0 }, sponsors: [], burnout: 10, strikes: 0, bans: 0, bannedUntil: 0, hiatus: 0, years: 0, earned: 0, peakSubs: 0, acted: {}, last: null, rest: false }; return s.stream; };

// ---- yearly streaming strategy (picked each year like the social post plan; 'steady' and 'niche' have zero ban risk but grow slowly) ----
export const STREAM_PLANS = [
  { id: 'steady', icon: '🧸', name: 'Consistent & safe', ban: 0, growth: 0.82, income: 0.97, burn: -3, churn: 0, desc: 'Same schedule, family-friendly. No strikes, steady and slow.' },
  { id: 'niche', icon: '🎯', name: 'Niche community', ban: 0, growth: 0.7, income: 1.12, burn: -1, churn: -0.05, desc: 'Serve a small loyal crowd: slow growth, fans stay and pay more. No strike risk.' },
  { id: 'variety', icon: '🎲', name: 'Variety', ban: 0.55, growth: 1.0, income: 1.0, burn: 2, churn: 0, desc: 'Mix games and formats. Balanced growth, a little strike risk.' },
  { id: 'collab', icon: '👯', name: 'Collab-heavy', ban: 0.9, growth: 1.25, income: 1.05, burn: 3, churn: 0.02, desc: 'Raids and guest streams. Faster growth, more burnout and drama.' },
  { id: 'trend', icon: '🔥', name: 'Trend-chasing', ban: 2.3, growth: 1.5, income: 1.2, burn: 6, churn: 0.05, desc: 'Hot takes and stunts. Big growth and money, high strike and burnout risk.' },
];
export const streamPlanDef = (id) => STREAM_PLANS.find((x) => x.id === id) || { id: 'standard', icon: '⚖️', name: 'Unplanned', ban: 1, growth: 1, income: 1, burn: 0, churn: 0, desc: 'No plan chosen this year.' };
export const streamPlanOf = (s) => streamPlanDef(s.stream && s.stream.plan ? s.stream.plan : null);
export const streamPlanNeeded = (s) => { const st = s.stream; return !!(st && st.active && !st.plan && age(s) >= minAge() && !(st.bannedUntil >= s.age)); };
export function chooseStreamPlan(s, id) { const st = ensureStream(s); if (!st.active) return { ok: false, msg: 'Start streaming first.' }; const d = STREAM_PLANS.find((x) => x.id === id); if (!d) return { ok: false, msg: 'Unknown plan.' }; st.plan = id; return { ok: true, msg: `Stream plan: ${d.name}.` }; }
const streamRisk = (s, st, tp, hrs, pl) => clamp(tp.ban * pl.ban * (1 + s.stats.crazy / 100 + (100 - s.stats.karma) / 250) * (1 + st.strikes * 0.5) * (hrs >= 40 ? 1.15 : 1), 0, 0.6);
export const topicDef = (id) => O().stream.topics.find((t) => t.id === id);
export const schedDef = (id) => O().stream.schedules.find((t) => t.id === id);
export function setupQuality(st) { const lv = Object.values(st.setup).reduce((a, b) => a + b, 0); return lv / (4 * 3); } // 0..1
export function streamHours(s, st = ensureStream(s)) { return schedDef(st.schedule).hours; }
const scheduleAllowed = (s, id) => !(teen(s) && id === 'grind');
export function startStream(s, topic) {
  const st = ensureStream(s); if (age(s) < minAge()) return { ok: false, msg: `Streaming starts at age ${minAge()}.` }; if (s.prison) return { ok: false, msg: 'Not from prison.' };
  if (st.active) return { ok: false, msg: 'You are already streaming.' }; if (!topicDef(topic)) return { ok: false, msg: 'Pick a game or topic.' };
  if (st.bannedUntil > s.age) return { ok: false, msg: 'Your channel is suspended.' };
  st.active = true; st.topic = topic; if (!st.years && !st.subs) st.subs = Math.round(3 + s.stats.looks / 12 + Skills.get(s, 'people') / 8); st.burnout = Math.max(st.burnout, 5);
  if (teen(s) && st.schedule === 'grind') st.schedule = 'regular'; st.flagSet = true; s.flags.is_streamer = 1; log(s, `I started streaming ${topicDef(topic).name.toLowerCase()} to a handful of viewers (mostly my mom).`, 'career');
  return { ok: true, msg: `You went live: ${topicDef(topic).name}.` };
}
export function quitStream(s) { const st = ensureStream(s); if (!st.active) return { ok: false, msg: 'You are not streaming.' }; st.active = false; st.sponsors = []; delete s.flags.is_streamer; log(s, `I retired from streaming with ${tierName(st.subs)} subscribers and a very comfy chair.`, 'career'); return { ok: true, msg: 'You stopped streaming.' }; }
export function setTopic(s, topic) {
  const st = ensureStream(s); if (!st.active) return { ok: false, msg: 'Start streaming first.' }; if (!topicDef(topic)) return { ok: false, msg: 'Unknown topic.' }; if (st.topic === topic) return { ok: false, msg: 'Already streaming that.' };
  st.topic = topic; const lost = Math.round(st.subs * 0.15); st.subs -= lost; st.sponsors = st.sponsors.filter(() => chance(s, 0.5)); log(s, `I switched to ${topicDef(topic).name.toLowerCase()}. ${lost} subscribers left in protest.`, 'career'); return { ok: true, msg: `Switched to ${topicDef(topic).name} (-${lost} subs).` };
}
export function setSchedule(s, id) { const st = ensureStream(s); if (!st.active) return { ok: false, msg: 'Start streaming first.' }; if (!schedDef(id)) return { ok: false, msg: 'Unknown schedule.' }; if (!scheduleAllowed(s, id)) return { ok: false, msg: 'Too young for a 40-hour grind: your parents said no.' }; st.schedule = id; return { ok: true, msg: 'Schedule: ' + schedDef(id).name }; }
export function upgradeSetup(s, item) {
  const st = ensureStream(s), it = O().stream.setup.find((x) => x.id === item); if (!it) return { ok: false, msg: 'Unknown gear.' }; if (!st.active) return { ok: false, msg: 'Start streaming first.' };
  const lv = st.setup[item]; if (lv >= it.levels.length - 1) return { ok: false, msg: 'Already maxed.' }; const next = it.levels[lv + 1]; if (s.cash < next.cost) return { ok: false, msg: `Costs ${money(next.cost)}.` };
  s.cash -= next.cost; st.setup[item] = lv + 1; log(s, `I upgraded my ${it.name.toLowerCase()} to a ${next.name.toLowerCase()}.`, 'career'); return { ok: true, msg: `${it.name}: ${next.name}` };
}
export function seekSponsor(s) {
  const st = ensureStream(s), S = O().stream; if (!st.active) return { ok: false, msg: 'Start streaming first.' }; if (st.acted.sponsor) return { ok: false, msg: 'You already pitched sponsors this year.' };
  if (st.subs < S.minSubsForSponsor) return { ok: false, msg: `Sponsors want ${S.minSubsForSponsor}+ subscribers.` }; if (st.sponsors.length >= S.maxSponsors) return { ok: false, msg: 'You have the maximum number of sponsors.' };
  st.acted.sponsor = 1; const tp = topicDef(st.topic), p = clamp(0.25 + st.viewers / 2500 + s.stats.fame / 220 + (tp.spons - 0.9) * 0.2 - st.strikes * 0.1, 0.08, 0.88);
  if (!chance(s, p)) { log(s, 'I pitched sponsors. Nobody replied except a bot.', 'career'); return { ok: true, won: false, msg: 'No sponsor bit this time.' }; }
  const brand = pick(s, S.sponsors.filter((b) => !st.sponsors.some((x) => x.brand === b)) || S.sponsors), pay = Math.round(st.viewers * S.rates.sponsorPerViewer * tp.spons * (0.7 + rnd(s) * 0.6) * (1 + Social.gearBoost(s).sponsor) / 10) * 10, yrs = rint(s, 1, 2);
  st.sponsors.push({ brand, pay: Math.max(150, pay), yrsLeft: yrs }); log(s, `${brand} signed me as a sponsor for ${money(Math.max(150, pay))} a year.`, 'career'); return { ok: true, won: true, msg: `${brand} signed you: ${money(Math.max(150, pay))}/yr for ${yrs} yr.` };
}
export function dropSponsor(s, i) { const st = ensureStream(s); const x = st.sponsors[i]; if (!x) return { ok: false, msg: 'No such sponsor.' }; st.sponsors.splice(i, 1); return { ok: true, msg: `Dropped ${x.brand}.` }; }
export function takeBreak(s) {
  const st = ensureStream(s); if (!st.active) return { ok: false, msg: 'Start streaming first.' }; if (st.acted.rest) return { ok: false, msg: 'You already took a break this year.' };
  st.acted.rest = 1; st.rest = true; st.burnout = Math.max(0, st.burnout - 30); addStat(s, 'stress', -10); addStat(s, 'happiness', 4); log(s, 'I took a long break from streaming and remembered what outside looks like.', 'act'); return { ok: true, msg: 'Burnout -30 (growth pauses this year).' };
}
export function marathon(s) {
  const st = ensureStream(s); if (!st.active) return { ok: false, msg: 'Start streaming first.' }; if (st.acted.marathon) return { ok: false, msg: 'You already did a marathon this year.' }; if (st.bannedUntil > s.age) return { ok: false, msg: 'Suspended.' };
  st.acted.marathon = 1; st.burnout = clamp(st.burnout + 12, 0, 100); addStat(s, 'stress', 6); const gain = Math.round(st.subs * (0.06 + rnd(s) * 0.1) + 15); st.subs += gain; const pay = Math.round(st.viewers * 14 * (1 + setupQuality(st)));
  earn(s, net(s, pay)); st.earned += net(s, pay); Social.careerPost(s, 'liveloop', 'qa'); log(s, `I ran a 24-hour charity marathon: +${gain} subscribers, ${money(pay)} raised-and-kept-some.`, 'career'); return { ok: true, msg: `Marathon: +${gain} subs, +${money(net(s, pay))}.` };
}
function banStream(s, st, why) {
  const yrs = rint(s, ...O().stream.banYears); st.bans++; st.strikes = 0; st.bannedUntil = s.age + yrs; st.sponsors = []; const lost = Math.round(st.subs * 0.3); st.subs -= lost; st.viewers = Math.round(st.viewers * 0.7);
  addStat(s, 'happiness', -10); addStat(s, 'fame', -4); log(s, `My channel was banned for ${yrs} year${yrs > 1 ? 's' : ''} (${why}). ${lost} subscribers drifted off.`, 'career'); Ev.queue(s, 'stream_ban_appeal'); return yrs;
}
function streamYear(s) {
  const st = ensureStream(s), S = O().stream, dt = 1; st.acted = {}; if (!st.active) return;
  const tp = topicDef(st.topic), sc = schedDef(st.schedule), q = setupQuality(st), hrs = sc.hours;
  const PL = streamPlanOf(s); st.plan = null;
  const res = { age: age(s), subsBefore: st.subs, income: 0, parts: {}, events: [], plan: PL.id };
  if (s.prison) { st.subs = Math.round(st.subs * 0.8); res.events.push('Prison: the channel went dark.'); st.last = res; return; }
  const banned = st.bannedUntil >= s.age, hiatus = st.hiatus > 0;
  if (banned || hiatus) { st.subs = Math.round(st.subs * 0.9); if (hiatus) st.hiatus--; st.viewers = Math.round(st.subs * 0.04); res.events.push(banned ? 'Channel suspended.' : 'On hiatus after burnout.'); if (banned) { st.burnout = Math.max(0, st.burnout - 15); } else st.burnout = Math.max(20, st.burnout - 15); res.subsAfter = st.subs; st.last = res; st.years++; return; }
  // growth: topic, schedule, gear, charisma; harder the bigger you are and the more crowded the topic
  const cha = 1 + s.stats.looks / 220 + (Skills.get(s, 'people') + Skills.get(s, 'confidence')) / 600 + (s.stats.fame / 300);
  const sat = 1 / (1 + (st.subs / (25000 * (1.2 - tp.comp))));
  const rest = st.rest; st.rest = false;
  let newSubs = (120 + st.subs * 0.35) * tp.growth * sc.growth * (0.55 + q * 0.9) * cha * sat * clamp(1 + gauss(s) * 0.3, 0.4, 1.8) * (rest ? 0.3 : 1) * (st.burnout > 70 ? 0.7 : 1) * (1 + Social.gearBoost(s).growth) * PL.growth;
  const churn = Math.max(0.02, (rest ? 0.1 : 0.2) + (st.burnout > 70 ? 0.08 : 0) + PL.churn); st.subs = Math.max(1, Math.round(st.subs * (1 - churn) + newSubs)); st.peakSubs = Math.max(st.peakSubs, st.subs);
  st.viewers = Math.round(st.subs * (0.035 + 0.05 * q) * (hrs / 20) ** 0.4 * clamp(1 + gauss(s) * 0.12, 0.7, 1.4));
  // money
  const vh = st.viewers * hrs * 52, don = vh * S.rates.viewerHourDonation * (0.7 + q), ads = vh * S.rates.viewerHourAds, subRev = st.subs * S.rates.paidSubShare * S.rates.paidSubYear;
  let spons = 0; for (const x of st.sponsors) { spons += x.pay * (teen(s) ? O().teenCap.sponsorCut : 1); x.yrsLeft--; } st.sponsors = st.sponsors.filter((x) => x.yrsLeft > 0 || (res.events.push(`${x.brand} deal ended`), false));
  const gross = (don + ads + subRev) * PL.income + spons; res.parts = { donations: Math.round(don), ads: Math.round(ads), subs: Math.round(subRev), sponsors: Math.round(spons) }; res.income = Math.round(net(s, gross)); earn(s, net(s, gross)); st.earned += net(s, gross);
  // burnout, stress, happiness, health
  st.burnout = clamp(st.burnout + sc.burn + PL.burn + (st.setup.room >= 2 ? -3 : 0) + (s.stats.stress - 30) / 10 - (rest ? 0 : 0), 0, 100);
  addStat(s, 'stress', (hrs - 15) / 4); addStat(s, 'happiness', st.subs > res.subsBefore ? 1 : -1); if (hrs >= 40) addStat(s, 'health', -2); addStat(s, 'looks', hrs >= 40 ? -0.5 : 0);
  for (const [k, w] of Object.entries(tp.skills)) Skills.use(s, k, w * (hrs / 20) * 1.2); Skills.use(s, 'people', 0.5);
  // ban risk: topic edge, crazy/karma, strikes
  const risk = streamRisk(s, st, tp, hrs, PL);
  if (risk > 0 && chance(s, risk)) { st.strikes++; res.events.push('ToS strike ' + st.strikes); log(s, `My channel got a community-guidelines strike (${st.strikes}/${S.strikesToBan}).`, 'career'); if (st.strikes >= S.strikesToBan) { banStream(s, st, 'repeated strikes'); res.events.push('BANNED'); } }
  else if (st.strikes && chance(s, 0.5)) st.strikes--;
  // burnout wall
  if (st.burnout >= S.burnoutForce && !s.prison) { st.hiatus = 1; const lost = Math.round(st.subs * 0.2); st.subs -= lost; st.burnout = 50; addStat(s, 'happiness', -10); addStat(s, 'health', -6); st.burnouts = (st.burnouts || 0) + 1; res.events.push('BURNOUT'); log(s, `I burned out and went dark for a year. ${lost} subscribers moved on.`, 'career'); }
  pushFame(s, st.subs); st.years++; res.subsAfter = st.subs; res.subsGain = st.subs - res.subsBefore; st.last = res; (st.hist ||= []).push({ age: res.age, topic: st.topic, subs: st.subs, gain: res.subsGain, viewers: st.viewers, income: Math.round(res.income || 0), events: (res.events || []).slice(0, 2) }); if (st.hist.length > 15) st.hist.shift();
  if (st.subs >= 1000 && !st.m1k) { st.m1k = 1; log(s, 'I hit 1,000 subscribers.', 'career'); } if (st.subs >= 100000 && !st.m100k) { st.m100k = 1; log(s, 'I hit 100,000 subscribers and a plaque.', 'career'); } if (st.subs >= 1e6 && !st.m1m) { st.m1m = 1; log(s, 'One million subscribers. My mother finally understands what I do.', 'career'); }
  log(s, `Streaming year: ${tierName(st.subs)} subscribers, ~${tierName(st.viewers)} viewers, earned ${money(res.income)}.`, 'career');
}
export function streamStatus(s) {
  const st = ensureStream(s), S = O().stream, a = age(s);
  return { minAge: minAge(), locked: a < minAge(), active: st.active, topic: st.topic, topicName: st.topic ? topicDef(st.topic).name : null, topicIcon: st.topic ? topicDef(st.topic).icon : null, schedule: st.schedule, subs: st.subs, viewers: st.viewers, burnout: Math.round(st.burnout), strikes: st.strikes, strikesToBan: S.strikesToBan, bans: st.bans,
    bannedYears: st.bannedUntil > s.age ? Math.ceil(st.bannedUntil - s.age) : 0, hiatus: st.hiatus > 0, years: st.years, earned: Math.round(st.earned), peakSubs: st.peakSubs, hist: (st.hist || []).slice().reverse(), quality: Math.round(setupQuality(st) * 100), last: st.last, teen: teen(s), cash: Math.round(s.cash), fame: Math.round(s.stats.fame),
    sponsors: st.sponsors.map((x, i) => ({ i, brand: x.brand, pay: x.pay, yrsLeft: x.yrsLeft })), canSponsor: st.subs >= S.minSubsForSponsor, minSubsForSponsor: S.minSubsForSponsor, maxSponsors: S.maxSponsors, done: { sponsor: !!st.acted.sponsor, rest: !!st.acted.rest, marathon: !!st.acted.marathon },
    plan: { needed: streamPlanNeeded(s), current: st.plan || null, effective: streamPlanOf(s).id, options: STREAM_PLANS.map((x) => ({ id: x.id, icon: x.icon, name: x.name, desc: x.desc, banPct: st.topic ? Math.round(streamRisk(s, st, topicDef(st.topic), schedDef(st.schedule).hours, x) * 1000) / 10 : 0, growth: Math.round((x.growth - 1) * 100), income: Math.round((x.income - 1) * 100), burnout: x.burn })) },
    topics: S.topics.map((t) => ({ id: t.id, name: t.name, icon: t.icon, growth: t.growth, comp: t.comp, ban: t.ban, spons: t.spons, current: st.topic === t.id })), schedules: S.schedules.map((x) => ({ id: x.id, name: x.name, hours: x.hours, current: st.schedule === x.id, locked: !scheduleAllowed(s, x.id) })),
    setup: S.setup.map((it) => { const lv = st.setup[it.id], nx = it.levels[lv + 1]; return { id: it.id, name: it.name, icon: it.icon, level: lv, maxLevel: it.levels.length - 1, current: it.levels[lv].name, next: nx ? nx.name : null, cost: nx ? nx.cost : 0, afford: nx ? s.cash >= nx.cost : false }; }) };
}

// ================= INFLUENCER =================
export const ensureInfl = (s) => { if (!s.infl) s.infl = { active: false, niche: null, style: 'trendy', posting: 'steady', followers: 0, engagement: 40, heat: 10, trust: 60, deals: [], offers: [], cancelled: 0, years: 0, earned: 0, peak: 0, acted: {}, last: null, quiet: 0 }; return s.infl; };
export const nicheDef = (id) => O().infl.niches.find((n) => n.id === id);
export const styleDef = (id) => O().infl.styles.find((n) => n.id === id);
export const postDef = (id) => O().infl.posting.find((n) => n.id === id);
export function startInfluencer(s, niche) {
  const f = ensureInfl(s); if (age(s) < minAge()) return { ok: false, msg: `Influencing starts at age ${minAge()}.` }; if (s.prison) return { ok: false, msg: 'Not from prison.' }; if (f.active) return { ok: false, msg: 'You are already an influencer.' }; if (!nicheDef(niche)) return { ok: false, msg: 'Pick a niche.' };
  f.active = true; f.niche = niche; if (!f.years && !f.followers) f.followers = Math.round(20 + s.stats.looks / 3 + Skills.get(s, 'creativity') / 2); s.flags.is_influencer = 1; log(s, `I started posting about ${nicheDef(niche).name.toLowerCase()} and gained a loyal audience of my cousins.`, 'career'); return { ok: true, msg: `You are posting: ${nicheDef(niche).name}.` };
}
export function quitInfluencer(s) { const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'You are not an influencer.' }; f.active = false; f.deals = []; f.offers = []; delete s.flags.is_influencer; log(s, `I logged off for good with ${tierName(f.followers)} followers.`, 'career'); return { ok: true, msg: 'You stopped posting.' }; }
export function setNiche(s, id) { const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'Start first.' }; if (!nicheDef(id)) return { ok: false, msg: 'Unknown niche.' }; if (f.niche === id) return { ok: false, msg: 'Already your niche.' }; f.niche = id; const lost = Math.round(f.followers * 0.3); f.followers -= lost; f.deals = f.deals.filter(() => chance(s, 0.4)); log(s, `I rebranded to ${nicheDef(id).name.toLowerCase()}. ${lost} followers did not follow.`, 'career'); return { ok: true, msg: `Rebranded (-${lost} followers).` }; }
export function setStyle(s, id) { const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'Start first.' }; if (!styleDef(id)) return { ok: false, msg: 'Unknown style.' }; f.style = id; return { ok: true, msg: 'Style: ' + styleDef(id).name }; }
export function setPosting(s, id) { const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'Start first.' }; if (!postDef(id)) return { ok: false, msg: 'Unknown rate.' }; if (teen(s) && id === 'nonstop') return { ok: false, msg: 'Too young for non-stop posting: school and parents say no.' }; f.posting = id; return { ok: true, msg: 'Posting: ' + postDef(id).name }; }
function makeOffers(s, f) {
  const I = O().infl; f.offers = []; if (f.followers < I.minFollowersForDeals || f.heat > 80) return; const nd = nicheDef(f.niche), n = rint(s, 1, 3);
  for (let i = 0; i < n; i++) { const shady = chance(s, 0.3), brand = pick(s, I.brands), base = f.followers * I.rates.dealPerFollower * nd.deal * (0.6 + rnd(s) * 0.8) * (f.engagement / 50); f.offers.push({ id: i, brand, pay: Math.max(100, Math.round(base * (shady ? 1.9 : 1) / 10) * 10), yrs: rint(s, 1, 2), shady }); }
}
export function acceptDeal(s, id) {
  const f = ensureInfl(s), I = O().infl; if (!f.active) return { ok: false, msg: 'Start first.' }; const o = f.offers.find((x) => x.id === id); if (!o) return { ok: false, msg: 'That offer is gone.' }; if (f.deals.length >= I.maxDeals) return { ok: false, msg: 'You have the maximum number of deals.' };
  f.offers = f.offers.filter((x) => x.id !== id); f.deals.push({ brand: o.brand, pay: o.pay, yrsLeft: o.yrs, shady: o.shady }); if (o.shady) { f.trust = clamp(f.trust - 10, 0, 100); f.heat = clamp(f.heat + 8, 0, 100); }
  log(s, `I signed a ${o.shady ? 'questionable ' : ''}brand deal with ${o.brand}: ${money(o.pay)} a year.`, 'career'); return { ok: true, msg: `${o.brand}: ${money(o.pay)}/yr${o.shady ? ' (risky)' : ''}.` };
}
export function declineDeal(s, id) { const f = ensureInfl(s); f.offers = f.offers.filter((x) => x.id !== id); return { ok: true, msg: 'Declined.' }; }
export function postBig(s) { // once a year: a big swing at going viral
  const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'Start first.' }; if (f.acted.big) return { ok: false, msg: 'You already made a big post this year.' }; f.acted.big = 1; const sd = styleDef(f.style), p = clamp(0.22 + s.stats.looks / 400 + Skills.get(s, 'creativity') / 500 + sd.growth * 0.1, 0.1, 0.6);
  f.heat = clamp(f.heat + (sd.heat > 0 ? 6 : 1), 0, 100); Social.careerPost(s, 'snapfolio', 'outfit'); if (chance(s, p)) { const g = Math.round(f.followers * (0.15 + rnd(s) * 0.35) + 60); f.followers += g; log(s, `My big post went viral: +${g} followers.`, 'career'); return { ok: true, won: true, msg: `Viral! +${g} followers.` }; }
  log(s, 'My big post got 11 likes, 9 of them from my mother.', 'career'); return { ok: true, won: false, msg: 'It flopped.' };
}
export function pr(s) { // PR clean-up: costs money, cools controversy
  const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'Start first.' }; if (f.acted.pr) return { ok: false, msg: 'Already had a PR team this year.' }; const cost = Math.round(2000 + f.followers * 0.05); if (s.cash < cost) return { ok: false, msg: `Costs ${money(cost)}.` };
  s.cash -= cost; f.acted.pr = 1; f.heat = clamp(f.heat - 25, 0, 100); f.trust = clamp(f.trust + 6, 0, 100); log(s, `I paid a PR team ${money(cost)} to make the internet forget something.`, 'career'); return { ok: true, msg: `Heat -25 for ${money(cost)}.` };
}
export function logOff(s) { const f = ensureInfl(s); if (!f.active) return { ok: false, msg: 'Start first.' }; if (f.acted.rest) return { ok: false, msg: 'Already did this year.' }; f.acted.rest = 1; f.quiet = 1; f.heat = clamp(f.heat - 12, 0, 100); addStat(s, 'stress', -8); addStat(s, 'happiness', 3); log(s, 'I logged off for a few weeks. The world carried on.', 'act'); return { ok: true, msg: 'You logged off: heat -12, growth slows this year.' }; }
function influencerYear(s) {
  const f = ensureInfl(s), I = O().infl; f.acted = {}; if (!f.active) return;
  const nd = nicheDef(f.niche), sd = styleDef(f.style), ps = postDef(f.posting), res = { age: age(s), followersBefore: f.followers, income: 0, parts: {}, events: [] };
  if (s.prison) { f.followers = Math.round(f.followers * 0.85); f.last = res; return; }
  const quiet = f.quiet; f.quiet = 0;
  const cha = 1 + s.stats.looks / 200 + s.stats.fame / 250 + Skills.get(s, 'creativity') / 400 + (Skills.get(s, 'people')) / 500, sat = 1 / (1 + f.followers / 400000);
  let g = (1 + Social.gearBoost(s).growth) * (60 + f.followers * 0.3) * nd.growth * sd.growth * ps.growth * cha * sat * clamp(1 + gauss(s) * 0.3, 0.4, 1.8) * (quiet ? 0.5 : 1) * (0.7 + f.engagement / 160);
  f.followers = Math.max(1, Math.round(f.followers * (quiet ? 0.93 : 0.9) + g)); f.peak = Math.max(f.peak, f.followers);
  f.engagement = clamp(f.engagement + (f.trust - 50) / 12 + (ps.posts > 10 ? -3 : 1) + gauss(s) * 2, 10, 95);
  // money: deals + small affiliate/creator-fund income
  let deals = 0; for (const d of f.deals) { deals += d.pay * (teen(s) ? O().teenCap.sponsorCut : 1); d.yrsLeft--; } f.deals = f.deals.filter((d) => d.yrsLeft > 0 || (res.events.push(`${d.brand} deal ended`), false));
  const aff = f.followers * (f.engagement / 100) * I.rates.engagementYear * nd.deal * 6; const gross = deals + aff; res.parts = { deals: Math.round(deals), affiliate: Math.round(aff) }; res.income = Math.round(net(s, gross)); earn(s, net(s, gross)); f.earned += net(s, gross);
  // trust, heat, stress
  f.trust = clamp(f.trust + sd.trust + (f.deals.some((d) => d.shady) ? -3 : 1), 0, 100);
  f.heat = clamp(f.heat * 0.9 + sd.heat * nd.risk + (s.stats.crazy - 30) / 10 + (50 - s.stats.karma) / 12 + (ps.posts > 10 ? 4 : 0) + (quiet ? -6 : 0), 0, 100);
  addStat(s, 'stress', (ps.posts - 5) / 3); addStat(s, 'happiness', f.followers > res.followersBefore ? 1 : -1); if (ps.posts > 10) addStat(s, 'health', -1);
  Skills.use(s, 'creativity', 0.8 * (ps.posts / 7)); Skills.use(s, 'people', 0.5);
  // cancellation
  const cp = clamp((f.heat - I.cancelHeat) / 140 + (f.trust < 30 ? 0.06 : 0), 0, 0.55);
  if (f.heat > I.cancelHeat && chance(s, cp)) { f.cancelled++; const lost = Math.round(f.followers * (0.3 + rnd(s) * 0.25)); f.followers -= lost; const n = f.deals.length; f.deals = []; f.offers = []; f.heat = 35; f.trust = clamp(f.trust - 20, 0, 100); addStat(s, 'fame', -5); addStat(s, 'happiness', -12); addStat(s, 'stress', 10); res.events.push('CANCELLED'); log(s, `I got cancelled. ${tierName(lost)} followers left${n ? ' and ' + n + ' brand deal' + (n > 1 ? 's' : '') + ' vanished' : ''}.`, 'career'); Ev.queue(s, 'infl_cancelled'); }
  else makeOffers(s, f);
  pushFame(s, f.followers); f.years++; res.followersAfter = f.followers; res.followersGain = f.followers - res.followersBefore; f.last = res;
  if (f.followers >= 10000 && !f.m10k) { f.m10k = 1; log(s, 'I hit 10,000 followers and got my first free sample.', 'career'); } if (f.followers >= 1e6 && !f.m1m) { f.m1m = 1; log(s, 'One million followers. Strangers have opinions about my breakfast.', 'career'); }
  log(s, `Influencer year: ${tierName(f.followers)} followers, earned ${money(res.income)}.`, 'career');
}
export function influencerStatus(s) {
  const f = ensureInfl(s), I = O().infl, a = age(s), cp = clamp((f.heat - I.cancelHeat) / 140 + (f.trust < 30 ? 0.06 : 0), 0, 0.55);
  return { minAge: minAge(), locked: a < minAge(), active: f.active, niche: f.niche, nicheName: f.niche ? nicheDef(f.niche).name : null, nicheIcon: f.niche ? nicheDef(f.niche).icon : null, style: f.style, posting: f.posting, followers: f.followers, engagement: Math.round(f.engagement), heat: Math.round(f.heat), trust: Math.round(f.trust), cancelRisk: f.heat > I.cancelHeat ? Math.round(cp * 100) : 0, cancelled: f.cancelled, years: f.years, earned: Math.round(f.earned), peak: f.peak, last: f.last, teen: teen(s), cash: Math.round(s.cash), fame: Math.round(s.stats.fame),
    deals: f.deals.map((d, i) => ({ i, brand: d.brand, pay: d.pay, yrsLeft: d.yrsLeft, shady: !!d.shady })), offers: f.offers.map((o) => ({ ...o })), canDeal: f.followers >= I.minFollowersForDeals, minFollowersForDeals: I.minFollowersForDeals, maxDeals: I.maxDeals, done: { big: !!f.acted.big, pr: !!f.acted.pr, rest: !!f.acted.rest }, prCost: Math.round(2000 + f.followers * 0.05),
    niches: I.niches.map((n) => ({ id: n.id, name: n.name, icon: n.icon, growth: n.growth, deal: n.deal, risk: n.risk, current: f.niche === n.id })), styles: I.styles.map((x) => ({ id: x.id, name: x.name, current: f.style === x.id, heat: x.heat, growth: x.growth })), postings: I.posting.map((x) => ({ id: x.id, name: x.name, current: f.posting === x.id, locked: teen(s) && x.id === 'nonstop' })) };
}

// ================= yearly hook + event effects =================
export function yearTick(s) { if (age(s) < minAge()) return; if (s.stream && s.stream.active) streamYear(s); else if (s.stream) s.stream.acted = {}; if (s.infl && s.infl.active) influencerYear(s); else if (s.infl) s.infl.acted = {}; }
// fx keys used by data/events.json: stream: { subsPct, viewersPct, burnout, strikes, ban, money }, infl: { followersPct, heat, trust, engagement }
export function eventFx(s, kind, o) {
  if (kind === 'stream') { const st = ensureStream(s); if (!st.active) return; if (o.subsPct) st.subs = Math.max(1, Math.round(st.subs * (1 + o.subsPct / 100))); if (o.burnout) st.burnout = clamp(st.burnout + o.burnout, 0, 100); if (o.strikes) st.strikes = Math.max(0, st.strikes + o.strikes); if (o.ban) banStream(s, st, 'a serious violation'); if (o.cut && st.bannedUntil > s.age) st.bannedUntil = Math.max(s.age, st.bannedUntil - o.cut); if (o.sponsor) st.sponsors.push({ brand: pick(s, O().stream.sponsors), pay: Math.max(300, Math.round(st.viewers * 30)), yrsLeft: 1 }); if (o.noSponsors) st.sponsors = []; st.peakSubs = Math.max(st.peakSubs, st.subs); }
  else { const f = ensureInfl(s); if (!f.active) return; if (o.followersPct) f.followers = Math.max(1, Math.round(f.followers * (1 + o.followersPct / 100))); if (o.heat) f.heat = clamp(f.heat + o.heat, 0, 100); if (o.trust) f.trust = clamp(f.trust + o.trust, 0, 100); if (o.engagement) f.engagement = clamp(f.engagement + o.engagement, 5, 100); if (o.dropDeals) f.deals = []; if (o.deal) f.deals.length < O().infl.maxDeals && f.deals.push({ brand: pick(s, O().infl.brands), pay: Math.max(200, Math.round(f.followers * 0.02)), yrsLeft: 1, shady: false }); f.peak = Math.max(f.peak, f.followers); }
}
export const headline = (s) => (s.stream && s.stream.active ? 'Streamer' : s.infl && s.infl.active ? 'Influencer' : null);
