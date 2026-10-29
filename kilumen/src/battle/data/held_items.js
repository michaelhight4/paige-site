// Kilumen held items in battle (design/HELD_ITEMS.md, build step 1 / P1, Oct 29 2026). Data rows for the engine's item
// table, merged by rules.js buildItems(). A creature's `held` (game id, saved on the creature) goes into the engine set as
// `item` (battle.js toSet), and the engine's own item events run these handlers.
// Handlers are adapted from Pokemon Showdown data/items.ts (MIT, (c) 2011-2026 Guangcong Luo and other contributors,
// github.com/smogon/pokemon-showdown; full notice in THIRD_PARTY_LICENSES). The Showdown id each row is adapted from is in
// the `src` comment; names, flavour and numbers are Kilumen's own. All numbers PLACEHOLDER until Gary signs off.
// Locked (Gary, Oct 29 2026): Charms x1.15; strong items (survive-a-hit, choice-lock, life drain; Quick Tassel is sold) are earned
// only, never sold (`earned: true`, no price). Shop prices here are draft numbers from the spec; shop rows are P2.
// Not here (other owners / later phases): Apprentice Badge (XP item), Tally Purse, field items, sports items, Gold Coin and
// Team Link Band (field only; the band's XP share is battle.js linkShare).

const cap = (s) => s[0].toUpperCase() + s.slice(1);
/** engine fixed-point x1.15 (Showdown uses [4915, 4096] = x1.2 for its type boosters) */
export const CHARM_MULT = [4710, 4096];

// element -> [game id, name, draft price or null (earned: quest / hall / post-game)]
const CHARMS = {
  grass: ['sprig_charm', 'Sprig Charm', 2000], bug: ['shellbead_charm', 'Shellbead Charm', null],
  water: ['droplet_charm', 'Droplet Charm', 2000], sea: ['tidebell_charm', 'Tidebell Charm', 2000],
  freshwater: ['brookstone_charm', 'Brookstone Charm', null], normal: ['plainthread_charm', 'Plainthread Charm', 2000],
  light: ['glint_charm', 'Glint Charm', 2000], spirit: ['wisp_charm', 'Wisp Charm', null], ghost: ['hush_charm', 'Hush Charm', null],
  wind: ['gustfeather_charm', 'Gustfeather Charm', 2000], bird: ['quill_charm', 'Quill Charm', 2000],
  earth: ['clodstone_charm', 'Clodstone Charm', 2200], fire: ['ember_charm', 'Ember Charm', 2200],
  swamp: ['bogroot_charm', 'Bogroot Charm', 2400], rain: ['drizzle_charm', 'Drizzle Charm', 2400],
  mystic: ['runestitch_charm', 'Runestitch Charm', 2400], dark: ['dusk_charm', 'Dusk Charm', 2400],
  magma: ['slag_charm', 'Slag Charm', 2600], dragos: ['scaleshard_charm', 'Scaleshard Charm', null],
  demon: ['horncap_charm', 'Horncap Charm', null], devil: ['brimtooth_charm', 'Brimtooth Charm', 3000],
  angelic: ['halo_charm', 'Halo Charm', null], god: ['crownstone_charm', 'Crownstone Charm', null],
  legendary: ['mythmark_charm', 'Mythmark Charm', null],
};

// choice-lock rows share these (src: choiceband / choicespecs / choicescarf onStart + onModifyMove)
const lockOn = {
  isChoice: true,
  onStart(c) { c.removeVolatile('choicelock'); },
  onModifyMove(move, c) { c.addVolatile('choicelock'); },
};

