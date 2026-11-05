// Modifier icons + keyword flares (Bit Tensei–style scanability; original Boundwake look, no copied art).
const SVG = {
  health: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 14s-5.5-3.4-5.5-7A3.5 3.5 0 0 1 8 4.2 3.5 3.5 0 0 1 13.5 7C13.5 10.6 8 14 8 14z"/></svg>',
  spirit: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor"/><path stroke="currentColor" stroke-width="1.3" fill="none" d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1 3.5 12.5"/></svg>',
  wits: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2a5 5 0 0 0-5 5c0 2.2 1.4 3.6 2.5 4.5V13h5v-1.5C11.6 10.6 13 9.2 13 7a5 5 0 0 0-5-5zm-1.5 12h3v1h-3z"/></svg>',
  presence: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.8 14 8 8 14.2 2 8z"/></svg>',
  strain: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1 15 14H1zm0 4v5h1.2V5zm0 6.2v1.6h1.2v-1.6z"/></svg>',
  renown: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.4 9.8 6h4.7l-3.8 3 1.4 4.7L8 11.2 3.9 13.7 5.3 9 1.5 6h4.7z"/></svg>',
  mana: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1c2.5 3 5 4.8 5 8a5 5 0 1 1-10 0c0-3.2 2.5-5 5-8z"/></svg>',
  route: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 13V3h2v4h3V3h2v10H8V9H5v4H3zm9-8l2 2-2 2V5z"/></svg>',
  gold: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="currentColor"/><circle cx="8" cy="8" r="4.4" fill="#fff6" opacity=".35"/><circle cx="6.2" cy="6" r="1.6" fill="#fff" opacity=".55"/><circle cx="8" cy="8" r="2" fill="#7a5a10" opacity=".35"/></svg>',
  odds: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2.5" fill="currentColor"/><circle cx="5.5" cy="5.5" r="1.15" fill="#fff" opacity=".92"/><circle cx="10.5" cy="10.5" r="1.15" fill="#fff" opacity=".92"/><circle cx="10.5" cy="5.5" r="1.15" fill="#fff" opacity=".92"/></svg>',
  might: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 7h3V4l7 5-7 5V11H3z"/></svg>',
  grace: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 12c3-6 7-8 10-9-1 3-3 7-9 9z"/></svg>',
  echo: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
  act: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1 3 4v4c0 3.2 2.1 5.5 5 6.5 2.9-1 5-3.3 5-6.5V4z"/></svg>',
  social: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.5" cy="5" r="2.2" fill="currentColor"/><circle cx="10.5" cy="5" r="2.2" fill="currentColor"/><path fill="currentColor" d="M1.5 13c.4-2.4 2.2-3.5 4-3.5s3.6 1.1 4 3.5H1.5zm5 0c.3-1.7 1.4-2.8 2.8-3.2.7.4 1.3 1.1 1.6 2.1.2.6.2.9.1 1.1H6.5z"/></svg>',
  adventure: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5 13 14H3zm0 3.2L5.2 12h5.6z"/><circle cx="8" cy="9.5" r="1.2" fill="#F4E6C8"/></svg>',
  work: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6 2h4l1 2h3v2H2V4h3zm1 5h2v7H7z"/></svg>',
  skill: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2h5c2 0 3 .8 3 2.2V14H5.2C3.8 14 3 13.2 3 12V2zm8 0h2v12h-2z"/></svg>',
  bond: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 13.5S3 10.2 3 6.8A2.8 2.8 0 0 1 8 5.2a2.8 2.8 0 0 1 5 1.6C13 10.2 8 13.5 8 13.5z"/></svg>',
  realm: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="currentColor" d="M8 3v10M3 8h10M5 5l6 6M11 5 5 11"/></svg>',
  codex: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2h5.5c1.5 0 2.5.8 2.5 2v10H5.5C4 14 3 13.2 3 12V2zm8 0h2v12h-2z"/></svg>',
  belong: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 5h12v9H2zm2-2h8l1 2H3z"/></svg>',
  fire: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1c2 3 5 4 5 8a5 5 0 1 1-10 0c0-2 1.5-3.5 3-5 0 2 1 3 2 3S9 5 8 1z"/></svg>',
  water: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1c3 4 5 6.5 5 9a5 5 0 1 1-10 0c0-2.5 2-5 5-9z"/></svg>',
  wind: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 5h9a2 2 0 1 0-1.4-3.4M2 8h11a2 2 0 1 1-1.4 3.4M2 11h7a2 2 0 1 1-1.4 3.4"/></svg>',
  earth: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 12 5 4h6l3 8H2zm4-2h4l-.8-3H6.8z"/></svg>',
  light: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/><path stroke="currentColor" stroke-width="1.4" d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/></svg>',
  shadow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 1.5a4.5 4.5 0 0 1 0 9V3.5z"/></svg>',
};

