// "More" = a searchable directory of EVERY screen/option in the game. Entries are built from live adapter data
// (occupation menu, assets menu, shops, activity menus) plus the static lists below, so new content shows up automatically.
import { adapter } from '../adapter.js';
import { store, h, row, section, empty, openPanel } from '../ui.js';
import * as Occ from './occupation.js';
import * as Ast from './assets.js';
import { sportsScreen } from './sports.js';
import { relationshipsScreen } from './relationships.js';
import { activitiesScreen, willScreen, setActivityCategory } from './activities.js';
import { profileScreen, legacyScreen, familyTreeScreen, cemeteryScreen } from './profile.js';
import { storeScreen, settingsScreen } from './store.js';
import { streamerScreen, influencerScreen } from './online.js';
import { politicsScreen } from './politics.js';
import { prodcoScreen } from './prodco.js';
import { franchiseScreen, esportsScreen } from './franchise.js';
import { racingScreen } from './racing.js';
import { brandScreen, farmScreen, advisorScreen } from './venture.js';
import { coachingScreen } from './coaching.js';
import * as Ext from './extra.js'; // skills, passions, scholarships, businesses (later stages register here)

export const GROUPS = ['Life', 'Work & School', 'Money & Assets', 'Shop', 'Businesses & Studios', 'Social', 'Activities', 'Skills', 'Legacy', 'Settings'];
const GICON = { 'Life': '🙂', 'Work & School': '💼', 'Money & Assets': '🏦', 'Shop': '🛍️', 'Businesses & Studios': '🏢', 'Social': '👪', 'Activities': '🎯', 'Skills': '📈', 'Legacy': '🪦', 'Settings': '⚙️' };
export const groupIcon = (g) => GICON[g];