/** game id -> engine row (k* fields are Kilumen's; price null = earned only) */
export const HELD_BATTLE_ITEMS = {
  // ---- Charms (src: charcoal / mysticwater onBasePower) ----
  ...Object.fromEntries(Object.entries(CHARMS).map(([el, [id, name, price]]) => [id, {
    name, kHeldKind: 'charm', kElement: el, kPrice: price, kEarned: price == null,
    onBasePowerPriority: 15,
    onBasePower(bp, user, target, move) { if (move?.type === cap(el)) return this.chainModify(CHARM_MULT); },
  }])),
  // ---- 1-2 stat boosts (src: choiceband / choicespecs stat handler, without the lock) ----
  iron_brace: { name: 'Iron Brace', kPrice: 3000, onModifyAtkPriority: 1, onModifyAtk() { return this.chainModify(1.1); } },
  focus_lens: { name: 'Focus Lens', kPrice: 3000, onModifySpAPriority: 1, onModifySpA() { return this.chainModify(1.1); } },
  // ---- 3 Hide Vest (src: eviolite), x1.15 instead of x1.5 ----
  hide_vest: {
    name: 'Hide Vest', kPrice: null, kEarned: true,
    onModifyDefPriority: 2, onModifyDef(d, c) { if (c.species?.evos?.length) return this.chainModify(1.15); },
    onModifySpDPriority: 2, onModifySpD(d, c) { if (c.species?.evos?.length) return this.chainModify(1.15); },
  },
  // ---- 4 Moss Wrap (src: leftovers) ----
  moss_wrap: { name: 'Moss Wrap', kPrice: null, kEarned: true, onResidualOrder: 5, onResidualSubOrder: 4, onResidual(c) { this.heal(c.baseMaxhp / 16); } },
  // ---- 5 Sap Vial (src: shellbell), life drain = earned ----
  sap_vial: {
    name: 'Sap Vial', kPrice: null, kEarned: true, onAfterMoveSecondarySelfPriority: -1,
    onAfterMoveSecondarySelf(c, target, move) { if (move.totalDamage && !c.forceSwitchFlag) this.heal(move.totalDamage / 8, c); },
  },
  // ---- 6 Remedy Pouch (src: sitrusberry onUpdate; used, not eaten, so the log never reads as food) ----
  remedy_pouch: {
    name: 'Remedy Pouch', kPrice: 400, kConsumable: true,
    onUpdate(c) { if (c.hp && c.hp <= c.maxhp / 2 && c.useItem()) this.heal(c.baseMaxhp / 4, c); },
  },
  // ---- 7 Last Stand Ribbon (src: focussash) ----
  last_stand_ribbon: {
    name: 'Last Stand Ribbon', kPrice: null, kEarned: true, kConsumable: true, onDamagePriority: -40,
    onDamage(damage, target, source, effect) {
      if (target.hp === target.maxhp && damage >= target.hp && effect?.effectType === 'Move' && target.useItem()) return target.hp - 1;
    },
  },
  // ---- 8 Grit Buckle (src: focusband) ----
  grit_buckle: {
    name: 'Grit Buckle', kPrice: null, kEarned: true, onDamagePriority: -40,
    onDamage(damage, target, source, effect) {
      if (this.randomChance(1, 10) && damage >= target.hp && effect?.effectType === 'Move') { this.add('-activate', target, 'item: Grit Buckle'); return target.hp - 1; }
    },
  },
  // ---- 9-11 Oath items (src: choiceband / choicespecs / choicescarf + conditions.ts choicelock) ----
  oath_band: { name: 'Oath Band', kPrice: null, kEarned: true, ...lockOn, onModifyAtkPriority: 1, onModifyAtk() { return this.chainModify(1.5); } },
  oath_lens: { name: 'Oath Lens', kPrice: null, kEarned: true, ...lockOn, onModifySpAPriority: 1, onModifySpA() { return this.chainModify(1.5); } },
  oath_spurs: { name: 'Oath Spurs', kPrice: null, kEarned: true, ...lockOn, onModifySpe() { return this.chainModify(1.5); } },
  // ---- 12 Hawk Lens (src: scopelens) ----
  hawk_lens: { name: 'Hawk Lens', kPrice: 2800, onModifyCritRatio(r) { return r + 1; } },
  // ---- 13 Steady Sight (src: widelens) ----
  steady_sight: {
    name: 'Steady Sight', kPrice: 2500, onSourceModifyAccuracyPriority: -2,
    onSourceModifyAccuracy(acc) { if (typeof acc === 'number') return this.chainModify([4505, 4096]); },
  },
  // ---- 14 Mint Sprig (src: lumberry; used, not eaten) ----
  mint_sprig: {
    name: 'Mint Sprig', kPrice: 500, kConsumable: true,
    onUpdate(c) { if ((c.status || c.volatiles.confusion) && c.useItem()) { c.cureStatus(); c.removeVolatile('confusion'); } },
  },
  // ---- 15 Clear Bell (src: Showdown items.ts / abilities.ts onSetStatus + onTryAddVolatile guard pattern) ----
  // holder can't be made drowsy (Kilumen's sleep) or confused. Earned: Revival Heights hidden spot (quest stand-in).
  clear_bell: {
    name: 'Clear Bell', kPrice: null, kEarned: true,
    onSetStatus(status, target, source, effect) {
      if (status.id !== 'drowsy' && status.id !== 'slp') return;
      if (effect && effect.effectType === 'Move') this.add('-activate', target, 'item: Clear Bell');
      return false;
    },
    onTryAddVolatile(status, target) {
      if (status.id !== 'confusion') return;
      this.add('-activate', target, 'item: Clear Bell'); return null;
    },
  },
  // ---- 16 Quick Tassel (src: quickclaw), shop 3,000 (Gary, Oct 29: not earned-only) ----
  quick_tassel: {
    name: 'Quick Tassel', kPrice: 3000, onFractionalPriorityPriority: -2,
    onFractionalPriority(priority, c) { if (priority <= 0 && this.randomChance(1, 5)) { this.add('-activate', c, 'item: Quick Tassel'); return 0.1; } },
  },
  // ---- 24 Tamer's Thread (own code): crystal catch chance x1.2 while the holder is out, wild only (engine Re reads
  // kCatchMult from the active creature's item; capture.js mirrors it for the shell UI). Earned: Mirefen hidden spot.
  tamers_thread: { name: "Tamer's Thread", kPrice: null, kEarned: true, kCatchMult: 1.2 },
  // ---- 17 Swift Anklet (src: choicescarf speed handler, no lock) ----
  swift_anklet: { name: 'Swift Anklet', kPrice: null, kEarned: true, onModifySpe() { return this.chainModify(1.1); } },
};

