// Boundwake modifier info panel — blurbs from real engine/data only (Nov 5, 2026 CT).
import { ico, esc } from './flare.js';

/** Effects that are actually applied in bw_engine.js / pack notes. */
const INFO = {
  fire: {
    name: 'Fire affinity', ico: 'fire', cls: 'flare-fire', kind: 'Affinity',
    body: 'Your birth affinity. Elementalism draws on this element for spellwork and training.',
  },
  water: {
    name: 'Water affinity', ico: 'water', cls: 'flare-water', kind: 'Affinity',
    body: 'Your birth affinity. Elementalism draws on this element for spellwork and training.',
  },
  wind: {
    name: 'Wind affinity', ico: 'wind', cls: 'flare-wind', kind: 'Affinity',
    body: 'Your birth affinity. Elves often lean wind. Elementalism draws on this element for spellwork and training.',
  },
  earth: {
    name: 'Earth affinity', ico: 'earth', cls: 'flare-earth', kind: 'Affinity',
    body: 'Your birth affinity. Dwarves often lean earth. Elementalism draws on this element for spellwork and training.',
  },
  light: {
    name: 'Light affinity', ico: 'light', cls: 'flare-light', kind: 'Affinity',
    body: 'Your birth affinity. Elementalism draws on this element for spellwork and training.',
  },
  shadow: {
    name: 'Shadow affinity', ico: 'shadow', cls: 'flare-shadow', kind: 'Affinity',
    body: 'Your birth affinity. Elementalism draws on this element for spellwork and training.',
  },
  trait_spark_born: {
    name: 'Spark-born', ico: 'spirit', cls: 'flare-trait', kind: 'Trait',
    body: 'Mana awakens at birth — arcane skills unlock and you start with a small mana pool. Each year also adds +1 Strain.',
  },
  'spark-born': null, // alias filled below
  trait_iron_bones: {
    name: 'Iron Bones', ico: 'health', cls: 'flare-trait', kind: 'Trait',
    body: 'Sturdier frame: +10 Health at birth (capped at 100).',
  },
  trait_silver_tongue: {
    name: 'Silver Tongue', ico: 'presence', cls: 'flare-trait', kind: 'Trait',
    body: 'A silver tongue marks you at fate — people notice the charm in how you speak.',
  },
  trait_restless: {
    name: 'Restless Feet', ico: 'adventure', cls: 'flare-trait', kind: 'Trait',
    body: 'You never sit still for long. Exploration and travel events find you more often. Each year adds +1 Strain from the road in your bones.',
  },
  echo_might: {
    name: 'Echo of Might', ico: 'might', cls: 'flare-echo', kind: 'Echo',
    body: 'On reincarnation, seeds Strength and Endurance. First pick +8 to each; each repeat on the same Echo adds half the previous bonus (+4, +2, …).',
  },
  echo_wits: {
    name: 'Echo of Wits', ico: 'wits', cls: 'flare-echo', kind: 'Echo',
    body: 'On reincarnation, seeds Literacy and Lore (+8 first pick, then halved per repeat: +4, +2, …).',
  },
  echo_mana: {
    name: 'Echo of Mana', ico: 'mana', cls: 'flare-echo', kind: 'Echo',
    body: 'On reincarnation, seeds Mana Control and Spellcraft (+8 first, halved per repeat) and raises max mana by about twice that bonus. Arcane skills still need awakening unless Spark-born (or another unlock) opened them.',
  },
  echo_grace: {
    name: 'Echo of Grace', ico: 'grace', cls: 'flare-echo', kind: 'Echo',
    body: 'On reincarnation, seeds Agility and Stealth (+8 first pick, halved per repeat).',
  },
  echo_presence: {
    name: 'Echo of Presence', ico: 'presence', cls: 'flare-echo', kind: 'Echo',
    body: 'On reincarnation, seeds Charm and Courtly Etiquette (+8 first, halved per repeat) and raises Presence (looks) by that bonus.',
  },
  echo_renown: {
    name: 'Echo of Renown', ico: 'renown', cls: 'flare-echo', kind: 'Echo',
    body: 'On reincarnation, raises Renown (fame) by +8 on the first pick, then halved per repeat. No skill seeds.',
  },
  echoes: {
    name: 'Echoes', ico: 'echo', cls: 'flare-echo', kind: 'Legacy',
    body: 'Bonuses carried from a past life when you reincarnate. You pick one Echo at death; repeats of the same Echo are halved. Heirs do not keep Echoes — they take lineage instead.',
  },
  echo: {
    name: 'Echoes', ico: 'echo', cls: 'flare-echo', kind: 'Legacy',
    body: 'Bonuses carried from a past life when you reincarnate. You pick one Echo at death; repeats of the same Echo are halved. Heirs do not keep Echoes — they take lineage instead.',
  },
  gold: {
    name: 'Gold', ico: 'gold', cls: 'flare-gold', kind: 'Currency',
    body: 'Coin of the realms. Starting gold follows family wealth (poor 5 · common 30 · comfortable 120 · noble 600). Wages, finds, and spends change the purse; it is not a skill.',
  },
  health: {
    name: 'Health', ico: 'health', cls: 'flare-health', kind: 'Stat',
    body: 'Body condition (0–100). Injury, age, and hard years can wear it down; rest and care help. Reaching 0 with no recovery path ends the life.',
  },
  spirit: {
    name: 'Spirit', ico: 'spirit', cls: 'flare-spirit', kind: 'Stat',
    body: 'Boundwake’s happiness/morale bar. Social time and rest raise it; strain and misfortune pull it down.',
  },
  wits: {
    name: 'Wits', ico: 'wits', cls: 'flare-wits', kind: 'Stat',
    body: 'Boundwake’s smarts bar — how sharp you read a room or a riddle. Used as a base for bookish and clever checks.',
  },
  presence: {
    name: 'Presence', ico: 'presence', cls: 'flare-presence', kind: 'Stat',
    body: 'Boundwake’s looks/presence bar — how strongly others notice you. Echo of Presence also raises it on reincarnation.',
  },
  strain: {
    name: 'Strain', ico: 'strain', cls: 'flare-strain', kind: 'Stat',
    body: 'Boundwake’s stress bar. Spark-born and Restless Feet add +1 each year. High strain makes life harder; rest eases it.',
  },
  renown: {
    name: 'Renown', ico: 'renown', cls: 'flare-renown', kind: 'Stat',
    body: 'Boundwake’s fame bar. Adventures and deeds raise it; Echo of Renown seeds it on reincarnation.',
  },
  mana: {
    name: 'Mana', ico: 'mana', cls: 'flare-mana', kind: 'Resource',
    body: 'Arcane reserve. Max mana starts from race and Echo of Mana; Spark-born awakens mana at birth. Arcane skills stay locked until mana is awakened.',
  },
  might: {
    name: 'Might', ico: 'might', cls: 'flare-might', kind: 'Echo theme',
    body: 'Short name for Echo of Might — seeds Strength and Endurance on reincarnation (+8, then halved per repeat).',
  },
  grace: {
    name: 'Grace', ico: 'grace', cls: 'flare-grace', kind: 'Echo theme',
    body: 'Short name for Echo of Grace — seeds Agility and Stealth on reincarnation (+8, then halved per repeat).',
  },
};