export async function buildDirectory() {
  const E = []; const add = (group, id, label, sub, icon, open, kw = '') => E.push({ group, id, label, sub, icon, open, kw });
  // Life
  add('Life', 'profile', 'Profile', 'Stats, traits, ribbons, diseases', '🙂', (n) => n.open('Profile', profileScreen), 'me character avatar ribbons');
  add('Life', 'life:autopilot', 'Autopilot & Skip ahead', 'Yearly routines that run when you age, skip years (Premium)', '🤖', async (n) => { const { autopilotScreen } = await import('./auto.js'); n.open('Autopilot', autopilotScreen); }, 'auto routine skip fast forward age years premium');
  add('Life', 'life:rewards', 'Rewards (watch an ad)', 'Cash, stat boosts and bonuses from rewarded ads', '📺', async (n) => { const { rewardsScreen } = await import('../ads_ui.js'); n.open('Rewards', rewardsScreen); }, 'ad ads reward cash money stat boost sponsor steam subscriber');
  add('Life', 'life:timebudget', 'Time & Stress', 'Weekly hours budget, stress, burnout, relief, second job', '⏱️', async (n) => { const { timeBudgetScreen } = await import('./timebudget.js'); n.open('Time & Stress', timeBudgetScreen); }, 'hours week stress burnout schedule second job relief vacation therapy'),
  add('Life', 'journal', 'Life journal', 'Back to the main screen', '📖', (n) => n.closeAll(), 'home timeline log');
  for (const e of Ext.lifeEntries()) add('Life', e.id, e.label, e.sub, e.icon, e.open, e.kw);
  // Work & School
  const occ = await adapter.getOccupationMenu();
  const occScreens = { timebudget: async (b, c) => { const { timeBudgetScreen } = await import('./timebudget.js'); return timeBudgetScreen(b, c); }, education: Occ.educationScreen, brand: brandScreen, farm: farmScreen, fight: Occ.fightScreen, freelance: Occ.freelanceScreen, jobs: (b, c) => Occ.jobsScreen(b, c, 'jobs'), parttime: Occ.partTimeScreen, military: Occ.militaryScreen, special: (b, c) => Occ.jobsScreen(b, c, 'special'), sports: sportsScreen, collections: Occ.collectionsScreen, scholarships: Ext.scholarshipsScreen, streamer: streamerScreen, influencer: influencerScreen, politics: politicsScreen, coaching: coachingScreen, franchise: franchiseScreen, esports: esportsScreen, racing: racingScreen, prodco: prodcoScreen };
  for (const m of occ) add('Work & School', 'occ:' + m.id, m.label, m.sub, m.icon, (n) => n.open(m.label, occScreens[m.id]), 'job career school college university');
  add('Work & School', 'occ:menu', 'Work hub', 'Current job and all work screens', '💼', (n) => n.open('Work', Occ.occupationMenu), 'occupation');
  for (const e of Ext.workEntries()) add('Work & School', e.id, e.label, e.sub, e.icon, e.open, e.kw);
  // Money & Assets
  const am = await adapter.getAssetsMenu();
  const aScreens = { finances: Ast.financesScreen, advisor: advisorScreen, investments: Ast.investmentsScreen, luxury: Ast.luxuryScreen, auctions: Ast.auctionsScreen, casino: Ast.casinoScreen, garage: Ast.garageScreen, zoo: Ast.zooScreen, belongings: Ast.belongingsScreen, properties: Ast.propertiesScreen, shopping: Ast.shoppingScreen, restoration: Ast.restorationScreen };
  add('Money & Assets', 'money:news', 'Market News', 'Yearly headlines that hint at what to buy or avoid', '📰', async (n) => { const x = await import('./assets.js'); n.open('Market News', x.marketNewsScreen); }, 'news stocks crypto market headlines');
  for (const m of am) { if (m.id === 'businesses' || m.id === 'shopping') continue; add('Money & Assets', 'ast:' + m.id, m.label, m.sub, m.icon, (n) => n.open(m.label, aScreens[m.id]), 'money cash bank'); }
  // Shop
  add('Shop', 'shop:all', 'Shopping (all stores)', 'Brokers, dealers, jewelers, music, clothing', '🛍️', (n) => n.open('Shopping', Ast.shoppingScreen), 'store mall buy accessories');
  for (const s of await adapter.getShops()) add('Shop', 'shop:' + s.id, s.name, s.section + ' · ' + s.sub, s.icon, (n) => n.open(s.name, (b, c) => Ast.shopScreen(b, c, s.id)), s.section + ' shop store');
  // Businesses & Studios
  for (const e of Ext.businessEntries()) add('Businesses & Studios', e.id, e.label, e.sub, e.icon, e.open, e.kw);
  // Social
  add('Social', 'soc:fame', 'Use your fame', 'TV roles, movies, features, talk shows, books, endorsements, hosting', '🌟', async (n) => { const { fameScreen } = await import('./fame.js'); n.open('Use your fame', fameScreen); }, 'fame celebrity tv movie talk show podcast endorsement host awards');
  add('Social', 'soc:people', 'Relationships', 'Family, partner, friends, exes', '👪', (n) => n.open('Relationships', relationshipsScreen), 'people family friends partner dating');
  add('Social', 'soc:media', 'Social Media', 'Platforms, posts, followers, sponsors, verification, calendar, team, gear', '📱', async (n) => { const { socialHub } = await import('./social.js'); n.open('Social Media', socialHub); }, 'social media feed followers post sponsor verified influencer platform chirpr clipwave');
  add('Businesses & Studios', 'biz:esports', 'Esports Teams', 'Own a gaming org: RTS, shooter, MOBA or sim racing teams, players, staff, gaming house, tournaments', '🎮', (n) => n.open('Esports Teams', esportsScreen), 'esports gaming team org moba shooter rts racing tournament'),
  add('Businesses & Studios', 'biz:franchise', 'Own a Team', 'Team hub: buy or create a club, hire staff, roster, facilities, finances', '🏟️', (n) => n.open('Own a Team', franchiseScreen), 'sports team franchise own club stadium staff'),
  add('Businesses & Studios', 'biz:brand', 'Clothing Brand', 'Launch a fashion label: seasons, lines, models, stores, online and wholesale', '👗', (n) => n.open('Clothing Brand', brandScreen), 'clothing brand fashion apparel swimwear streetwear collection models');
  add('Businesses & Studios', 'biz:farm', 'Farms & Ranches', 'Buy land by the acre, crops or livestock, workers, distributors, contracts', '🌾', (n) => n.open('Farms & Ranches', farmScreen), 'farm ranch cattle crops acres land harvest');
  add('Businesses & Studios', 'biz:advisor', 'Investment Advisor', 'Hire an advisor to auto-invest your income into stocks or crypto', '💼', (n) => n.open('Investment Advisor', advisorScreen), 'investment advisor portfolio stocks crypto fees');
  add('Businesses & Studios', 'biz:racing', 'Racing Team', 'Race team hub: staff, drivers, car & engine upgrades, sponsors, finances, season', '🏁', (n) => n.open('Racing team', (b, c) => racingScreen(b, c, 'team')), 'racing team motorsport stock car nascar rally drag bike driver'),
  add('Businesses & Studios', 'biz:prodco', 'Production Companies', 'Record label, film, TV and game studios; back other companies', '🎞️', (n) => n.open('Production Companies', prodcoScreen), 'production company label records film tv game studio music artists greenlight royalty invest');
  add('Work', 'work:coaching', 'Coaching', 'Coach or manage a team, transfers, stadium, season review, play the games', '📋', async (n) => { const { coachingScreen } = await import('./coaching.js'); n.open('Coaching', coachingScreen); }, 'coach coaching manager team transfers stadium sports season');
  add('Social', 'soc:profiles', 'Online Profiles', 'Every account on each platform, influencer and channel profile: followers, bio, stats, manage', '🌐', async (n) => { const { profilesScreen } = await import('./onlinehub.js'); n.open('Online Profiles', profilesScreen); }, 'online profiles accounts platforms followers bio influencer');
  add('Social', 'soc:live', 'Live Streaming', 'Go live, stream history, viewers, sponsors, gear, schedule', '🎥', async (n) => { const { liveScreen } = await import('./onlinehub.js'); n.open('Live Streaming', liveScreen); }, 'live streaming streamer twitch viewers sponsors gear schedule');
  add('Social', 'soc:tree', 'Family tree', 'Your relatives at a glance', '🌳', (n) => n.open('Family tree', familyTreeScreen), 'ancestors kids');
  add('Social', 'soc:will', 'Will & Testament', 'Decide who inherits', '📜', (n) => n.open('Will & Testament', willScreen), 'inheritance estate heirs');
  // Activities (one per menu category, plus every item as a searchable pointer to its category)
  const act = await adapter.getActivities();
  for (const m of act.menus) {
    add('Activities', 'act:' + m.id, m.label, `${m.items.length} options`, m.icon, (n) => { setActivityCategory(m.id); n.open('Activities', activitiesScreen); }, 'activities');
    for (const i of m.items) add('Activities', 'act:' + m.id + ':' + i.id, i.label, 'in ' + m.label + (i.minAge ? ' · ' + i.minAge + '+' : ''), m.icon, (n) => { setActivityCategory(m.id); n.open('Activities', activitiesScreen); }, m.label);
  }
  add('Activities', 'act:all', 'All activities', 'Every activity menu', '🎯', (n) => { setActivityCategory(null); n.open('Activities', activitiesScreen); });
  // Skills
  for (const e of Ext.skillEntries()) add('Skills', e.id, e.label, e.sub, e.icon, e.open, e.kw);
  // Legacy
  add('Legacy', 'leg:legacy', 'Family Legacy', 'Generations, heirs, wealth', '🏛️', (n) => n.open('Family Legacy', legacyScreen), 'heirs generations dynasty');
  add('Legacy', 'leg:cemetery', 'Cemetery', 'Past lives and tombstones', '🪦', (n) => n.open('Cemetery', cemeteryScreen), 'graves dead');
  add('Legacy', 'leg:ribbons', 'Ribbons & achievements', 'Shown on your profile', '🏆', (n) => n.open('Profile', profileScreen), 'awards');
  // Settings
  add('Settings', 'set:settings', 'Settings', 'Sound, theme, ads, new life', '⚙️', (n) => n.open('Settings', settingsScreen), 'options mute theme fantasy new life');
  add('Life', 'life:look', 'Appearance & Wardrobe', 'Hair, eyes, skin, clothes and accessories', '🧍', async (n) => { const { appearanceScreen } = await import('./extra.js'); n.open('Appearance', appearanceScreen); }, 'look hair eyes skin clothes outfit glasses beard sprite');
  add('Settings', 'set:terms', 'Terms of Service', 'Opens the terms in a new tab', '📜', () => { window.open('terms.html', '_blank', 'noopener'); }, 'terms legal tos agreement');
  add('Settings', 'set:privacy', 'Privacy Policy', 'What the game stores and where', '🔒', () => { window.open('privacy.html', '_blank', 'noopener'); }, 'privacy legal data policy delete');
  add('Settings', 'set:style', 'Style & accessibility', 'Colors, large text, reduced motion', '🎨', async (n) => { const { styleScreen } = await import('./extra.js'); n.open('Style', styleScreen); }, 'style theme dark light contrast colorblind pastel large text motion accessibility');
  add('Settings', 'set:creator', 'The Creator', 'Edit stats and age of any character (Premium)', '🛠️', async (n) => { const { creatorScreen } = await import('./extra.js'); n.open('The Creator', creatorScreen); }, 'cheat edit stats age character creator');
  add('Settings', 'set:store', 'Premium store', 'Passes and subscription (test toggles)', '⭐', (n) => n.open('Premium', storeScreen), 'passes buy');
  return E;
}