/** game id -> engine id (engine toID drops underscores, same rule as rules.js buildItems) */
export const heldEngineId = (id) => String(id || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const BY_ENGINE = new Map(Object.keys(HELD_BATTLE_ITEMS).map((id) => [heldEngineId(id), id]));
/** creature.held -> engine item id, or '' when the item has no battle effect (Gold Coin, Team Link Band, unknown) */
export const heldToEngine = (held) => (held && BY_ENGINE.has(heldEngineId(held)) ? heldEngineId(held) : '');
export const heldFromEngine = (eid) => BY_ENGINE.get(eid) || null;

/** choicelock volatile (src: Showdown data/conditions.ts choicelock; dynamax / snatch / bounce checks dropped) */
export const CHOICE_LOCK = {
  name: 'choicelock', noCopy: true,
  onStart() { if (!this.activeMove?.id) return false; this.effectState.move = this.activeMove.id; },
  onBeforeMove(c, target, move) {
    if (!c.getItem().isChoice) { c.removeVolatile('choicelock'); return; }
    if (!c.ignoringItem() && move.id !== this.effectState.move && move.id !== 'struggle') {
      this.addMove('move', c, move.name); this.attrLastMove('[still]'); this.add('-fail', c); return false;
    }
  },
  onDisableMove(c) {
    if (!c.getItem().isChoice || !c.hasMove(this.effectState.move)) { c.removeVolatile('choicelock'); return; }
    if (c.ignoringItem()) return;
    for (const s of c.moveSlots) if (s.id !== this.effectState.move) c.disableMove(s.id, false);
  },
};
