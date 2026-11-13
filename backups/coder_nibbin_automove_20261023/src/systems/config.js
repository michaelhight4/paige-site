// Kilumen systems (party / bag / heal / shop / puzzles): config flags. systems-gd pass, Oct 22, 2026.
// Every flag that waits on a call from Gary is listed here with its default, so no pending call is made in code.
// Override per run: attachSystems(scene, { config: { ... } }) or ?sys.<flag>=<value> in the URL (main.js hook).

export const SYSTEMS_CONFIG = {
  // Gary ruled Oct 22, 2026 ("energy potions restore energy but are expensive"): potions_restore. Was pending: potions_vs_rest. 'rest_only' (default) = remedies close wounds (HP) only and energy
  // comes back only by resting at a carer; 'potions_restore' = Pep Remedy restores energy in the field;
  // 'partial_top_up' = Pep Remedy restores half of each skill's energy. Text: system_party.item_heal.<mode>.
  potionsVsRest: 'potions_restore',
  // Shops only stock Pep Remedy when the potions_vs_rest call allows it (Gary's ruling: stays behind a flag).
  stockEnergyTonic: true,
  // Gary's pick, Oct 22, 2026 (via Game dev): energy potions, Pep Remedy included, work both in battle and outside.
  // true = Pep Remedy restores energy in battle (items.js BATTLE_ITEMS energy_tonic kEnergy, takes the turn, uses one
  // up). Kept as a flag so it can be flipped: false = Systems.bagForBattle leaves Pep Remedy out of the battle bag.
  // URL: ?sys.pepRemedyRestoresEnergyInBattle=0
  pepRemedyRestoresEnergyInBattle: true,
  // Field Archive (PC boxes). DESIGN_DECISIONS proposal: 8 boxes x 30; the Company ID-L3 perk adds boxes.
  archiveBoxes: 8, archiveBoxSize: 30, archiveExtraBoxes: 4, archiveExtraAtIdLevel: 3,
  // Bag stacks. PLACEHOLDER tuning.
  stackMax: 999,
  // Character models: the icon sheet is a DRAFT Gary has not approved. false = coloured initials only.
  useIconSheet: true,
  iconSheet: 'art/characters/pixel/icons/icons_sheet.png',
  iconJson: 'art/characters/pixel/icons/icons_sheet.json',
  // A visible pickup leaves an empty satchel behind (text: system_items.empty_satchel) instead of vanishing.
  emptySatchelStays: true,
  // Placed items with no real id yet (World Design 'TBD' placeholders) are skipped, not given.
  giveTbdItems: false,
  // Starter flow: the three lab cradles (lab_brookhollow text_pending interact_spots). Species = first
  // stage of each starter line (ui/data.js SPECIES line 1/2/3). Gary confirmed Oct 22, 2026: starters at level 5.
  starterMap: 'lab_brookhollow',
  starterCradles: { cradle_1: 'tumbloam', cradle_2: 'cindrip', cradle_3: 'rillop' },
  starterLevel: 5,
  starterFlag: 'got_starter',
  // Replace the UI-pass placeholder Team / Pack / Shop screens with the systems ones (ui.scr_team etc.).
  replaceUiScreens: true,
  // After a carer rest, show the heal board (team bars, last rest point, copay) until the player closes it.
  healBoard: true,
  // Gold coin held item: x1.5 trainer money (DESIGN_DECISIONS). PLACEHOLDER id until Coder's items.js has it.
  goldCoinItem: 'gold_coin', goldCoinMult: 1.5,
};

/** Merge overrides (object, or URLSearchParams with sys.<key>=value) over the defaults. */
export function systemsConfig(over = {}) {
  const cfg = { ...SYSTEMS_CONFIG };
  if (over && typeof over.get === 'function' && typeof over.keys === 'function') {
    for (const k of over.keys()) {
      if (!k.startsWith('sys.')) continue;
      const key = k.slice(4), raw = over.get(k);
      if (!(key in cfg)) continue;
      const def = cfg[key];
      cfg[key] = typeof def === 'boolean' ? raw === '1' || raw === 'true' : typeof def === 'number' ? Number(raw) || def : raw;
    }
    return cfg;
  }
  return { ...cfg, ...(over || {}) };
}

/** Money in text: a plain number until Text Bot names the currency ("coin" is reserved for Masters' tokens). */
export const fmtMoney = (n) => Math.max(0, Math.floor(n || 0)).toLocaleString('en-US');