export async function moreScreen(body, { nav }) {
  const E = await buildDirectory(); const list = h('div', { 'data-el': 'directory-list' });
  const inp = h('input', { type: 'search', placeholder: 'Search every screen and option…', 'data-el': 'directory-search', 'aria-label': 'Search directory', style: { width: 'calc(100% - 24px)', margin: '10px 12px 4px', padding: '10px 12px', border: '2px solid #cddaf0', borderRadius: '12px', fontSize: '15px' } });
  const mk = (e) => row({ id: e.id, icon: e.icon, title: e.title || e.label, sub: e.sub, onClick: () => e.open(nav) });
  const draw = () => {
    const q = inp.value.trim().toLowerCase(); list.replaceChildren();
    if (q) {
      const words = q.split(/\s+/), hits = E.filter((e) => { const t = (e.label + ' ' + e.sub + ' ' + e.group + ' ' + e.kw).toLowerCase(); return words.every((w) => t.includes(w)); });
      if (!hits.length) return list.append(empty('No match for “' + inp.value + '”.'));
      list.append(section(hits.length + ' result' + (hits.length > 1 ? 's' : '')), ...hits.slice(0, 80).map((e) => mk({ ...e, sub: e.group + (e.sub ? ' · ' + e.sub : '') })));
      return;
    }
    for (const g of GROUPS) {
      const items = E.filter((e) => e.group === g && !e.id.includes(':act:')); if (!items.length) continue;
      const top = g === 'Activities' ? items.filter((e) => /^act:[^:]+$/.test(e.id)) : items;
      list.append(section(GICON[g] + ' ' + g), ...top.map(mk));
    }
  };
  inp.addEventListener('input', draw); body.append(inp, list); draw();
}