// Name aliases → INFO keys (flare text / trait names / echo short names)
const ALIAS = {
  'spark-born': 'trait_spark_born', spark_born: 'trait_spark_born',
  'iron bones': 'trait_iron_bones', iron_bones: 'trait_iron_bones',
  'silver tongue': 'trait_silver_tongue', silver_tongue: 'trait_silver_tongue',
  'restless feet': 'trait_restless', restless: 'trait_restless', restless_feet: 'trait_restless',
  'echo of might': 'echo_might', might: 'echo_might',
  'echo of wits': 'echo_wits',
  'echo of mana': 'echo_mana',
  'echo of grace': 'echo_grace',
  'echo of presence': 'echo_presence',
  'echo of renown': 'echo_renown',
  echoes: 'echoes', echo: 'echo',
  happiness: 'spirit', smarts: 'wits', looks: 'presence', fame: 'renown', stress: 'strain',
};

export function resolveInfoKey(raw) {
  if (!raw) return null;
  const k = String(raw).trim();
  if (INFO[k]) return k;
  const low = k.toLowerCase().replace(/^echo_/, 'echo_');
  if (INFO[low]) return low;
  if (ALIAS[low]) return ALIAS[low];
  if (ALIAS[k]) return ALIAS[k];
  // "Echo of Might" style
  const slug = low.replace(/\s+/g, '_');
  if (INFO[slug]) return slug;
  if (ALIAS[slug]) return ALIAS[slug];
  return null;
}

export function getInfo(raw) {
  const key = resolveInfoKey(raw);
  return key ? { key, ...INFO[key] } : null;
}

let openEl = null, lastFocus = null;

export function closeInfo() {
  if (!openEl) return;
  openEl.remove(); openEl = null;
  document.body.classList.remove('info-open');
  if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch {}
  lastFocus = null;
}

export function openInfo(raw) {
  const info = getInfo(raw);
  if (!info) return false;
  closeInfo();
  lastFocus = document.activeElement;
  document.body.classList.add('info-open');
  openEl = document.createElement('div');
  openEl.className = 'info-pop';
  openEl.setAttribute('role', 'dialog');
  openEl.setAttribute('aria-modal', 'true');
  openEl.setAttribute('aria-label', info.name);
  openEl.innerHTML = `
    <button type="button" class="info-backdrop" data-info-close aria-label="Close info"></button>
    <div class="card info-card ${info.cls || ''}">
      <div class="card-hd">${ico(info.ico)} ${esc(info.name)}<button type="button" class="info-x" data-info-close aria-label="Close">×</button></div>
      <div class="card-body">
        <p class="info-kind">${esc(info.kind || 'Modifier')}</p>
        <p class="info-body">${esc(info.body)}</p>
        <div class="actions"><button type="button" class="ghost" data-info-close>Got it</button></div>
      </div>
    </div>`;
  document.body.append(openEl);
  const closer = openEl.querySelector('[data-info-close].info-x, .actions [data-info-close]');
  (closer || openEl.querySelector('[data-info-close]'))?.focus?.();
  return true;
}

function chipFromEvent(ev) {
  const chip = ev.target.closest?.('[data-info]');
  if (!chip || !chip.dataset.info) return null;
  // Don't steal Age, choice, travel, train, etc.
  if (ev.target.closest('button[data-a], button.age, .choices button, .dock, a[href], [data-tab]')) return null;
  return chip;
}

export function mountInfoClicks(root = document) {
  root.addEventListener('click', (ev) => {
    if (ev.target.closest?.('[data-info-close]')) { closeInfo(); return; }
    const chip = chipFromEvent(ev);
    if (!chip) return;
    ev.preventDefault();
    ev.stopPropagation();
    openInfo(chip.dataset.info);
  }, true);
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && openEl) { closeInfo(); return; }
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const chip = chipFromEvent(ev);
    if (!chip) return;
    ev.preventDefault();
    openInfo(chip.dataset.info);
  });
}