// Per-skill stand-in icons (unique shapes + colors). Prefer assets/icons/skills/{id}.png when present.
const SKILL_SVG = {
  strength: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 6h3v4H2zm9 0h3v4h-3zM5 7h6v2H5z"/></svg>',
  endurance: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1 3 4v4c0 3 2 5.2 5 6.2 3-1 5-3.2 5-6.2V4z"/></svg>',
  agility: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2c2 0 3 1.5 3 3S9.5 9 8 11 5 7 5 5s1-3 3-3zm0 10c-2 0-4 1-4 2h8c0-1-2-2-4-2z"/></svg>',
  swordsmanship: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M10.5 1.5 14 5l-7 7-3.5-.5L3 8.5zM2 13l1.5-1.5L5 13 3.5 14.5z"/></svg>',
  archery: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M3 8c0-3 2.5-5.5 5.5-5.5S14 5 14 8"/><path fill="currentColor" d="M1 7.3h10v1.4H1zm10.5-.8 3 1.5-3 1.5z"/></svg>',
  shieldwork: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1 3 3v5c0 3.2 2.2 5.5 5 6.5 2.8-1 5-3.3 5-6.5V3z"/></svg>',
  unarmed: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 7c0-1.5 1-2.5 2.2-2.5S9 5.5 9 7v1h1.2c1 0 1.8.8 1.8 1.8V13H4.5V9.5C4.5 8.2 5.2 7 5 7z"/></svg>',
  spellcraft: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5 9.2 6H14l-3.8 2.9L11.5 14 8 11.2 4.5 14l1.3-5.1L2 6h4.8z"/></svg>',
  mana_control: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1c2.5 3 5 4.8 5 8a5 5 0 1 1-10 0c0-3.2 2.5-5 5-8z"/></svg>',
  elementalism: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="6" r="2.2" fill="currentColor"/><circle cx="11" cy="6" r="2.2" fill="currentColor" opacity=".85"/><circle cx="8" cy="11" r="2.2" fill="currentColor" opacity=".7"/></svg>',
  mending: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2v5H3v2h5v5h2V9h5V7H10V2z"/></svg>',
  warding: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5 13 4v3.5c0 3.5-2.2 5.8-5 6.8-2.8-1-5-3.3-5-6.8V4z"/><path fill="#F4E6C8" d="M8 5.2 10.2 8 8 10.8 5.8 8z"/></svg>',
  smithing: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 4h7l2 2v2H8v5H5V8H2z"/></svg>',
  alchemy: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6 1h4v3l3 7a3.2 3.2 0 0 1-3 4H6a3.2 3.2 0 0 1-3-4l3-7z"/></svg>',
  enchanting: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.2 9 5l3.8.2L10 7.5 11.2 11 8 9.1 4.8 11 6 7.5 2.2 5.2 6 5z"/></svg>',
  cooking: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 7h10v1.5c0 2.5-2 4.5-5 4.5S3 11 3 8.5zm2-4h1v3H5zm3 0h1v3H8zm3 0h1v3h-1z"/></svg>',
  tailoring: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1 4 4v3l2 1v6h4V8l2-1V4z"/></svg>',
  charm: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 13.2S3.2 10 3.2 6.6A2.6 2.6 0 0 1 8 5.2a2.6 2.6 0 0 1 4.8 1.4C12.8 10 8 13.2 8 13.2z"/></svg>',
  bartering: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 5h5v6H2zm7 0h5v6H9zM6.2 7.5h3.6v1H6.2z"/></svg>',
  performance: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0-3.5V3h7v2H6v3.5z"/></svg>',
  etiquette: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 3h8v2H4zm1 3h6l1 7H4z"/></svg>',
  stealth: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2a4 4 0 0 1 0 8V4z"/></svg>',
  tracking: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="5" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="11" r="1.4" fill="currentColor"/></svg>',
  husbandry: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 3c2 0 4 1.5 4 4v1H4V7c0-2.5 2-4 4-4zm-5 7h10v3H3z"/></svg>',
  foraging: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 14V8c0-3 2-5 5-5-1 3-3 5-5 5-2 0-4-2-5-5 3 0 5 2 5 5z"/></svg>',
  literacy: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2h5c1.5 0 2.5.8 2.5 2v10H5.2C3.8 14 3 13.2 3 12V2zm8 0h2v12h-2z"/></svg>',
  lore: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5A5.5 5.5 0 1 0 13 9H8z"/><circle cx="8" cy="12.5" r="1.5" fill="currentColor"/></svg>',
  focus: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"/></svg>',
  composure: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 8c0-3 2.2-5.5 5-5.5S13 5 13 8"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M4 10.5h8M5.5 12.5h5"/></svg>',
};
const SKILL_COLOR = {
  strength:'#A85A2A', endurance:'#2F7A48', agility:'#5A82A8', swordsmanship:'#8A4A28', archery:'#3F6B4F',
  shieldwork:'#5A7AAA', unarmed:'#C45A32', spellcraft:'#7A5A9A', mana_control:'#6E8FAF', elementalism:'#C45A7A',
  mending:'#3F8B6A', warding:'#5A5080', smithing:'#8A6420', alchemy:'#2F6B62', enchanting:'#9A6AC8',
  cooking:'#C45A32', tailoring:'#B06A9A', charm:'#C45A7A', bartering:'#E0B14A', performance:'#8A5A9A',
  etiquette:'#B07D24', stealth:'#3A3560', tracking:'#5A7A45', husbandry:'#8A6A3A', foraging:'#2F7A48',
  literacy:'#5A7AAA', lore:'#7A5A9A', focus:'#E0B14A', composure:'#5A82A8',
};
const SKILL_NAME_TO_ID = {
  'Strength':'strength','Endurance':'endurance','Agility':'agility','Swordsmanship':'swordsmanship','Archery':'archery',
  'Shieldwork':'shieldwork','Brawling':'unarmed','Spellcraft':'spellcraft','Mana Control':'mana_control','Elementalism':'elementalism',
  'Mending':'mending','Warding':'warding','Smithing':'smithing','Herbal Alchemy':'alchemy','Enchanting':'enchanting',
  'Cooking':'cooking','Tailoring':'tailoring','Charm':'charm','Bartering':'bartering','Performance':'performance',
  'Courtly Etiquette':'etiquette','Stealth':'stealth','Tracking':'tracking','Animal Handling':'husbandry','Foraging':'foraging',
  'Literacy':'literacy','Lore':'lore','Focus':'focus','Composure':'composure',
};

