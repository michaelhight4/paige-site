// Kilumen real-time battles (rtb, DEV ONLY prototype, Oct 29 2026): how each existing skill plays in real time.
// The skill's numbers (power, element, category, Energy, accuracy, heal/boosts/status) all come from
// src/battle/data/skills.js; this file only adds a SHAPE (how it travels) and timings. Every number is a PLACEHOLDER for Gary.
//   bolt  fast small projectile          wave  slow wide projectile that passes through
//   lob   arcing shot, splash on landing cone  short spray in front
//   wisp  slow homing projectile         melee short arc in front
//   dash  lunge that hits along the path slam  ring around the user
//   self  heal / boost on the user
export const SHAPE = {
  rippleshot: 'bolt', frillsplash: 'wave', pebbletoss: 'lob', whiskertickle: 'melee', sparksneeze: 'cone', coalcharge: 'dash',
  snoutshove: 'melee', ashpuff: 'cone', shellroll: 'dash', mossslam: 'slam', hornnudge: 'melee', burrowdown: 'slam',
  gustdart: 'bolt', streamerlash: 'wave', swoop: 'dash', tailwind: 'self', haloflash: 'slam', dawnglow: 'self', flutter: 'melee',
  gleam: 'bolt', lanternhaunt: 'wisp', duskbite: 'melee', fadeout: 'self', earflick: 'melee', threadweave: 'wave', beadspark: 'bolt',
  unravel: 'self', ferretdash: 'dash', pounce: 'dash', nudge: 'melee', stomp: 'slam', huff: 'cone',
};

// Per shape: projectile speed (px/s, native world px, TILE = 64), radius, range, windup (s), recovery (s), knockback.
export const SHAPE_STATS = {
  bolt: { speed: 620, r: 10, range: 460, windup: 0.10, recover: 0.12, kb: 120 },
  wave: { speed: 360, r: 22, range: 380, windup: 0.16, recover: 0.18, kb: 160, pierce: true },
  lob: { speed: 380, r: 12, range: 340, windup: 0.18, recover: 0.16, kb: 140, splash: 54 },
  wisp: { speed: 260, r: 13, range: 520, windup: 0.14, recover: 0.14, kb: 90, homing: 3.2 },
  cone: { range: 120, arc: 0.7, windup: 0.12, recover: 0.20, kb: 110 },
  melee: { range: 74, arc: 1.1, windup: 0.08, recover: 0.16, kb: 190 },
  dash: { dist: 170, time: 0.16, windup: 0.14, recover: 0.22, kb: 260 },
  slam: { range: 92, windup: 0.22, recover: 0.24, kb: 230 },
  self: { windup: 0.10, recover: 0.25, kb: 0 },
};

/** Real-time cooldown (s) for a skill: stronger skills wait longer. PLACEHOLDER: 0.45 s + power / 60 (Status 4 s). */
export const cooldownFor = (sk) => (sk?.basePower ? 0.45 + sk.basePower / 60 : 4);
/** Shape for a skill id (fallback: Special -> bolt, Physical -> melee, Status -> self). */
export const shapeOf = (id, sk) => SHAPE[id] || (!sk?.basePower ? (sk?.status ? 'cone' : 'self') : sk.category === 'Special' ? 'bolt' : 'melee');
/** How far the AI wants to stand to use this skill (px). */
export function reachOf(id, sk) {
  const sh = shapeOf(id, sk), s = SHAPE_STATS[sh];
  if (sh === 'self') return Infinity;
  if (s.speed) return s.range * 0.75;
  if (sh === 'dash') return s.dist + 20;
  return s.range + 10;
}
