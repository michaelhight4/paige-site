// Kilumen sports: the rules that turn type + body shape + base stats into athletic ranges (Oct 28, 2026, dev only).
// Used by tools/sports/gen_athletics.mjs to build data/athletics.gen.js. Tune here (broad rules) or in
// data/athletics_overrides.json (per species), then run: node tools/sports/gen_athletics.mjs
export const STATS = ['speed', 'power', 'stamina', 'agility', 'focus'];
export const TRAITS = ['sprinter', 'steady_pacer', 'fast_starter', 'clutch_finisher', 'iron_lungs'];
// Per-type centre of each stat on a 1-100 scale. A species range is centre +- HALF_WIDTH, then shifted.
export const HALF_WIDTH = 14;
export const TYPE_CENTRE = {
  normal:     { speed: 50, power: 50, stamina: 50, agility: 50, focus: 50 },
  earth:      { speed: 40, power: 60, stamina: 60, agility: 38, focus: 50 },
  fire:       { speed: 58, power: 62, stamina: 44, agility: 52, focus: 42 },
  water:      { speed: 48, power: 48, stamina: 58, agility: 52, focus: 52 },
  sea:        { speed: 46, power: 52, stamina: 62, agility: 46, focus: 48 },
  freshwater: { speed: 56, power: 44, stamina: 52, agility: 60, focus: 48 },
  wind:       { speed: 64, power: 40, stamina: 46, agility: 64, focus: 46 },
  bird:       { speed: 62, power: 42, stamina: 46, agility: 66, focus: 50 },
  light:      { speed: 56, power: 42, stamina: 46, agility: 54, focus: 62 },
  angelic:    { speed: 50, power: 44, stamina: 52, agility: 50, focus: 66 },
  dark:       { speed: 56, power: 50, stamina: 44, agility: 60, focus: 54 },
  ghost:      { speed: 50, power: 36, stamina: 50, agility: 62, focus: 58 },
  mystic:     { speed: 44, power: 40, stamina: 48, agility: 48, focus: 70 },
  spirit:     { speed: 46, power: 38, stamina: 50, agility: 54, focus: 66 },
  bug:        { speed: 52, power: 46, stamina: 50, agility: 60, focus: 44 },
  swamp:      { speed: 38, power: 52, stamina: 64, agility: 44, focus: 46 },
  magma:      { speed: 38, power: 70, stamina: 56, agility: 34, focus: 44 },
  grass:      { speed: 46, power: 48, stamina: 58, agility: 50, focus: 52 },
  rain:       { speed: 50, power: 42, stamina: 54, agility: 56, focus: 54 },
  demon:      { speed: 54, power: 64, stamina: 50, agility: 50, focus: 46 },
  devil:      { speed: 56, power: 68, stamina: 52, agility: 52, focus: 48 },
  dragos:     { speed: 58, power: 66, stamina: 58, agility: 50, focus: 54 },
  legendary:  { speed: 60, power: 70, stamina: 66, agility: 54, focus: 66 },
  god:        { speed: 64, power: 70, stamina: 66, agility: 60, focus: 72 },
};
// Body shape guessed from the species id (no shape field in the data yet). First match wins; tune freely.
export const SHAPES = [
  ['serpent', /eel|wyrm|worm|coil|pede|slug|pike|spiral|ribbon/, { speed: 2, stamina: 6, agility: -4, power: 0, focus: 0 }],
  ['blob', /blob|goo|puff|muff|mallow|bubble|squidge|cube|puddle|bloam|foam|drowse|wump|bulb|clump|mote/, { speed: -10, stamina: 10, agility: -6, power: -2, focus: 2 }],
  ['avian', /lark|spar|owl|dove|wren|finch|pipit|tern|kite|grouse|bill|crow|plume|seraph|wing|rook|quill/, { speed: 4, agility: 10, power: -6, stamina: -2, focus: 2 }],
  ['canine_feline', /pup|hound|kit|paw|lunx|lynx|tabby|mink|mouse|mouser|abby|whisk|foal|pony|stag|hart|lop|hop|bex|lamb|bleat|seal|lop/, { speed: 8, agility: 4, stamina: 0, power: 0, focus: -2 }],
  ['armoured', /dillo|rab|crab|claw|shell|beetle|bulwark|warden|titan|ox|rock|stone|cairn|mont|rubbl|geod|lith|cragm|ingot|clinker|hull|whale|tusk|horn|back/, { speed: -8, power: 8, stamina: 6, agility: -6, focus: 0 }],
  ['insect', /mite|ant|fly|tick|weevil|hum|bel|bug|nip|gauze|husk/, { speed: 2, agility: 6, stamina: -4, power: -2, focus: 0 }],
  ['wisp', /wisp|wraith|ghast|grim|wick|lamp|lume|glint|halo|candle|lantern|mote|kin$/, { speed: 0, power: -6, stamina: 0, agility: 4, focus: 6 }],
];
export const shapeOf = (id) => (SHAPES.find(([, re]) => re.test(id)) || ['standard', null, {}]);
// Base-stat lean: each battle stat nudges one athletic stat (pts per 10 above/below 60, capped).
export const BASE_LEAN = { speed: ['spe', 2.5], power: ['atk', 2], stamina: [['hp', 'def'], 2], agility: [['spe', 'spd'], 1.5], focus: [['spa', 'spd'], 1.5] };
export const LEAN_CAP = 10;
// Evolved stages get a higher range so later forms do better (stage 0/1/2; -1 = single stage, treated as 1).
export const STAGE_SHIFT = { 0: -4, 1: 2, 2: 7 };
// Trait base weights and which stat raises the odds (weight += stat centre above 50 / 5).
export const TRAIT_LEAN = { sprinter: 'speed', steady_pacer: 'stamina', fast_starter: 'agility', clutch_finisher: 'focus', iron_lungs: 'power' };
export const SHAPE_TRAIT = { avian: { fast_starter: 4 }, blob: { steady_pacer: 6, sprinter: -3 }, serpent: { steady_pacer: 4 }, canine_feline: { sprinter: 5 }, armoured: { iron_lungs: 5 }, insect: { fast_starter: 3 }, wisp: { clutch_finisher: 4 } };
export const SECOND_TRAIT_CHANCE = 0.3;
// Meet scoring: points per placing (summed across events at a meet later). Heats give no points; the final does.
export const POINTS = { 1: 10, 2: 6, 3: 3, 4: 1 };
export const MEET = { heatSize: 4, heats: 2, qualifyPerHeat: 2 };
