// RT Employee Benefits board-only skills (board fish/sports, Oct 29 2026; Gary steering: "5 battle moves obtainable ONLY from
// the board"). They are NOT in PLACEHOLDER_SKILLS (src/ui/data.js), so learnsets, wild / trainer pools (skillIdsFor), shops,
// Training Reels and the AI can never pick them; src/battle/data/skills.js adds them to the engine move table only so a
// player creature that was taught one can use it. Teach flow: src/qol/skills_menu.js Team menu "Board skill" row, once the
// Executive Perks node is bought (any compatible creature, any number of times; swapping one out keeps it teachable).
// Names / descs: placeholder text keys system_rt_benefits.board_skills.<id>.{name,desc} (Text Bot owns text/*.py).
// Every number is a PLACEHOLDER for Gary: strong (a clear edge over the 20-60 power pool) but not broken.
export const BOARD_SKILLS = {
  boardtidalaudit: { node: 'skill_tidal_audit', el: 'water', role: 'attack', name: 'Tidal Audit', desc: 'A heavy wave. May lower the foe\u2019s Resolve.',
    move: { basePower: 75, accuracy: 95, energy: 10, secondary: { chance: 30, boosts: { spd: -1 } } } },
  boardovertimeblaze: { node: 'skill_overtime_blaze', el: 'fire', role: 'attack', name: 'Overtime Blaze', desc: 'A huge blast that leaves the user\u2019s Focus lower.',
    move: { basePower: 90, accuracy: 90, energy: 8, self: { boosts: { spa: -1 } } } },
  boardhostilerestructure: { node: 'skill_hostile_restructure', el: 'earth', role: 'attack', name: 'Restructure', desc: 'A ground slam. May slow the foe.',
    move: { basePower: 70, accuracy: 100, energy: 10, secondary: { chance: 30, boosts: { spe: -1 } } } },
  boardteamhuddle: { node: 'skill_team_huddle', el: 'light', role: 'support', name: 'Team Huddle', desc: 'Restores a quarter of Vitality and raises Guard.',
    move: { basePower: 0, accuracy: true, energy: 6, target: 'self', heal: [1, 4], boosts: { def: 1 }, flags: { heal: 1 } } },
  boardhostiletakeover: { node: 'skill_hostile_takeover', el: 'dark', role: 'utility', name: 'Hostile Takeover', desc: 'Lowers the foe\u2019s Might and Focus.',
    move: { basePower: 0, accuracy: 90, energy: 8, boosts: { atk: -1, spa: -1 } } },
};
export const BOARD_SKILL_IDS = Object.keys(BOARD_SKILLS);
export const isBoardSkill = (id) => Object.prototype.hasOwnProperty.call(BOARD_SKILLS, id);
const SPECIAL = new Set(['fire', 'water', 'light', 'dark']);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** Engine move rows (same shape as buildSkills). numBase = first free num. */
export function boardMoves(numBase = 1000) {
  const out = {};
  BOARD_SKILL_IDS.forEach((id, i) => {
    const b = BOARD_SKILLS[id], m = b.move, self = m.target === 'self';
    out[id] = { num: numBase + i, name: b.name, type: cap(b.el), basePower: m.basePower,
      category: m.basePower ? (SPECIAL.has(b.el) ? 'Special' : 'Physical') : 'Status', accuracy: m.accuracy, pp: m.energy, priority: 0, // pp = engine field name
      target: m.target || 'normal', flags: self ? (m.flags || {}) : { protect: 1, ...(m.flags || {}) }, secondary: m.secondary || null,
      boosts: m.boosts, self: m.self, heal: m.heal, status: m.status, kTags: ['board'], boardOnly: true, shortDesc: '', desc: '' };
  });
  return out;
}
/** Fit rule (same as Training Reels): skill element is one of the creature's elements (or their pool alias). */
export function boardFit(id, els = [], alias = {}) {
  const b = BOARD_SKILLS[id]; if (!b) return false;
  return els.some((e) => e === b.el || alias[e] === b.el);
}