/** Unique per-skill icon; uses painted PNG when assets/icons/skills/{id}.png exists. */
export function skillIco(id) {
  const sid = SKILL_NAME_TO_ID[id] || id;
  const svg = SKILL_SVG[sid] || SVG.skill;
  const color = SKILL_COLOR[sid] || '#5A7AAA';
  return `<span class="ico ico-sk ico-sk-${sid}" style="color:${color}" data-skill="${sid}"><img class="sk-png" src="assets/icons/skills/${sid}.png" alt="" draggable="false" onload="this.parentNode.classList.add('has-png')" onerror="this.remove()">${svg}</span>`;
}

export const ico = (k, cls = '') => `<span class="ico ico-${k}${cls ? ' ' + cls : ''}" title="">${SVG[k] || SVG.skill}</span>`;

const STAT = {
  health: { ico: 'health', cls: 'flare-health', label: 'Health' },
  spirit: { ico: 'spirit', cls: 'flare-spirit', label: 'Spirit' },
  happiness: { ico: 'spirit', cls: 'flare-spirit', label: 'Spirit' },
  wits: { ico: 'wits', cls: 'flare-wits', label: 'Wits' },
  smarts: { ico: 'wits', cls: 'flare-wits', label: 'Wits' },
  presence: { ico: 'presence', cls: 'flare-presence', label: 'Presence' },
  looks: { ico: 'presence', cls: 'flare-presence', label: 'Presence' },
  strain: { ico: 'strain', cls: 'flare-strain', label: 'Strain' },
  stress: { ico: 'strain', cls: 'flare-strain', label: 'Strain' },
  renown: { ico: 'renown', cls: 'flare-renown', label: 'Renown' },
  fame: { ico: 'renown', cls: 'flare-renown', label: 'Renown' },
  mana: { ico: 'mana', cls: 'flare-mana', label: 'Mana' },
  gold: { ico: 'gold', cls: 'flare-gold', label: 'gold' },
  might: { ico: 'might', cls: 'flare-might', label: 'Might' },
  grace: { ico: 'grace', cls: 'flare-grace', label: 'Grace' },
};

