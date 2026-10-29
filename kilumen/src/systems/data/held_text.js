// PLACEHOLDER held-item text for Text Bot (Oct 29 2026, held items P2-P5). The Pack shows these when the Text Bot
// catalogue (overworld_lines.json system_item_catalogue) has no pages for the item. Blocked-word list checked by
// tests/held_items.test.mjs.
export const HELD_DESC = {
  iron_brace: 'Held: Might is a little higher.',
  focus_lens: 'Held: Focus is a little higher.',
  hide_vest: 'Held: takes less damage if it can still grow.',
  moss_wrap: 'Held: heals a little at the end of every turn.',
  sap_vial: 'Held: heals a bit from every hit it lands.',
  remedy_pouch: 'Held: patches it up once when HP runs low. Used up.',
  last_stand_ribbon: 'Held: from full HP, it hangs on with 1 HP once. Used up.',
  grit_buckle: 'Held: sometimes hangs on with 1 HP.',
  oath_band: 'Held: much more Might, but it sticks to the first skill it uses.',
  oath_lens: 'Held: much more Focus, but it sticks to the first skill it uses.',
  oath_spurs: 'Held: much faster, but it sticks to the first skill it uses.',
  hawk_lens: 'Held: lands clean hits more often.',
  steady_sight: 'Held: skills miss less.',
  mint_sprig: 'Held: clears a status or a daze once. Used up.',
  clear_bell: "Held: can't be made drowsy or dazed.",
  quick_tassel: 'Held: sometimes gets to go first.',
  swift_anklet: 'Held: a little faster.',
  tamers_thread: 'Held: crystals work a little better while it is out. Wild only.',
  tally_purse: 'Held: +10% prize money from trainers. A gold coin on the team wins instead.',
  lure_lantern: 'Lead holder: more wild creatures show up.',
  hush_cloak: 'Lead holder: fewer wild creatures show up.',
  gold_coin: 'Held: more prize money from trainers.',
  team_link_band: 'Held: learns from the bench when a teammate wins.',
};
export const charmDesc = (el) => `Held: ${el} skills hit a little harder.`;

// Reaction lines when an item changes hands ({creature}, {item}, {old}).
export const HELD_LINES = {
  give: ['{creature} grabs the {item} and holds on tight.', '{creature} sniffs the {item}, then tucks it away.', '{creature} gives the {item} a proud little shake.'],
  match: ['{creature} lights up. The {item} suits it.', '{creature} hums at the {item}. A perfect fit.'],
  swap: ['{creature} trades the {old} for the {item}.', '{creature} drops the {old} in your Pack and grabs the {item}.'],
  take: ['{creature} hands the {item} back. A little slowly.', '{creature} lets go of the {item}.'],
  full: ['No room in the Pack for the {item}.'],
};