export function statLabel(key) {
  const s = STAT[key] || { ico: 'skill', cls: 'flare-skill', label: key };
  return `${ico(s.ico)}${s.label}`;
}

export function esc(t) {
  return String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

// Longest-first keyword table. Built once; flare() applies to already-escaped text.
const AFF = ['Spark-born', 'Iron Bones', 'Silver Tongue', 'Restless Feet', 'fire', 'water', 'wind', 'earth', 'light', 'shadow'];
const SKILLS = ['Swordsmanship', 'Mana Control', 'Herbal Alchemy', 'Courtly Etiquette', 'Animal Handling', 'Elementalism',
  'Spellcraft', 'Shieldwork', 'Enchanting', 'Performance', 'Foraging', 'Composure', 'Endurance', 'Strength', 'Agility',
  'Archery', 'Brawling', 'Mending', 'Warding', 'Smithing', 'Cooking', 'Tailoring', 'Charm', 'Bartering', 'Stealth',
  'Tracking', 'Literacy', 'Lore', 'Focus'];
const ECHOES = ['Echo of Might', 'Echo of Wits', 'Echo of Mana', 'Echo of Grace', 'Echo of Presence', 'Echo of Renown', 'Echoes', 'Echo'];
const MISC = ['Reincarnate', 'Lantern Market', 'Adventure', 'Belongings', 'Codex', 'Realms', 'Bonds', 'Skills', 'Work',
  'Health', 'Spirit', 'Wits', 'Presence', 'Strain', 'Renown', 'Mana', 'Might', 'Grace', 'gold', 'heir', 'heirs'];

function buildRules() {
  const rows = [];
  const add = (words, cls, icon) => {
    for (const w of words) rows.push({ w, cls, icon, re: new RegExp(`(?<![\\w.])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w])`, 'gi') });
  };
  add(ECHOES, 'flare-echo', 'echo');
  add(['Spark-born', 'Iron Bones', 'Silver Tongue', 'Restless Feet'], 'flare-trait', 'spirit');
  add(['fire'], 'flare-fire', 'fire'); add(['water'], 'flare-water', 'water'); add(['wind'], 'flare-wind', 'wind');
  add(['earth'], 'flare-earth', 'earth'); add(['light'], 'flare-light', 'light'); add(['shadow'], 'flare-shadow', 'shadow');
  add(SKILLS, 'flare-skill', 'skill');
  add(['Health'], 'flare-health', 'health'); add(['Spirit'], 'flare-spirit', 'spirit'); add(['Wits'], 'flare-wits', 'wits');
  add(['Presence'], 'flare-presence', 'presence'); add(['Strain'], 'flare-strain', 'strain'); add(['Renown'], 'flare-renown', 'renown');
  add(['Mana'], 'flare-mana', 'mana'); add(['Might'], 'flare-might', 'might'); add(['Grace'], 'flare-grace', 'grace');
  add(['gold'], 'flare-gold', 'gold');
  add(['Reincarnate', 'heir', 'heirs'], 'flare-echo', 'echo');
  add(['Lantern Market', 'Adventure'], 'flare-adv', 'adventure');
  add(['Work'], 'flare-work', 'work');
  add(['Skills'], 'flare-skill', 'skill');
  add(['Bonds'], 'flare-bond', 'bond');
  add(['Realms'], 'flare-realm', 'realm');
  add(['Belongings'], 'flare-belong', 'belong');
  add(['Codex'], 'flare-codex', 'codex');
  // Sort longest first so "Echo of Might" wins over "Echo" / "Might"
  rows.sort((a, b) => b.w.length - a.w.length);
  return rows;
}
const RULES = buildRules();

/** Flare important terms inside plain (already-escaped) text. Skips short noise. */
export function flare(text) {
  let t = esc(text);
  // Protect already-flared regions if re-entered
  const slots = [];
  for (const r of RULES) {
    t = t.replace(r.re, (m) => {
      const i = slots.length;
      const infoKey = r.icon === 'echo' && /echo/i.test(m) ? (m.toLowerCase().startsWith('echo of') ? m : 'echoes')
        : (r.cls === 'flare-trait' ? m : r.icon);
      let iconHtml = ico(r.icon);
      if (r.cls === 'flare-skill') {
        const sid = SKILL_NAME_TO_ID[m] || SKILL_NAME_TO_ID[Object.keys(SKILL_NAME_TO_ID).find((n) => n.toLowerCase() === String(m).toLowerCase()) || ''];
        if (sid) iconHtml = skillIco(sid);
      }
      const tabMap = { Adventure: 'adv', Work: 'work', Skills: 'skills', Bonds: 'bonds', Realms: 'realms', Belongings: 'bel', Codex: 'codex', 'Lantern Market': 'bonds' };
      const tab = tabMap[r.w] || tabMap[m] || (Object.entries(tabMap).find(([k]) => k.toLowerCase() === String(m).toLowerCase()) || [])[1];
      const tabAttr = tab ? ` data-tab="${tab}"` : '';
      slots.push(`<span class="flare ${r.cls}" data-info="${infoKey}"${tabAttr} role="button" tabindex="0">${iconHtml}<b>${m}</b></span>`);
      return `\u0000${i}\u0000`;
    });
  }
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
}

export function oddsChip(p) {
  if (p == null) return '';
  const pct = Math.round(p * 100);
  const cls = pct >= 70 ? 'odds-good' : pct >= 40 ? 'odds-mid' : 'odds-bad';
  return `<span class="odds ${cls}">${ico('odds')}${pct}%</span>`;
}

/** Wrap a labeled chip that opens the info panel (fate pills, etc.). */
export function infoChip(infoKey, innerHtml, extraClass = 'pill') {
  return `<span class="${extraClass}" data-info="${infoKey}" role="button" tabindex="0">${innerHtml}</span>`;
}
