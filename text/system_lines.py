# -*- coding: utf-8 -*-
"""Kilumen system text (v0.4.4): menus, pickups, heal counter, shop, battles, save, skills, etc.
Owned by Text Bot. Imported by build_overworld_lines.py, which validates every page.
Coverage is lined up with design/MECHANICS_PARITY.md (system ids B/C/P/F/E/G/M).
Rules: original wording only; no franchise terms; 1-3 pages per message; each page wraps to <= 2 x 40
even with the longest value of every placeholder (SAMPLES below).
Entry shape: {"pages": [...], "parity": "E7", "build": "built|partial|designed|different|missing",
              optional "choices", "labels", "pending_gary_call", "variants": {option: [pages]}, "note"}"""

# worst-case placeholder values (length) used by the validator's expansion check
SAMPLES = {
 "{species}": "Bramblehorn12", "{place}": "Trail 1 - Sunmeadow Fields",
 "{player}": "Maximiliana", "{nick}": "Maximiliana", "{creature}": "Bramblehorn12", "{lead}": "Bramblehorn12", "{name}": "Bramblehorn12",
 "{new}": "Bramblehorn12", "{want}": "Bramblehorn12", "{give}": "Bramblehorn12",
 "{item}": "Small Feed Bag xx", "{old_item}": "Small Feed Bag xx", "{skill}": "Thornlash Wide", "{old_skill}": "Thornlash Wide",
 "{count}": "99", "{price}": "12,500 gold", "{total}": "99,999 gold", "{fee}": "1,200 gold", "{discount}": "10%",
 "{trainer}": "Courier Bramwell Ashe", "{box}": "Box 10", "{city}": "Lanternport", "{pocket}": "Mail & Logs",
 "{time}": "23:59", "{caught}": "450", "{seen}": "450", "{task}": "Register 3 swamp types",
 "{sell_count}": "2000", "{sell_goal}": "2000", "{level}": "100", "{element}": "Lightning", "{coins}": "8",
 "{employee_id}": "001893", "{area}": "Revival Heights Hall", "{master}": "Revival Heights", "{quest}": "Missing Field Staff", "{node}": "Staff Discount", "{rank}": "3",
 "{cost}": "9", "{points}": "99", "{max}": "3", "{region}": "8", "{into}": "9,999", "{span}": "9,999",
 "{reason}": "Not enough points. Cost 9, balance 99.",
 "{trainer_class}": "Courier", "{fare}": "250 gold", "{n}": "99", "{need}": "99", "{spray_left}": "99", "{amount}": "99,999 gold",
}
NEW_PLACEHOLDERS = {
 '{species}': 'rare creature named in a contact tip', '{place}': 'Trail area sign title, e.g. Trail 1 - Sunmeadow Fields',
 '{employee_id}': "player's bare 6-digit employee number (global text var)",
 '{area}': 'area display name (maps.<map>.area_name)',
 '{master}': "Master's town name, e.g. Fernwick",
 '{node}': 'RT Employee Benefits node name',
 '{rank}': 'RT Employee Benefits node rank (digits)',
 '{quest}': 'quest title',
 '{cost}': 'RT Employee Benefits rank cost in benefit points (digits)', '{points}': 'unspent benefit points (digits)',
 '{max}': 'max rank of an RT Employee Benefits node', '{region}': 'region number (digits)',
 '{into}': 'XP into the current ID level', '{span}': 'XP needed for the next ID level',
 '{reason}': 'the matching system_rt_benefits.locked.* line',

 "{n}": "test-run creatures logged so far (digits)", "{need}": "test-run creatures needed (digits)",
 "{new}": "creature's form after growing (evolution)", "{want}": "creature a hidden trader asks for (SP 8.4)",
 "{give}": "creature the hidden trader gives back", "{count}": "quantity (digits)",
 "{price}": "unit price incl. currency word, e.g. '200 gold' (currency word: DD says gold; Gary to confirm)",
 "{total}": "total incl. currency word", "{fee}": "blackout copay incl. currency word (flat regional fee, MECHANICS_PARITY B28)",
 "{discount}": "staff discount, e.g. '10%'", "{trainer}": "trainer class + name, e.g. 'Hiker Bram'",
 "{trainer_class}": "trainer class only", "{box}": "storage box label", "{pocket}": "bag pocket label (comfort.bag_pockets)",
 "{old_skill}": "skill being replaced", "{time}": "in-game clock HH:MM", "{caught}": "Kilindex caught count",
 "{seen}": "Kilindex seen count", "{task}": "company task title", "{sell_count}": "creatures transferred so far",
 "{sell_goal}": "transfer goal (DD: 2000)", "{level}": "creature level", "{element}": "element display name",
 "{fare}": "rail/ferry fare incl. currency word (only if Gary picks paid travel)",
 "{amount}": "money found in a purse, incl. currency word",
}

# open design conflicts waiting on Gary (MECHANICS_PARITY section 9); lines that depend on them carry pending_gary_call
GARY_CALLS = {
 "potions_vs_rest": "DD: energy only comes back by resting at a centre vs. healing potions that restore energy (parity 9 #1).",
 "paid_vs_free_travel": "DD paid quick-travel stations vs. free Skylift / Lumen Line pass (parity 9 #4).",
 "phone_vs_pc_storage": "Team/storage on the smartphone vs. on the company terminal (parity 9 #5).",
 "player_gender": "New-game choice of one male or one female lead (parity G13). Text is written gender-neutral: 'you' or {player}, never he/she.",
 "ron_mode": "Ron as co-op partner or as friendly rival (parity 9 #9, G3).",
}

S = {}

S["system_items"] = {
 "_section": "Item pickups and hidden items (parity F18, E9). Coder: show on pickup; {pocket} from comfort.bag_pockets labels.",
 "picked_up": {"pages": ["You picked up {item}.", "Into the {pocket} pocket it goes."], "parity": "F18", "build": "partial"},
 "picked_up_many": {"pages": ["You picked up {item} x{count}.", "Into the {pocket} pocket they go."], "parity": "F18", "build": "partial"},
 "hidden_found": {"pages": ["Something's wedged in here...", "It's {item}! Into the {pocket} pocket."], "parity": "F18", "build": "partial",
                   "note": "every map item with hidden:true (World v16.5: found by facing + A, walkable)"},
 "picked_up_money": {"pages": ["You found {item}!", "{amount} goes in your wallet."], "parity": "F18", "build": "partial",
                     "note": "money items (system_item_catalogue entries with pocket null, e.g. coin_pouch_small): no pocket, straight to the wallet"},
 "hidden_buddy": {"pages": ["{lead} is nosing at the ground...", "There's {item} buried here!"], "parity": "F18", "build": "partial",
                   "note": "optional: when the Trail Buddy is out and Warmth is high (SP 1.2)"},
 "bag_full": {"pages": ["Your {pocket} pocket is stuffed.", "{item} will have to stay put for now."], "parity": "E4", "build": "designed"},
 "key_item": {"pages": ["You got {item}!", "It went in Key Items. You can't sell or drop those."], "parity": "E9", "build": "partial"},
 "empty_satchel": {"pages": ["An empty supply satchel. Someone beat you to it."], "parity": "F18", "build": "partial",
                    "note": "visible pickup prop after it's been taken (parity F18 'supply satchel')"},
}

# Display names + bag text for World's placeholder item ids (items/ITEM_PLACEHOLDERS.json, maps/*.json items[].item).
# Keys are World's ids, never renamed. Names <= 17 chars (the {item} sample). Players never see "coin" for money (coin = Master's token).
# pocket = comfort.bag_pockets key (World's pocket hint in item_pocket_hint). TBD ids wait on Story (CATALOGUE_PENDING).
S["system_item_catalogue"] = {
 "_section": "Item names and bag descriptions by World item id (parity E4). Pickup text = system_items.picked_up / hidden_found / picked_up_money with {item} = name.",
 "tonic_small": {"name": "Small Remedy", "pocket": "care", "pages": ["A small remedy. Patches up a little lost health."], "parity": "E4", "build": "partial"},
 "tonic_large": {"name": "Big Remedy", "pocket": "care", "pages": ["A big remedy. Patches up a lot of lost health."], "parity": "E4", "build": "partial"},
 "energy_tonic": {"name": "Pep Remedy", "pocket": "care", "pages": ["A fizzy remedy. The label just says 'PEP!'"], "parity": "E4", "build": "partial",
                  "pending_gary_call": "potions_vs_rest", "note": "World's role says it restores energy; the description stays neutral until Gary rules on potions vs resting"},
 "pond_plum_juice": {"name": "Pond Plum Juice", "pocket": "feeds", "pages": ["Fresh-pressed pond plums. Tart, cold and picked this morning."], "parity": "E4", "build": "partial", "sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "proposed item id (no World id yet); juice-bar rule: juice, tea and shakes only"},
 "mossplum_shake": {"name": "Mossplum Shake", "pocket": "feeds", "pages": ["Mossplum milkshake, extra thick. Comes with a very bendy straw."], "parity": "E4", "build": "partial", "sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "proposed item id (no World id yet); juice-bar rule: juice, tea and shakes only"},
 "fern_mint_tea": {"name": "Fern Mint Tea", "pocket": "feeds", "pages": ["Warm, sweet and minty. Creatures sip it slowly, then ask for more."], "parity": "E4", "build": "partial", "sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "proposed item id (no World id yet); juice-bar rule: juice, tea and shakes only"},
 "firefly_shake": {"name": "Firefly Shake", "pocket": "feeds", "pages": ["Amber mango milkshake. Sunny, sweet and a bit sticky."], "parity": "E4", "build": "partial", "sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "proposed item id (no World id yet); juice-bar rule: juice, tea and shakes only"},
 "old_record": {"name": "Old Record", "pocket": "key", "pages": ["A scratched record in a paper sleeve.", "The DJ at The Firefly is looking for these."], "parity": "E4", "build": "partial",
                "note": "The Missing Note (World items[] id old_record in fernwick, thornwood, route1; Lanternport held). Text Bot wording; key pocket because it is a side-story item"},
 "calm_tea": {"name": "Calm Tea", "pocket": "care", "pages": ["A cooled herbal tea. Settles a creature that's out of sorts."], "parity": "E4", "build": "partial"},
 "potion": {"name": "Trail Remedy", "pocket": "care", "pages": ["A pouch of herbal salve for the road.\nPatches up a little lost health."], "parity": "E4", "build": "partial", "effect": "pending: small heal, Coder sets", "note": "World pickup id (grotto/cave/caldera items). DRAFT pending Gary"},
 "pond_berry_juice": {"name": "Pond Juice", "pocket": "feeds", "pages": ["Fresh-pressed pond fruit. Tart, cold\nand picked this morning."], "parity": "E4", "build": "partial", "sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "legacy id kept for Coder (bag.js RENAMED_ITEMS maps it to pond_plum_juice); reworded, no 'berry'. DRAFT pending Gary"},
 "mossberry_shake": {"name": "Moss Shake", "pocket": "feeds", "pages": ["Mossy-green and extra thick. Comes\nwith a very bendy straw."], "parity": "E4", "build": "partial", "sold_by": "unplaced_npcs.rebel_bartender", "effect": "pending: feed / small heal, Coder sets", "note": "legacy id kept for Coder (bag.js RENAMED_ITEMS maps it to mossplum_shake); reworded, no 'berry'. DRAFT pending Gary"},
 "trail_mix": {"name": "Trail Mix", "pocket": "feeds", "pages": ["Nuts, seeds and dried mossplums.", "Trail Buddies go wild for it."], "parity": "E4", "build": "partial"},
 "feed_bag_small": {"name": "Small Feed Bag", "pocket": "feeds", "pages": ["A small bag of feed. Enough for one good meal."], "parity": "E4", "build": "partial"},
 "feed_bag": {"name": "Feed Bag", "pocket": "feeds", "pages": ["A full bag of feed. Your team eats well tonight."], "parity": "E4", "build": "partial"},
 "vigor_seed": {"name": "Vigor Seed", "pocket": "feeds", "pages": ["A hard little seed. Whoever eats it gets a bit sturdier."], "parity": "E4", "build": "partial",
                "note": "World's hint is a 'growth' pocket; we have no such pocket, so it sits with Feeds (it's eaten). Coder may split it out"},
 "crystal_dust": {"name": "Crystal Dust", "pocket": "crystals", "pages": ["Fine crystal grit. Shops pay a little for it."], "parity": "E4", "build": "partial"},
 "dominance_crystal": {"name": "Dominance Crystal", "pocket": "crystals", "pages": ["An empty dominance crystal.", "Hold it up to bring a wild creature onto your team."], "parity": "E4", "build": "partial"},
 "dominance_crystal_plus": {"name": "Prime Crystal", "pocket": "crystals", "pages": ["A denser dominance crystal.", "It holds tough creatures better."], "parity": "E4", "build": "partial"},
 "gold_coin": {"name": "Gold Token", "pocket": "gear", "pages": ["A heavy gold token. Hold it in battle", "and trainers pay out half as much again."], "parity": "E4", "build": "partial",
               "note": "v0.4.11: World id gold_coin (saltmere_item_1, hidden, lighthouse islet). DD held item, x1.5 trainer payout (system payout_coin). Named 'Token' since players only see 'coin' for a Master's token. Pocket: gear (held items)"},
 "coin_pouch_small": {"name": "a small purse", "pocket": None, "pages": ["A little purse someone dropped. There's gold inside."], "parity": "E4", "build": "partial",
                      "note": "money: use system_items.picked_up_money. Named 'purse', not 'coin pouch': players only see 'coin' for a Master's token"},
}
CATALOGUE_PENDING = {
 "TBD": "interiors worker placeholder (home_*_2f item_1, mirefen_islet_item): Story/Gary picks the item, then it gets a catalogue entry. Pickup uses the generic lines meanwhile.",
 "TBD_backroom_reward": "rt_branch_backroom item_1: back-room story reward (pending_story_call). Name and line wait on Story.",
}
POCKET_HINT = {"medicine": "care", "snacks": "feeds", "growth": "feeds", "crystals": "crystals", "money": None}

S["system_heal"] = {
 "_section": "Revival Tech heal counter + storage terminal (parity E7, P3, E8, P4). Map greetings / after_heal / declined stay in maps.heal_*.",
 "choices": {"labels": {"rest": "Rest my team", "rest_go": "Rest and go", "skip_recal": "Heal only, skip retune", "no": "Not now"},
             "parity": "E7", "build": "partial", "note": "rest_go = SP 7.5 heal-all-and-go; skip_recal only after read_drift_log (SP 8.2)"},
 "taking": {"pages": ["Hand them over. Quick recalibrate and polish..."], "parity": "E7", "build": "partial"},
 "machine": {"pages": ["Whirr... click... ding."], "parity": "E7", "build": "partial"},
 "returning": {"pages": ["Here you go. Health, energy, the lot.", "Come back whenever. We never close."], "parity": "E7", "build": "partial",
               "note": "use after the machine; the map's after_heal line can replace page 2"},
 "rest_go": {"pages": ["All rested. Off you pop."], "parity": "E7", "build": "designed", "note": "SP 7.5: one page, no chat"},
 "skip_recal": {"pages": ["Heal only? ...Okay. I didn't see that.", "Here you go. Crystals untouched."], "parity": "E7", "build": "designed",
                "note": "SP 8.2: offered after read_drift_log; tone is quietly complicit"},
 "storage_open": {"pages": ["Field Archive. Logged in as {player}."], "parity": "P3", "build": "partial", "pending_gary_call": "phone_vs_pc_storage",
                  "variants": {"terminal": ["Field Archive. Logged in as {player}."], "phone": ["Field Archive app. Syncing with the branch..."]}},
 "storage_menu": {"labels": {"move": "Move creatures", "deposit": "Drop off", "withdraw": "Pick up", "transfer": "Transfer to Revival Tech", "items": "Item locker", "logout": "Log out"},
                  "parity": "P3", "build": "partial"},
 "deposited": {"pages": ["{creature} is resting in {box}."], "parity": "P3", "build": "partial"},
 "withdrew": {"pages": ["{creature} rejoined your team."], "parity": "P3", "build": "partial"},
 "team_full": {"pages": ["Your team's full. Drop someone off first."], "parity": "P1", "build": "partial"},
 "last_one": {"pages": ["That's the only one with you.", "Keep at least one creature on your team."], "parity": "P3", "build": "partial"},
 "box_full": {"pages": ["{box} is full. Try another box."], "parity": "P3", "build": "partial"},
 "extra_boxes": {"pages": ["Employee level up! The archive found you some extra boxes."], "parity": "E10", "build": "designed", "note": "SP 8.2 perk L3"},
 "transfer_ask": {"pages": ["Transfer {creature} to Revival Tech?", "You'll get {price}. Transfers are final."], "choices": ["Transfer", "Keep"],
                  "parity": "P4", "build": "different"},
 "transfer_named": {"pages": ["{creature} has a name, you know.", "Transfer it anyway?"], "choices": ["Transfer", "Keep"], "parity": "P4", "build": "different",
                    "note": "show before transfer_ask when the creature has a nickname"},
 "transfer_done": {"pages": ["Transfer filed. {price} paid in.", "A crate is already on its way."], "parity": "P4", "build": "different"},
 "transfer_goal": {"pages": ["Transfers this year: {sell_count} of {sell_goal}."], "parity": "M2", "build": "different"},
 "logout": {"pages": ["Logged out. The screen glows a beat too long."], "parity": "E8", "build": "partial"},
}

S["system_shop"] = {
 "_section": "Revival Tech supply counter (parity E1-E3). Greeting stays per map (RT Supply). Prices fixed per region.",
 "menu": {"labels": {"buy": "Buy", "sell": "Sell", "done": "That's all"}, "parity": "E1", "build": "partial"},
 "buy_what": {"pages": ["What do you need?"], "parity": "E1", "build": "partial"},
 "how_many": {"pages": ["{item}, {price} each. How many?"], "parity": "E1", "build": "partial",
              "note": "SP 7.5: start on the last quantity bought"},
 "confirm": {"pages": ["{item} x{count} comes to {total}.", "Ring it up?"], "choices": ["Ring it up", "Never mind"], "parity": "E1", "build": "partial"},
 "bought": {"pages": ["Bagged. Pleasure doing business."], "parity": "E1", "build": "partial"},
 "short": {"pages": ["You're {total} short, I'm afraid.", "Payday's not till Friday, huh?"], "parity": "E1", "build": "partial",
           "note": "{total} here = the amount missing"},
 "bag_full": {"pages": ["Your {pocket} pocket can't take any more of those."], "parity": "E1", "build": "partial"},
 "staff_discount": {"pages": ["Staff discount: {discount} off. Don't tell anyone."], "parity": "E10", "build": "designed", "note": "SP 8.2 perk L2"},
 "sell_what": {"pages": ["What are you getting rid of?"], "parity": "E1", "build": "partial"},
 "sell_offer": {"pages": ["I'll give you {total} for that. Deal?"], "choices": ["Deal", "No deal"], "parity": "E1", "build": "partial"},
 "sold": {"pages": ["Done. {total} for you."], "parity": "E1", "build": "partial"},
 "cant_sell": {"pages": ["That's a key item. Hang on to it."], "parity": "E9", "build": "partial"},
 "new_stock": {"pages": ["New stock came in with your last coin.", "Have a look."], "parity": "E1", "build": "designed", "note": "stock grows with coins (parity E1)"},
 "bye": {"pages": ["See you. Prices won't move, promise."], "parity": "E2", "build": "different"},
}

S["system_trainers"] = {
 "_section": "Generic trainer flow (parity F17, G11, E3, G3, G4). Per-trainer pages/battle_lost/after stay in maps.<map>.<trainer>.",
 "spotted": {"pages": ["{trainer} is heading your way!"], "parity": "F17", "build": "missing",
             "note": "after the violet spark (SP 5.1); then the trainer's own pages are the intro"},
 "battle_start": {"pages": ["{trainer} squares up!"], "parity": "G11", "build": "missing"},
 "payout": {"pages": ["{trainer} hands over {total}.", "\"Fair's fair.\""], "parity": "E3", "build": "designed"},
 "payout_coin": {"pages": ["{trainer} hands over {total}.", "Your gold coin made it a bit heavier."], "parity": "E3", "build": "designed",
                 "note": "DD held item 'gold coin' (x1.5 payout)"},
 "no_retreat": {"pages": ["No walking away from a trainer battle."], "parity": "B16", "build": "missing"},
 "no_capture": {"pages": ["That creature already has a trainer. A crystal won't take it."], "parity": "B17", "build": "partial",
                "note": "DRAFT Oct 23 2026 12:15 PM CT (Gary 12:03 PM CT: trainers' creatures can't be captured). Shows when a crystal is picked in any trainer battle; no item used, no turn passes. Read by battle/ui_sd.js noCapture() and ui.js shell battle."},
 "contact_ask": {"pages": ["Swap numbers? I'll text you when I'm ready for round two."], "choices": ["Sure", "Maybe later"],
                 "parity": "G4", "build": "different", "note": "SP 1.11 rematches via phone Contacts"},
 "contact_added": {"pages": ["{trainer} was added to your Contacts."], "parity": "G4", "build": "different"},
 "rematch_ask": {"pages": ["Back for more? I've been practising.", "Same rules as last time."], "choices": ["Let's go", "Not now"], "parity": "G4", "build": "different"},
 "rival_ron": {"pages": ["Ron's waving at you from across the road."], "parity": "G3", "build": "different", "pending_gary_call": "ron_mode",
               "variants": {"rival": ["Ron's waving at you. Then he cracks his knuckles."], "co_op": ["Ron's waving at you. \"Partner! Over here!\""]},
               "note": "per-city openers stay in ron_battle_openers (rival mode)"},
 "ron_co_op_join": {"pages": ["Ron jogs over. \"I'll take the left one.\""], "parity": "B18", "build": "partial", "pending_gary_call": "ron_mode",
                    "note": "co-op mode only (Ron joins a two-on-two); unused if Gary picks rival"},
}

S["system_wild"] = {
 "_section": "Wild encounters (parity C1-C4, C9, B16, B27). Hush Spray wear-off text is comfort.hush_spray (already written).",
 "grass": {"pages": ["{creature} bursts out of the grass!"], "parity": "C1", "build": "partial"},
 "cave": {"pages": ["{creature} drops out of the dark!"], "parity": "C3", "build": "partial"},
 "water": {"pages": ["{creature} surfaces right beside you!"], "parity": "C8", "build": "designed",
           "note": "parity 9 #6: if Gary rules water is off-grass, use enraged instead"},
 "enraged": {"pages": ["An Enraged {creature} charges at you!"], "parity": "C4", "build": "designed", "note": "off-grass ambush, always Enraged (DD)"},
 "large": {"pages": ["A Large {creature}! It's casting a shadow."], "parity": "B27", "build": "different"},
 "small": {"pages": ["A Small {creature}! Easy to miss, hard to hit."], "parity": "B27", "build": "different"},
 "retreated": {"pages": ["You slipped away."], "parity": "B16", "build": "missing"},
 "cant_retreat": {"pages": ["{creature} won't let you leave!"], "parity": "B16", "build": "missing"},
 "it_left": {"pages": ["{creature} lost interest and wandered off."], "parity": "B16", "build": "missing"},
 "spray_active": {"pages": ["A Hush Spray is still working.", "Save this one for later."], "parity": "C9", "build": "designed"},
 "spray_perk": {"pages": ["Your weekly free Hush Spray is in the Care pocket."], "parity": "E10", "build": "designed", "note": "SP 8.2 perk L4"},
}

S["system_blackout"] = {
 "_section": "Losing a battle (parity B28, SP 7.6). Copay = flat regional fee {fee}.",
 "lost": {"pages": ["Your whole team is out cold.", "Time to get them to a branch. Fast."], "parity": "B28", "build": "designed"},
 "carried": {"pages": ["You hurry back to the {city} branch..."], "parity": "B28", "build": "designed"},
 "copay": {"pages": ["Company health plan covers the rest.", "Your copay is {fee}."], "parity": "B28", "build": "designed"},
 "copay_short": {"pages": ["Can't cover the copay? We'll take what you've got.", "We'll cover the rest. This once."], "parity": "B28", "build": "designed"},
 "carer": {"pages": ["Rough day? They're all rested now.", "Rest, then try again. They'll be fine."], "parity": "B28", "build": "designed"},
 "guardian_retry": {"pages": ["It's still out there. It'll wait for you."], "parity": "C13", "build": "different", "pending_story_call": "Guardian retry (parity C13)",
                    "note": "after losing the one-time Guardian encounter"},
}

S["system_save"] = {
 "_section": "Save (parity M9). save.js autosaves on flag change, warp, every 60 s and on page hide, with a .bak copy. Framed as filing a report (SP 8.1).",
 "menu_label": {"labels": {"save": "File today's report"}, "parity": "M9", "build": "built"},
 "prompt": {"pages": ["File today's report? This saves your game."], "choices": ["File it", "Not yet"], "parity": "M9", "build": "built"},
 "replace": {"pages": ["There's already a report on file.", "Write over it?"], "choices": ["Write over", "Keep old"], "parity": "M9", "build": "built",
             "note": "one save slot"},
 "saving": {"pages": ["Filing... keep the game open."], "parity": "M9", "build": "built"},
 "saved": {"pages": ["Report filed. {player}'s day is on record."], "parity": "M9", "build": "built"},
 "toast": {"pages": ["Report auto-filed."], "parity": "M9", "build": "built", "note": "small toast on autosave, max once a minute"},
 "failed": {"pages": ["Couldn't file the report.", "Try again in a moment."], "parity": "M9", "build": "built", "note": "save.js lastError"},
 "from_backup": {"pages": ["The last report got smudged.", "Loaded the backup copy instead."], "parity": "M9", "build": "built", "note": "save.js .bak fallback"},
}

S["system_skills"] = {
 "_section": "Skills (parity B12, B20-B23, B7; design skill-structure research doc, SKR): 4 slots, level list, evolution skill first, free relearning via Skill Memory, Affinity bonus, energy meter.",
 "learned": {"pages": ["{creature} picked up {skill}!"], "parity": "B21", "build": "designed"},
 "slots_full": {"pages": ["{creature} could pick up {skill}...", "...but all four skill slots are taken."], "parity": "B21", "build": "designed"},
 "swap_ask": {"pages": ["Swap a skill out for {skill}?"], "choices": ["Swap one out", "Keep all four"], "parity": "B21", "build": "designed"},
 "which": {"pages": ["Which skill makes room for {skill}?"], "parity": "B21", "build": "designed"},
 "swapped": {"pages": ["{old_skill} is out. {skill} is in.", "{old_skill} stays in Skill Memory."], "parity": "B23", "build": "designed"},
 "kept": {"pages": ["{creature} kept its four skills.", "{skill} is saved in Skill Memory."], "parity": "B23", "build": "designed"},
 "memory_help": {"pages": ["Skill Memory keeps every skill a creature has picked up.", "Swap them from the Team menu. It's free."], "parity": "B23", "build": "designed"},
 "memory_empty": {"pages": ["Nothing else in {creature}'s Skill Memory yet."], "parity": "B23", "build": "designed"},
 "memory_swap": {"pages": ["Swap {old_skill} for {skill}?"], "choices": ["Swap", "Cancel"], "parity": "B23", "build": "designed"},
 "evolution_skill": {"pages": ["Growing up gave {creature} a new trick:", "{skill}. It's first in line."], "parity": "B21", "build": "designed",
                     "note": "offered first, then any level skills (research doc)"},
 "affinity_help": {"pages": ["Affinity: skills that share {creature}'s element hit harder."], "parity": "B7", "build": "designed"},
 "energy_low": {"pages": ["{skill} is nearly out of energy.", "Push it and it may miss or backfire."], "parity": "B12", "build": "different"},
 "energy_out": {"pages": ["{skill} is out of energy. Use it anyway?", "{creature} will get hurt doing it."], "choices": ["Use anyway", "Pick another"], "parity": "B12", "build": "different"},
 "reel_learned": {"pages": ["The Training Reel plays. {creature} picked up {skill}!"], "parity": "B22", "build": "designed"},
 "reel_cant": {"pages": ["{creature} watches the reel, then yawns.", "{skill} isn't for it."], "parity": "B22", "build": "designed"},
}

S["system_evolution"] = {
 "_section": "Growing into a new form (parity B24). Hold B to stop it (ours). Variants carry over (SP 1.7a).",
 "start": {"pages": ["{creature}'s crystal is humming. Something's changing!"], "parity": "B24", "build": "partial"},
 "done": {"pages": ["{creature} grew into {new}!"], "parity": "B24", "build": "partial"},
 "stopped": {"pages": ["{creature} settles down. Not today, then."], "parity": "B24", "build": "partial"},
 "variant_kept": {"pages": ["Still Cosmic. If anything, sparklier."], "parity": "B27", "build": "different"},
 "kilindex": {"pages": ["New Kilindex entry: {new}."], "parity": "M1", "build": "different"},
 "courier_send": {"pages": ["Send {creature} down the Lumen Line to Ron?", "It comes back on the next train."], "choices": ["Send it", "Not now"],
                  "parity": "M3", "build": "different", "note": "Lumen Line Courier (SP 1.8)", "pending_gary_call": "ron_mode"},
 "courier_back": {"pages": ["{creature} is back off the train...", "...and it's not quite the same shape!"], "parity": "M3", "build": "different"},
}

S["system_kilindex"] = {
 "_section": "Kilindex (parity M1, M2, C15, C10). Rating = lab lead on the lab terminal or a phone call. Thresholds by caught count (450 total; variants don't count, SP 1.7a).",
 "labels": {"labels": {"seen": "Seen", "caught": "Registered", "heaviest": "Heaviest", "lightest": "Lightest", "regions": "Found in",
                       "elements": "Elements known", "skills": "Skills known", "variants": "Variant Ledger"}, "parity": "M1", "build": "different"},
 "rating_intro": {"pages": ["Lab here. Let's see your Kilindex...", "Seen {seen}, registered {caught}."], "parity": "M1", "build": "different"},
 "rating": {"tiers": [
   {"min": 0, "pages": ["Barely a start. Get into the long grass!"]},
   {"min": 10, "pages": ["Ten-plus. The trails know your boots now."]},
   {"min": 25, "pages": ["Twenty-five! Try somewhere wetter next."]},
   {"min": 50, "pages": ["Fifty. Payroll's starting to notice you."]},
   {"min": 100, "pages": ["A hundred! Honestly, I'm a bit jealous."]},
   {"min": 150, "pages": ["One fifty. You're outpacing the old field team."]},
   {"min": 250, "pages": ["Two fifty. The lab is lining up behind you."]},
   {"min": 350, "pages": ["Three fifty. Some of these I've only read about."]},
   {"min": 449, "pages": ["One left. You know which one. I believe in you."]},
   {"min": 450, "pages": ["All of them. Every single one.", "Thank you. Really."]}],
   "parity": "M1", "build": "different", "note": "pick the last tier with caught >= min"},
 "jingle_25": {"pages": ["Kilindex: {caught} registered. Nice."], "parity": "M2", "build": "different", "note": "SP 4.5 every 25"},
 "new_entry": {"pages": ["{creature} added to the Kilindex."], "parity": "C15", "build": "missing"},
 "milestone": {"pages": ["Company milestone: {caught} registered.", "Bonus on your next payslip."], "parity": "M2", "build": "different",
               "note": "DD milestones 1,3,5,10,20,30,50,75,100"},
 "ledger_help": {"pages": ["Variant Ledger: pips show the variants you've registered.", "A star means Cosmic."], "parity": "C10", "build": "different"},
 "entries": {
  "_section": "Kilindex blurbs (ui.T(blurbKey) from data/creatures_synced.json). One string, 2 lines x 40. DRAFT pending Gary. Validated by _kil_entries.",
  "drizzlebill": {"blurb": "Paddles the Brookhollow banks in the rain. Its bill hums before a storm.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "mossmote": {"blurb": "Lives in the moss on Trail 1 stones. Dries out, waits, wakes with the rain.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "gladlet": {"blurb": "Always smiling. Fernwick gardeners say any bed it naps in blooms early.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "buoyling": {"blurb": "Bobs about the harbour in its own float ring. Hugs anything that floats.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "lumoris": {"blurb": "Moves slowly and holds a glowfern close. Lost cavers follow its light out.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "pandember": {"blurb": "Its stripes glow like banked embers. It curls up warm on cold Thornwood nights.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "vaultpede": {"blurb": "Its plates lock shut like a vault door. Coils around Greystone's oldest stones.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "pricklon": {"blurb": "Up on four legs now. Its three-point crystal cluster hums when it's cross.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "geodurchin": {"blurb": "Each spire is a split geode, purple inside. Moss grows up its sides.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "nibbin": {"blurb": "The lab's earth partner. Gnaws tunnels in clay and brings back pebbles.", "parity": "M1", "build": "different", "status": "DRAFT"},
  "gnawford": {"blurb": "Dams small streams with gnawed roots, then leaves a ford for anyone crossing.", "parity": "M1", "build": "different", "status": "DRAFT"},
 "tbdcandle": {"blurb": "Its flame burns pale blue in the cold. Drips little icicles, never wax.", "parity": "M1", "build": "different", "status": "DRAFT"},
 },
}

S["system_cosmic"] = {
 "_section": "Cosmic variant (SP 1.7, 1.7a, 1.7b; parity C10, B27). Name 'Cosmic' flagged in NAME_CHECK.md (rename risk).",
 "meet": {"pages": ["{creature} shimmers like a night sky!", "That's a Cosmic one."], "parity": "C10", "build": "different",
          "note": "after the starfield shimmer + 3-note chime"},
 "phone_buzz": {"pages": ["Your phone buzzes on its own.", "...Something rare is close."], "parity": "C10", "build": "different", "note": "SP 1.7"},
 "caught": {"pages": ["A Cosmic {creature}! The star pip lights up.", "It's in the Variant Ledger now."], "parity": "C10", "build": "different"},
 "kilindex": {"pages": ["Cosmic. Same creature, different sky.", "Doesn't count toward the 450."], "parity": "C10", "build": "different"},
 "got_away": {"pages": ["The shimmer fades into the grass.", "It's gone."], "parity": "C10", "build": "different"},
 "meteor_night": {"pages": ["Clear skies tonight. Meteor weather.", "Rare things come out to look."], "parity": "C6", "build": "partial",
                  "note": "SP 1.7 meteor night; weekday clock not built (meta.when_key_audit)"},
}

S["system_party"] = {
 "_section": "Team screen and held items (parity P1, P2, B14, C16, P8). One held item per creature (DD).",
 "menu": {"labels": {"summary": "Summary", "move": "Move", "skills": "Skills", "held": "Held item", "rename": "Rename", "back": "Back"},
          "parity": "P2", "build": "missing"},
 "summary_labels": {"labels": {"level": "Lv.", "element": "Element", "energy": "Energy", "held": "Holding", "variant": "Variant",
                               "met": "Met in", "warmth": "Crystal", "status": "Condition"}, "parity": "P2", "build": "missing",
                    "note": "Warmth shows as crystal tint, never a number (SP 1.1)"},
 "move_where": {"pages": ["Move {creature} where?"], "parity": "P2", "build": "missing"},
 "new_lead": {"pages": ["{creature} takes the lead. It looks pleased."], "parity": "P7", "build": "missing", "note": "lead = Trail Buddy"},
 "held_menu": {"labels": {"give": "Give", "take": "Take", "back": "Back"}, "parity": "B14", "build": "different"},
 "give_which": {"pages": ["Give {creature} which item?"], "parity": "B14", "build": "different"},
 "gave": {"pages": ["{creature} is holding {item} now."], "parity": "B14", "build": "different"},
 "swap_held": {"pages": ["{creature} is already holding {old_item}.", "Swap it for {item}?"], "choices": ["Swap", "Cancel"], "parity": "B14", "build": "different"},
 "swapped_held": {"pages": ["{old_item} back in the bag. {creature} has {item}."], "parity": "B14", "build": "different"},
 "took": {"pages": ["You took {item} from {creature}."], "parity": "B14", "build": "different"},
 "holding_nothing": {"pages": ["{creature} isn't holding anything."], "parity": "B14", "build": "different"},
 "take_bag_full": {"pages": ["No room in the bag. {creature} keeps {item}."], "parity": "B14", "build": "different"},
 "held_help": {"pages": ["One held item each. It helps in battle, but you won't see it."], "parity": "B14", "build": "different"},
 "out_cold": {"pages": ["{creature} is out cold. It needs a rest at a branch."], "parity": "B28", "build": "missing"},
 "out_cold_battle": {"pages": ["{creature} is out cold and can't battle."], "parity": "B15", "build": "missing"},
 "rename_ask": {"pages": ["What should {creature} be called?"], "parity": "C16", "build": "partial"},
 "renamed": {"pages": ["{name} it is. It doesn't seem to mind."], "parity": "C16", "build": "partial"},
 "rename_traded": {"pages": ["{creature} already answers to its name.", "Changing it now would just confuse it."], "parity": "M3", "build": "different",
                   "note": "traded creatures keep their old name (SP 8.4 memory tint)"},
 "unregistered": {"pages": ["Unregistered. Fit it with a crystal at any branch."], "parity": "P6", "build": "designed", "pending_story_call": "eggs (parity P6)"},
 "item_heal": {"pages": ["{creature} perks up."], "parity": "E5", "build": "designed", "pending_gary_call": "potions_vs_rest",
               "variants": {"rest_only": ["{creature}'s wounds close up. Energy needs a real rest."],
                            "potions_restore": ["{creature}'s energy comes back. It perks up."],
                            "partial_top_up": ["{creature} perks up. Energy's partly back."]}},
}

S["system_croft"] = {
 "_section": "Wexley's Croft day care (SP 8.3; parity P5, P6). Nan Ottilie Wexley runs it; Ferris Wexley reads Warmth (rater-style).",
 "greet": {"pages": ["Nan Wexley: Come in, mind the hens.", "Need someone to mind your creatures?"], "choices": ["Leave one", "Just visiting"], "parity": "P5", "build": "different"},
 "pick": {"pages": ["Which one's staying with me?"], "parity": "P5", "build": "different"},
 "pay": {"pages": ["I take feed or a chore, not gold.", "Pay in feed, or muck out the shed?"], "choices": ["Feed", "Chore"], "parity": "P5", "build": "different"},
 "left": {"pages": ["{creature} is staying at the Croft.", "I'll keep it fed and out of trouble."], "parity": "P5", "build": "different"},
 "full": {"pages": ["Two's my limit. I've only got the one shed."], "parity": "P5", "build": "different"},
 "visit": {"pages": ["{creature}'s been chasing the hens all day.", "Taking it back?"], "choices": ["Take it back", "Leave it"], "parity": "P5", "build": "different"},
 "back": {"pages": ["{creature} is back on your team. It smells of hay."], "parity": "P5", "build": "different"},
 "egg": {"pages": ["Nan Wexley: You'll want to see this.", "Found it in the shed. It's warm."], "choices": ["Take it", "Not now"], "parity": "P6", "build": "designed",
         "pending_story_call": "eggs (parity P6, SP 8.3: both Warmth 50+)"},
 "egg_moving": {"pages": ["The egg rocks in your bag. Soon."], "parity": "P6", "build": "designed", "pending_story_call": "eggs (parity P6)"},
 "hatched": {"pages": ["The shell splits, and out tumbles {creature}!", "It looks straight at you."], "parity": "P6", "build": "designed", "pending_story_call": "eggs (parity P6)"},
 "warmth_board": {"tiers": [
   {"min": 0, "pages": ["Ferris: Cold crystal. Give it time."]},
   {"min": 25, "pages": ["Ferris: It's warming up to you."]},
   {"min": 50, "pages": ["Ferris: That glow? That's trust."]},
   {"min": 75, "pages": ["Ferris: It'd follow you anywhere."]},
   {"min": 100, "pages": ["Ferris: I've never seen a crystal that warm."]}],
   "parity": "P8", "build": "different", "note": "Warmth 0-100 (SP 1.1); last tier with warmth >= min"},
}

S["system_trade"] = {
 "_section": "Hidden traders T1-T6 (SP 8.4; parity M3). Per-trader names/flags trade_tN_done / trade_tN_reunion stay Story/World's.",
 "ask": {"pages": ["Got a {want}? I'd swap my {give} for one."], "choices": ["Swap", "No thanks"], "parity": "M3", "build": "different"},
 "pick": {"pages": ["Which {want} are you offering?"], "parity": "M3", "build": "different"},
 "dont_have": {"pages": ["No {want} on you? Ah well. Offer stands."], "parity": "M3", "build": "different"},
 "declined": {"pages": ["Fair enough. I'll be here."], "parity": "M3", "build": "different"},
 "swapped": {"pages": ["Done! {give} is with you now.", "Be good to it. I was."], "parity": "M3", "build": "different"},
 "tint": {"pages": ["{give}'s crystal has a faint stripe of another colour."], "parity": "M3", "build": "different", "note": "arrives at Warmth 10 with memory tint"},
 "after": {"pages": ["How's my old pal getting on?"], "parity": "M3", "build": "different"},
 "reunion": {"pages": ["Look at that crystal. It picked you.", "Good. That's all I wanted."], "parity": "M3", "build": "different", "note": "trade_tN_reunion"},
}

S["system_garden"] = {
 "_section": "Feed garden (SP 1.5; parity E6): 4 plots near brookhollow villager_garden; 3 growth stages over 1-2 days.",
 "empty": {"pages": ["A patch of turned soil. Plant something?"], "choices": ["Plant", "Leave it"], "parity": "E6", "build": "different"},
 "no_seeds": {"pages": ["Nice soil. Shame you've got no seeds."], "parity": "E6", "build": "different"},
 "planted": {"pages": ["You planted {item}.", "Water it, then let it be."], "parity": "E6", "build": "different"},
 "dry": {"pages": ["The soil's dry and cracked."], "parity": "E6", "build": "different"},
 "no_can": {"pages": ["You'll need a watering can for this."], "parity": "E6", "build": "different"},
 "watered": {"pages": ["You water the plot. It soaks it up fast."], "parity": "E6", "build": "different"},
 "sprout": {"pages": ["A tiny green sprout. Patience."], "parity": "E6", "build": "different"},
 "growing": {"pages": ["Leaves everywhere. Not long now."], "parity": "E6", "build": "different"},
 "ready": {"pages": ["It's ready to pick!"], "choices": ["Pick it", "Leave it"], "parity": "E6", "build": "different"},
 "picked": {"pages": ["You picked {item} x{count}."], "parity": "E6", "build": "different"},
}

S["system_field"] = {
 "_section": "Field notices not already in field_skills / items (parity F9, F11, F7, F8, C7).",
 "ledge_up": {"pages": ["It's a ledge. Down is easy. Up isn't."], "parity": "F11", "build": "built"},
 "ice": {"pages": ["Ice. Once you start sliding, you won't stop.", "Not until something stops you."], "parity": "F9", "build": "partial"},
 "deep_snow": {"pages": ["The snow's too deep for the bike."], "parity": "F13", "build": "built"},
 "rail_fare": {"pages": ["Lumen Line. Show your pass at the gate."], "parity": "F6", "build": "different", "pending_gary_call": "paid_vs_free_travel",
               "variants": {"pass_free": ["Lumen Line. Show your pass at the gate."],
                            "paid": ["Lumen Line. Fare to the next stop is {fare}."], "perk_free": ["Staff travel's free now. Hop on."]}},
}

S["system_company_voice"] = {'_section': "Company voice (Gary Oct 23 2026, 12:19-12:22 PM CT). Default off (?cv=1). Sarcastic company AI RITA (Resource Inventory and Tracking Assistant) that only cares about company asset value; always addresses the player by bare {employee_id}, never praises them as a person. Structure only from Satisfactory; no names or lines copied. Read by src/systems/company_voice.js. DRAFT Oct 23 2026 12:35 PM CT. RITA whole-game pass (Text Bot, Oct 23 2026 ~12:45 PM CT; Gary 12:33-12:34 PM CT: realistic milestones, lines for the whole game). region = first region where the line can fire (region n = after Master n-1 up to beating Master n; 9 = after Master 8: finale + postgame; Kilindex counts: first region whose cumulative obtainable species reach the count). Kilindex counts now 10, 25, 50, 100, 150, 200, 250, 300, 350, 400, 450 (Coder: add 200, 300, 400 to data/company_voice.json kilindex_milestone.counts). Optional specific sets (Coder: look up <line>_<ctx.key> first, then the generic line): master_beaten_<flag key> (beat_master_<key>: fernwick, saltmere, revival, frostspire, mirefen, tidewater, lanternport, cindervale), rival_beaten_ron_<n> (beat_rival_ron_<n>; 'ron_' so it never reads as variant _2/_3/_4), area_new_<map id>, quest_done_<quest id> (q_<id>_done). Each has variants _2.._4.", 'speaker': {'labels': {'name': 'RITA'}, 'pages': ['RITA'], 'parity': 'E10', 'build': 'partial', 'note': 'Gary 12:27 PM CT Oct 23 2026: RITA = Resource Inventory and Tracking Assistant', 'region': 1}, 'first_catch': {'pages': ['Good job {employee_id}! Asset number two acquired.', "The company has invested in you. Pay it back with results."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_new': {'pages': ['Good job {employee_id}! New creatures help boost company asset value!'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_new_2': {'pages': ['{employee_id}: another kind on file. The asset ledger thanks you.', 'The ledger, not us.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_new_3': {'pages': ['New kind logged, {employee_id}. Asset value just went up a notch.', 'Your value has been reviewed. No change.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_2': {'pages': ['{employee_id}: {area} added to company records.', 'Please keep the property value where it is.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_3': {'pages': ['{area}, logged. Nice work, {employee_id}.', 'For the asset map. We were talking to the map.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_catch_2': {'pages': ['{employee_id}: one creature acquired. Asset count: 2.', "Your starter was an investment. We expect returns."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_catch_3': {'pages': ['Asset intake confirmed, {employee_id}.', "It's company property now. You're just carrying it."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_catch_4': {'pages': ['{employee_id}: first catch logged. Asset count has doubled.', "Your starter was free. Our expectations weren't. More results, please."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_new_4': {'pages': ['{employee_id}: new kind registered. The assets grow.', 'Your job title stays the same size.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_2': {'pages': ['{employee_id}: {count} kinds logged. The asset graph goes up.', 'Your graph is a flat line. Like always.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_3': {'pages': ['{count} kinds on file, {employee_id}. Company value says thanks.', "Company value doesn't talk. We're paraphrasing."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_4': {'pages': ['{employee_id}: {count} kinds registered. Asset value: higher.', 'Employee value: under review. Indefinitely.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_10_2': {'pages': ['{employee_id}: 10 kinds. Asset value hit double digits.', "Try not to let it go to your head. It's not yours."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_10_3': {'pages': ['Ten kinds on file, {employee_id}. The asset folder is filling up.', 'We bought a second folder. Out of your budget.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_10_4': {'pages': ['{employee_id}: 10 kinds logged. A fine start for the assets.', 'For you, a fine start to more walking.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_25_2': {'pages': ['{employee_id}: 25 kinds. The asset report has a cover page now.', "Your number's in the footnotes."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_25_3': {'pages': ['25 kinds on file, {employee_id}. Asset value is climbing.', 'Keep climbing. Mind the ledges.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_25_4': {'pages': ['{employee_id}: 25 kinds logged. Accounting noticed.', 'Accounting noticed the assets. Just to be clear.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_50_2': {'pages': ['{employee_id}: 50 kinds! Asset value is halfway to impressive.', "You're halfway to your next shift."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_50_3': {'pages': ['Fifty kinds, {employee_id}. The board has scheduled a meeting.', "About the assets. You're not invited."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_50_4': {'pages': ['{employee_id}: 50 kinds on file. A milestone for company value.', "Your milestone is the same as last week's."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_100_2': {'pages': ['{employee_id}: 100 kinds logged. Asset value has three digits.', 'Your number still has six. Nice and steady.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_100_3': {'pages': ['One hundred kinds, {employee_id}! The board ordered a cake.', "It's in a meeting room you can't enter."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_100_4': {'pages': ['{employee_id}: 100 kinds on file. Company value is glowing.', "You're also glowing. That's sweat. Keep walking."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_150_2': {'pages': ['{employee_id}: 150 kinds. The asset ledger needs a bigger shelf.', 'The shelf gets a raise before you do.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'kilindex_milestone_150_3': {'pages': ['150 kinds on file, {employee_id}. Asset value is up again.', "We'll mention it in the newsletter. Not your number."], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'kilindex_milestone_150_4': {'pages': ['{employee_id}: 150 kinds logged. Investors are interested.', "In the creatures. Investors don't know you exist."], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'kilindex_milestone_250_2': {'pages': ['{employee_id}: 250 kinds! Company value is very, very pleased.', "We checked. You're still {employee_id}."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'kilindex_milestone_250_3': {'pages': ['250 kinds on file, {employee_id}. The asset map is crowded.', "That's good. Crowded maps are worth more."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'kilindex_milestone_250_4': {'pages': ['{employee_id}: 250 kinds logged. Another record for the assets.', 'Records for staff are kept separately. In a drawer.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'kilindex_milestone_350_2': {'pages': ['{employee_id}: 350 kinds. The asset vault is nearly full.', "We'll build another. You'll fill that one too."], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'kilindex_milestone_350_3': {'pages': ['350 kinds on file, {employee_id}. Asset value is at a new high.', 'Morale is at a normal height. As planned.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'kilindex_milestone_350_4': {'pages': ['{employee_id}: 350 kinds logged. The board wants a photo.', 'Of the creatures. You can hold the frame.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'kilindex_milestone_450_2': {'pages': ['{employee_id}: 450 kinds! Asset value has reached the top.', 'Your reward is a very full spreadsheet.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'kilindex_milestone_450_3': {'pages': ['450 kinds on file, {employee_id}. The board stood up to clap.', 'Then they sat down. The clapping was for the assets.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'kilindex_milestone_450_4': {'pages': ['{employee_id}: 450 kinds logged. Company value: maximum.', "You're still employed. That's the bonus."], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'area_new_4': {'pages': ['{employee_id}: {area} is on the asset map now.', 'Walk carefully. We may want to sell the view.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_evolution_2': {'pages': ['{employee_id}: {creature} is now {new}. Asset upgraded!', "Upgrades for staff are not in this quarter's plan."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_evolution_3': {'pages': ['{new}. Bigger, stronger, pricier. Good asset, {employee_id}.', 'Note: we said good asset.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_evolution_4': {'pages': ['{employee_id}: asset growth confirmed. {creature} became {new}.', 'Value up. Your growth chart is still pending.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'trainer_first_win_2': {'pages': ['{employee_id}: first win logged. The assets looked expensive.', 'Keep them looking that way.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'trainer_first_win_3': {'pages': ['Battle won, {employee_id}. Company assets: undamaged. Mostly.', 'Repairs come out of somewhere. Not our budget.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'trainer_first_win_4': {'pages': ['{employee_id}: first battle win. Asset value holds steady.', 'Losing would have been bad for the brand.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_2': {'pages': ['{employee_id}: {trainer} beaten. Asset value: intact.', 'Good. Rivals are bad for business.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_3': {'pages': ['Win over {trainer} logged, {employee_id}.', "Our assets beat his assets. That's the headline."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_4': {'pages': ['{employee_id}: you won against {trainer}. The assets thank you.', "They don't. We're being polite."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_2': {'pages': ['{employee_id}: {master} Master beaten. Company stock is up!', "Your stock is the same. You don't have stock."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_3': {'pages': ['{master} Master down, {employee_id}. The board is thrilled.', "With the assets. Please don't wave at them."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_4': {'pages': ['{employee_id}: {master} coin earned. Asset value is shining.', 'So is the coin. Try not to smudge it.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'id_level_up_2': {'pages': ['{employee_id}: ID level {level}. Your number is worth more now.', 'Not much more. But more.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'id_level_up_3': {'pages': ['Employee ID level {level} filed, {employee_id}.', 'Same number, fancier lanyard. Lanyard sold separately.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'id_level_up_4': {'pages': ["{employee_id}: you're ID level {level}. HR has been told.", 'HR asked who you were. We read out your number.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'board_node_2': {'pages': ['{employee_id}: RT Employee Benefits perk unlocked.', 'It helps you collect assets faster. Pure coincidence.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'board_node_3': {'pages': ['Perk filed, {employee_id}. The company does care.', 'About output. But it looks a lot like caring.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'board_node_4': {'pages': ['{employee_id}: {node} rank {rank}. Please enjoy responsibly.', 'Enjoyment is measured in assets per hour.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_2': {'pages': ['{employee_id}: {quest} done. Value delivered.', 'Your next task is already in the queue.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_3': {'pages': ['Task complete, {employee_id}. {quest}.', 'Assets moved. Time saved. Lunch break: still pending.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_4': {'pages': ['{employee_id}: {quest}, closed. The company thanks the result.', "The result says you're welcome."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone': {'pages': ['{employee_id}: {count} kinds on file. Asset value is up.', "You're still a number. Just a busier one."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_10': {'pages': ['{employee_id}: 10 kinds on file. Asset value has two digits now.', 'So do you. Six, actually.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_25': {'pages': ['{employee_id}: 25 kinds logged. Asset value is officially noticeable.', 'Noticed by the company. The assets, that is.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_50': {'pages': ['{employee_id}: 50 kinds on file! Asset value has never looked better.', "Your number is still {employee_id}. Some things don't grow."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_100': {'pages': ['{employee_id}: 100 kinds! The board is tossing confetti.', 'At the assets. Please stand clear.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'kilindex_milestone_150': {'pages': ['{employee_id}: 150 kinds on file. Asset value needed a new chart.', "You're not on the chart. Charts are for assets."], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'kilindex_milestone_250': {'pages': ['{employee_id}: 250 kinds. Asset value is up again. Shocking.', "Keep walking in the grass. That's the job."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'kilindex_milestone_350': {'pages': ['{employee_id}: 350 kinds logged. The asset vault needs a bigger door.', "You'll still use the side entrance."], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'kilindex_milestone_450': {'pages': ['{employee_id}: 450 kinds! Peak asset value. The board is speechless.', "They'd thank you, but they don't know your name. Neither do we."], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'area_new': {'pages': ['{employee_id}: {area} logged.', 'More land on the asset map. Try not to scuff it.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'first_evolution': {'pages': ['{employee_id}: {creature} grew into {new}.', 'Bigger asset, bigger value. Your pay: unchanged.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'trainer_first_win': {'pages': ['{employee_id}: first battle win on file.', 'Winning keeps our assets looking pricey. Carry on.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten': {'pages': ['{employee_id}: you beat {trainer}.', "The assets did the work. We'll note it anyway."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten': {'pages': ['{employee_id}: {master} Master beaten. Asset value is up!', 'The board is delighted. With the assets.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'id_level_up': {'pages': ['{employee_id}: Employee ID level {level}. Applause withheld.', "You're a slightly pricier number now."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'board_node': {'pages': ['{employee_id}: RT Employee Benefits perk filed.', 'Comfy staff move assets faster. Allegedly.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done': {'pages': ['{employee_id}: task closed. {quest}.', 'Value delivered. Back to work.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'kilindex_milestone_200': {'pages': ['{employee_id}: 200 kinds on file. The asset list scrolls now.', 'Your entry fits on one line. Efficient.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'kilindex_milestone_200_2': {'pages': ['Two hundred kinds, {employee_id}. Asset value doubled since 100.', 'The math checks out. We had it checked twice.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'kilindex_milestone_200_3': {'pages': ['{employee_id}: 200 kinds logged. The board printed a poster.', "It's a bar chart. Very tall bars. Very proud board."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'kilindex_milestone_200_4': {'pages': ['{employee_id}: 200 kinds registered. The filing cabinet groaned.', "We oiled it. That's called morale maintenance."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'kilindex_milestone_300': {'pages': ['{employee_id}: 300 kinds on file. Asset value is up. Again.', "We're running out of ways to say up. Upper."], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'kilindex_milestone_300_2': {'pages': ['Three hundred kinds, {employee_id}. The asset vault has a new wing.', 'East wing. You may look in through the window.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'kilindex_milestone_300_3': {'pages': ['{employee_id}: 300 kinds logged. The printer ran out of ink.', 'It was printing the list. Worth every drop.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'kilindex_milestone_300_4': {'pages': ['{employee_id}: 300 kinds registered. A new company record.', 'The record is on a plaque. The plaque is an asset.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'kilindex_milestone_400': {'pages': ['{employee_id}: 400 kinds on file. The asset map is mostly full.', 'Mostly. The last few are hiding. Assets do that.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'kilindex_milestone_400_2': {'pages': ['Four hundred kinds, {employee_id}. The ledger needs a volume two.', 'Volume one goes in the lobby. Under glass.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'kilindex_milestone_400_3': {'pages': ['{employee_id}: 400 kinds logged. Asset value is enormous.', 'Enormous is a technical term. Accounting agrees.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'kilindex_milestone_400_4': {'pages': ['{employee_id}: 400 kinds registered. Fifty to go.', 'Fifty more line items. The ledger is stretching.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'master_beaten_fernwick': {'pages': ["{employee_id}: Fernwick's Master is beaten. Coin one, filed.", 'Earth-type assets held firm. A very solid quarter.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_fernwick_2': {'pages': ['{employee_id}: one coin. The vault had a whole empty shelf.', 'Now it has a coin and a lot of shelf.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_fernwick_3': {'pages': ['Fernwick hall cleared, {employee_id}. Asset value: grounded.', "That's an earth joke. Accounting approved it."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_fernwick_4': {'pages': ['{employee_id}: the Fernwick coin is in. The east barricade is open.', 'More land to log. The asset map is thrilled.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'master_beaten_saltmere': {'pages': ['{employee_id}: Saltmere Master beaten. Coin two, filed.', 'Water assets: kept afloat. The board is relieved.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'master_beaten_saltmere_2': {'pages': ['Saltmere hall cleared, {employee_id}. Asset value is up.', 'So is the smell of fish. Only one is on the books.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'master_beaten_saltmere_3': {'pages': ['{employee_id}: two coins. The asset vault echoes a bit less.', "We'll call that growth."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'master_beaten_saltmere_4': {'pages': ['{employee_id}: Saltmere coin logged. Salt water, fresh value.', "Please rinse the assets before they're appraised."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'master_beaten_revival': {'pages': ['{employee_id}: Revival Heights Master beaten. Coin three.', 'Head Office stopped pretending not to watch.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'master_beaten_revival_2': {'pages': ['{employee_id}: you won right outside Head Office.', "The board saw it. They've asked which creatures."], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'master_beaten_revival_3': {'pages': ['Revival Heights hall cleared, {employee_id}.', 'Light-type assets, outshone by company assets. Neat.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'master_beaten_revival_4': {'pages': ['{employee_id}: third coin filed at HQ. Very convenient.', 'The paperwork only had to go downstairs.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'master_beaten_frostspire': {'pages': ['{employee_id}: Frostspire Master beaten. Coin four, filed.', 'Asset value is soaring. Literally. Mind the wind.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'master_beaten_frostspire_2': {'pages': ['{employee_id}: four coins. The coin tray is half full.', 'The board calls it half empty. Then asks for more.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'master_beaten_frostspire_3': {'pages': ['Frostspire hall cleared, {employee_id}. Value held in the cold.', 'The assets are fine. Wear a coat. For the assets.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'master_beaten_frostspire_4': {'pages': ['{employee_id}: Frostspire coin in. Altitude: high.', 'Asset value: also high. We checked that one first.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'master_beaten_mirefen': {'pages': ['{employee_id}: Mirefen Master beaten. Coin five, filed.', 'Swamp assets, out-swamped. The board loves a bog win.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'master_beaten_mirefen_2': {'pages': ['Mirefen hall cleared, {employee_id}. Asset value: not sinking.', 'Unlike your boots. Those are on their own.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'master_beaten_mirefen_3': {'pages': ['{employee_id}: five coins. Most of the coin tray, owned.', "The board has started saying 'we' a lot."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'master_beaten_mirefen_4': {'pages': ['{employee_id}: Mirefen coin logged. Storm season is coming.', 'Storms are bad for staff. Good for rare assets.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'master_beaten_tidewater': {'pages': ['{employee_id}: Tidewater Coast Master beaten. Coin six.', 'Sea assets, out-tided. Value came in like a wave.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'master_beaten_tidewater_2': {'pages': ['Tidewater hall cleared, {employee_id}. Asset value: high tide.', "It's never low tide on our charts. Chart policy."], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'master_beaten_tidewater_3': {'pages': ['{employee_id}: six coins. The vault needs a waterproof shelf.', "Facilities says it's a coastal coin thing."], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'master_beaten_tidewater_4': {'pages': ['{employee_id}: Tidewater coin in. The sea lane north is open.', 'Lanternport has unlogged assets. Off you go.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'master_beaten_lanternport': {'pages': ['{employee_id}: Delphine Orrin beaten. Lanternport coin, filed.', 'Seven coins. The board is drafting a speech. About assets.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'master_beaten_lanternport_2': {'pages': ['Old Lighthouse cleared, {employee_id}. Asset value: beaming.', 'Spirit-type assets lost to company assets. Spooky.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'master_beaten_lanternport_3': {'pages': ["{employee_id}: Delphine Orrin's team is down. Coin seven.", 'The tide-lock is open. Fewer steps per asset.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'master_beaten_lanternport_4': {'pages': ['{employee_id}: Lanternport coin logged. The horn just sounded.', 'Something big woke up. Big things are worth a lot.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'master_beaten_cindervale': {'pages': ['{employee_id}: Cindervale Master beaten. Eighth coin, filed.', 'All eight. The asset portfolio is now red-hot.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'master_beaten_cindervale_2': {'pages': ['The Forge cleared, {employee_id}. Asset value: fully forged.', 'The board is melting with joy. Not literally.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'master_beaten_cindervale_3': {'pages': ['{employee_id}: eight coins on file. The coin tray is full.', 'We ordered a bigger tray. In case you find a ninth.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'master_beaten_cindervale_4': {'pages': ['{employee_id}: Cindervale coin in. The Aurelith arena opens.', 'Bring the assets. Bring them back unscratched.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'rival_beaten_ron_1': {'pages': ['{employee_id}: you beat Ron. Two company teams. One winner.', 'Either way, every asset on that field was ours.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_ron_1_2': {'pages': ["{employee_id}: Ron's team lost. His team is company property too.", 'So we won twice. Efficient.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_ron_1_3': {'pages': ['First Ron battle logged, {employee_id}. Asset value holds.', 'Trail Runners issued. Faster legs, faster logging.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_ron_1_4': {'pages': ['{employee_id}: friendly match recorded. Ron is fine.', "The assets are also fine. That's the important part."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'rival_beaten_ron_2': {'pages': ['{employee_id}: Ron beaten in Saltmere. Your ID outranks his.', "By one numeral. HR says it's mostly decorative."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'rival_beaten_ron_2_2': {'pages': ['{employee_id}: Ron wanted a numeral. He got a loss on file.', 'Both cost the company nothing. Our favourite price.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'rival_beaten_ron_2_3': {'pages': ["Saltmere match logged, {employee_id}. Ron's assets: resting.", 'Yours: appreciated. In the financial sense.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'rival_beaten_ron_2_4': {'pages': ['{employee_id}: rival result filed. Field Researcher II wins.', 'The numeral is free. Raises are a separate form.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'rival_beaten_ron_3': {'pages': ['{employee_id}: Ron beaten on the HQ plaza. In public.', 'Good for the brand. The plaza bulletin is being typed.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'rival_beaten_ron_3_2': {'pages': ['{employee_id}: rival win, right in front of Head Office.', 'Free advertising. Marketing sent a thumbs-up.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'rival_beaten_ron_3_3': {'pages': ['HQ plaza match logged, {employee_id}.', 'The windows got a show. The assets got the credit.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'rival_beaten_ron_3_4': {'pages': ['{employee_id}: Ron lost outside Head Office.', 'Reception has post for him. We have a result for you.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'rival_beaten_ron_4': {'pages': ['{employee_id}: Ron beaten on Frostspire Pass. No coat, no win.', "Your assets stayed warm. That's what counts."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'rival_beaten_ron_4_2': {'pages': ['{employee_id}: cold-weather match filed. Asset value held.', "Ron's hands were too cold to argue. Convenient."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'rival_beaten_ron_4_3': {'pages': ['Bridge match logged, {employee_id}. The bridge held. So did value.', 'The engineer gets a nod. The assets get the bonus.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'rival_beaten_ron_4_4': {'pages': ['{employee_id}: Ron lost at the bridge. He still refuses a coat.', 'No comment. Coats are not a company asset.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'rival_beaten_ron_5': {'pages': ['{employee_id}: Ron beaten in Lanternport. Then he gave you a page.', 'Company paper, returned. Rare behaviour. Logged.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'rival_beaten_ron_5_2': {'pages': ['{employee_id}: harbour steps match logged. Asset value: docked.', 'Safely. Nothing fell in the harbour. We counted.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'rival_beaten_ron_5_3': {'pages': ['Ron result filed, {employee_id}. Revival Tech paper recovered.', 'Lost-and-found counts as an asset. Ask Legal.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'rival_beaten_ron_5_4': {'pages': ['{employee_id}: you beat Ron by the harbour. Again.', 'He keeps a tally. So do we. Ours has decimals.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'rival_beaten_ron_6': {'pages': ['{employee_id}: final match with Ron logged. Six on six.', 'Twelve company assets. One clean result. Lovely.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'rival_beaten_ron_6_2': {'pages': ["{employee_id}: Ron beaten on the arena steps. He's coming along.", 'Two staff, one trip. The travel budget approves.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'rival_beaten_ron_6_3': {'pages': ["Last rival result filed, {employee_id}. Ron's tally closes.", "We'll archive it. Next to the bin rota."], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'rival_beaten_ron_6_4': {'pages': ['{employee_id}: rival file closed. Asset value: undefeated.', "Ron says he's coming. Two numbers, one lift."], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'area_new_route1': {'pages': ['{employee_id}: Trail 1 logged. First stretch of the asset map.', "It's mostly grass. Grass full of assets."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_route1_2': {'pages': ['Trail 1 is on file, {employee_id}.', 'Every patch of tall grass is a possible line item.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_route1_3': {'pages': ['{employee_id}: Trail 1 added to company land records.', 'Please stay on the path. Unless an asset is off it.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_route1_4': {'pages': ['{employee_id}: Trail 1 logged. Distance walked: billable.', 'Billable by us. Not by you.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_fernwick': {'pages': ["{employee_id}: Fernwick logged. A town with a Master's Hall.", 'Halls hold coins. Coins hold value. Proceed.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_fernwick_2': {'pages': ['Fernwick is on the asset map, {employee_id}.', 'Quiet town. Good soil. We already priced the soil.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_fernwick_3': {'pages': ['{employee_id}: Fernwick added. The field team was meant to be here.', "They're not. You are. The map doesn't mind."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_fernwick_4': {'pages': ["{employee_id}: Fernwick on file. There's a branch office here.", 'Please use it. Unused branches look bad on paper.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'area_new_thornwood': {'pages': ['{employee_id}: Thornwood logged. Lots of trees. Lots of shade.', 'Shade hides assets. Look under it.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_thornwood_2': {'pages': ['Thornwood is on the asset map, {employee_id}.', 'Someone here has opinions about the company. Noted.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_thornwood_3': {'pages': ['{employee_id}: Thornwood added. Thorny, but valuable.', 'Snagged sleeves are not a company expense.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_thornwood_4': {'pages': ['{employee_id}: Thornwood on file. Ferns, tents, the usual.', 'The ferns are scenery. The things in them are assets.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_greystone_entrance': {'pages': ['{employee_id}: Greystone Caverns logged. Underground land.', 'It counts. We measured the ceiling too.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_greystone_entrance_2': {'pages': ['Greystone Caverns is on file, {employee_id}.', 'Dark, damp and full of unlogged assets. Ideal.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_greystone_entrance_3': {'pages': ['{employee_id}: caverns added to the asset map.', 'Underground assets are worth the same. Find some.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_greystone_entrance_4': {'pages': ['{employee_id}: Greystone logged. Rocks are not assets.', 'Unless they move. Then look twice.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_aurelith': {'pages': ["{employee_id}: Aurelith logged. There's an arena here.", "It's sealed. We'll come back when it's profitable."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_aurelith_2': {'pages': ['Aurelith is on the asset map, {employee_id}.', 'Big arena, locked doors. Very premium. Very later.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_aurelith_3': {'pages': ['{employee_id}: Aurelith added. Crossroads land is worth a lot.', 'Every road runs through it. So does the value.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_aurelith_4': {'pages': ['{employee_id}: Aurelith on file. The arena wants eight coins.', 'We want eight coins too. Great minds.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_saltmere': {'pages': ['{employee_id}: Saltmere logged. Seaside land, fish included.', 'The fish are assets. The smell is a bonus feature.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_saltmere_2': {'pages': ['Saltmere is on the asset map, {employee_id}.', 'Sea air, sea creatures, sea value. Mostly value.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_saltmere_3': {'pages': ["{employee_id}: Saltmere added. There's an office here.", 'Another desk with your number on it. Somewhere.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_saltmere_4': {'pages': ['{employee_id}: Saltmere on file. Docks, nets, market stalls.', 'If it splashes, log it. If it nibbles, also log it.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'area_new_revival_heights': {'pages': ["{employee_id}: Revival Heights logged. That's Head Office.", 'Our own land. Please wipe your feet on the asset map.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'area_new_revival_heights_2': {'pages': ['Revival Heights is on file, {employee_id}. Welcome to HQ.', 'Visitors stay in the lobby. Assets get the tour.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'area_new_revival_heights_3': {'pages': ['{employee_id}: Revival Heights added. Property value: maximum.', 'We wrote that ourselves. Nobody checked.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'area_new_revival_heights_4': {'pages': ["{employee_id}: you've walked all the way to Head Office.", "The shoes did well. We'll note the shoes."], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'area_new_frostspire_pass': {'pages': ["{employee_id}: Frostspire Pass logged. It's cold up here.", 'Cold land still counts. We checked with Legal.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire_pass_2': {'pages': ['Frostspire Pass is on the asset map, {employee_id}.', 'Ice slows staff down. Assets in ice keep fresh.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire_pass_3': {'pages': ['{employee_id}: the pass is on file. Altitude adds value.', "That's not how value works. It is today."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire_pass_4': {'pages': ['{employee_id}: Frostspire Pass added. Bring a scarf.', 'Chattering teeth make typos in reports.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire': {'pages': ['{employee_id}: Frostspire logged. A shrine town on a peak.', 'Peak land. Peak value. Peak paperwork.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire_2': {'pages': ['Frostspire is on file, {employee_id}.', 'Snow on the asset map. The map wants a blanket.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire_3': {'pages': ['{employee_id}: Frostspire added. Windy land, apparently.', 'Hold on to the paperwork. And the assets.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_frostspire_4': {'pages': ['{employee_id}: Frostspire on file. The shrine is dark for now.', 'Lit shrines raise property value. Just saying.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'area_new_sunmeadow_fields': {'pages': ['{employee_id}: Sunmeadow Fields logged. Very sunny land.', "Sunshine is not an asset. We've asked twice."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_sunmeadow_fields_2': {'pages': ['Sunmeadow Fields is on the asset map, {employee_id}.', 'Wide open grass. Wide open opportunities. For us.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_sunmeadow_fields_3': {'pages': ['{employee_id}: Sunmeadow added. That wall really was in the way.', 'Walls cost value. Meadows make it.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_sunmeadow_fields_4': {'pages': ['{employee_id}: Sunmeadow on file. Flowers everywhere.', 'Some of the flowers have legs. Those are assets.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_mirefen_bog': {'pages': ['{employee_id}: Mirefen Bog logged. Squelchy land.', 'Squelchy land still counts. Keep moving.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_mirefen_bog_2': {'pages': ['Mirefen Bog is on the asset map, {employee_id}.', 'Boots are not covered. Assets are.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_mirefen_bog_3': {'pages': ['{employee_id}: the bog is on file. It smells like progress.', 'Progress smells like moss. Who knew.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_mirefen_bog_4': {'pages': ['{employee_id}: Mirefen Bog added. Mind the deep bits.', "Things sink in bogs. Asset value shouldn't."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'area_new_tidewater_coast': {'pages': ['{employee_id}: Tidewater Coast logged. Land that moves.', "Twice a day. We're still deciding how to bill it."], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'area_new_tidewater_coast_2': {'pages': ['Tidewater Coast is on file, {employee_id}.', 'Half of it is sea. The sea half counts double. Allegedly.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'area_new_tidewater_coast_3': {'pages': ['{employee_id}: Tidewater Coast added. Sand gets everywhere.', 'Shake out the crystals. Assets hate sand.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'area_new_tidewater_coast_4': {'pages': ['{employee_id}: the coast is on the asset map. Mind the wall.', 'The sea wall is ours. The sea is pending.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'area_new_lanternport': {'pages': ["{employee_id}: Lanternport logged. There's a lighthouse.", "It's dark. We'd fix it, but there's no budget."], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'area_new_lanternport_2': {'pages': ['Lanternport is on the asset map, {employee_id}.', 'Harbour towns ship assets. We like ships.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'area_new_lanternport_3': {'pages': ['{employee_id}: Lanternport added. Old lighthouse, still unlit.', 'The land value, however, is glowing.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'area_new_lanternport_4': {'pages': ['{employee_id}: Lanternport on file. Gulls, ropes, fog.', "Please log the gulls. They're louder than the paperwork."], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'area_new_cindervale': {'pages': ['{employee_id}: Cindervale logged. Volcanic land. Warm.', 'Very warm. Asset value is also running hot.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'area_new_cindervale_2': {'pages': ['Cindervale is on the asset map, {employee_id}.', 'A forge town. Value gets made here. Literally.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'area_new_cindervale_3': {'pages': ['{employee_id}: Cindervale added. The ground is hot.', 'Walk quickly. The map hates scorch marks.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'area_new_cindervale_4': {'pages': ['{employee_id}: Cindervale on file. Something big slept nearby.', "There's a dent. Big dents mean big assets."], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'quest_done_mq_brookhollow_promotion': {'pages': ['{employee_id}: promotion processed. Title: Field Researcher.', "Same number. Longer title. That's the deal."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_brookhollow_promotion_2': {'pages': ["{employee_id}: you're field staff now. With a creature.", "The creature is the asset. You're the carrier."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_brookhollow_promotion_3': {'pages': ['Promotion filed, {employee_id}. HR spelled your number right.', 'First try. A good day for HR.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_brookhollow_promotion_4': {'pages': ['{employee_id}: new role on file. Desk: none. Field: all of it.', "Fresh air is included. Please don't expense it."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_route1_benchmark': {'pages': ["{employee_id}: The Benchmark, closed. You've been measured.", 'Your file is a sticky note. A neat one.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_route1_benchmark_2': {'pages': ['{employee_id}: benchmark done. Trail Runners issued.', 'Faster staff, more assets per hour. Lace up.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_route1_benchmark_3': {'pages': ['Benchmark logged, {employee_id}. Fernwick reached.', 'One Trail down. The asset map wants many more.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_route1_benchmark_4': {'pages': ['{employee_id}: the benchmark is on file. A baseline is set.', 'From here the graph may only go up. Company policy.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_fernwick_hall': {'pages': ['{employee_id}: Stand Your Ground, closed. Coin reported.', "The manager filed it before you'd finished talking."], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_fernwick_hall_2': {'pages': ['{employee_id}: Fernwick hall task done. Plates, crystals, coin.', 'Puzzles solved at no extra cost. Great value.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_fernwick_hall_3': {'pages': ['Hall report filed, {employee_id}. Next stop: Greystone.', 'The manager pointed. The asset map agreed.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_fernwick_hall_4': {'pages': ['{employee_id}: coin report received. One of eight.', 'Seven to go. The coin tray is very patient.'], 'parity': 'E10', 'build': 'partial', 'region': 1}, 'quest_done_mq_thornwood_camp': {'pages': ['{employee_id}: Ferns Over the Tent, closed. Camp restored.', 'A working stove in Thornwood. Asset morale: up.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_thornwood_camp_2': {'pages': ['{employee_id}: camp task done. A field log page recovered.', 'Paper is a company asset. Even the soggy kind.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_thornwood_camp_3': {'pages': ['Thornwood camp logged, {employee_id}. First rest by a stove.', "Warm assets work harder. That's the whole study."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_thornwood_camp_4': {'pages': ['{employee_id}: the camp is back in use. No rent charged.', 'Yet. Facilities is drawing up a sign.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_greystone_camp': {'pages': ['{employee_id}: Greystone First, closed. Cave camp restored.', 'Underground real estate. Now with heating.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_greystone_camp_2': {'pages': ['{employee_id}: boulder pushed, stove lit, page found.', 'Three tasks, one wage. Efficiency.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_greystone_camp_3': {'pages': ['Greystone camp logged, {employee_id}. Another log page in.', 'The missing pages add up. So does the value.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_greystone_camp_4': {'pages': ['{employee_id}: the cold camp is warm again.', 'Cave assets approve. We assume. They hiss a lot.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_saltmere_parcel': {'pages': ['{employee_id}: Signed For, closed. Parcel delivered.', 'Postage saved. Courier Bike on loan. Please return it.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_saltmere_parcel_2': {'pages': ['{employee_id}: parcel signed for in Saltmere.', "You're a courier now too. Same pay. More wheels."], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_saltmere_parcel_3': {'pages': ['Saltmere delivery logged, {employee_id}. The clerk is satisfied.', 'Satisfied clerks speed up paperwork. A rare asset.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_saltmere_parcel_4': {'pages': ['{employee_id}: parcel task done. Nothing got dented.', 'Parcels and assets: both best kept undented.'], 'parity': 'E10', 'build': 'partial', 'region': 2}, 'quest_done_mq_revival_heights': {'pages': ['{employee_id}: Head Office task closed. Visit logged.', 'Please hand in the visitor lanyard on the way out.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'quest_done_mq_revival_heights_2': {'pages': ['{employee_id}: HQ visit complete. Ron got some post.', 'Post is not an asset. Ron may disagree.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'quest_done_mq_revival_heights_3': {'pages': ['Head Office task logged, {employee_id}. The south gate is open.', 'Shortcuts save time. Time is money. Money is us.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'quest_done_mq_revival_heights_4': {'pages': ['{employee_id}: Revival Heights work done. HQ is pleased.', 'With the coin count. It said so in a memo.'], 'parity': 'E10', 'build': 'partial', 'region': 3}, 'quest_done_mq_frostspire': {'pages': ['{employee_id}: Rated for One, closed. The shrine is lit again.', 'Lit shrines bring visitors. Visitors lift land value.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'quest_done_mq_frostspire_2': {'pages': ['{employee_id}: Frostspire task done. Camp restored. Page found.', "Another page for the binder. It's a big binder."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'quest_done_mq_frostspire_3': {'pages': ['Frostspire work logged, {employee_id}. Bridge rated for one.', "One trainer at a time. Assets don't weigh much."], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'quest_done_mq_frostspire_4': {'pages': ['{employee_id}: the snowed-in camp is open for business.', 'Business is a strong word. Open is accurate.'], 'parity': 'E10', 'build': 'partial', 'region': 4}, 'quest_done_mq_mirefen': {'pages': ['{employee_id}: Not a Fisher, closed. Notebook recovered.', 'No fish caught. Lots of value caught. Good trade.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'quest_done_mq_mirefen_2': {'pages': ['{employee_id}: reed island camp restored.', 'Island property. The board wants a little flag on it.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'quest_done_mq_mirefen_3': {'pages': ['Mirefen task logged, {employee_id}. Last notebook page read.', 'Notebooks are assets. Bog water damage is not.'], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'quest_done_mq_mirefen_4': {'pages': ["{employee_id}: the angler's notebook task is done.", "He's not a fisher. You're not a fisher. Nobody fishes."], 'parity': 'E10', 'build': 'partial', 'region': 5}, 'quest_done_mq_tidewater': {'pages': ['{employee_id}: Deep Enough to Lose a Boot, closed.', 'Boots: maybe one fewer. Asset value: one coin more.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'quest_done_mq_tidewater_2': {'pages': ['{employee_id}: coast task done. The flooded road is crossed.', 'Floods lower land value. Crossing them raises ours.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'quest_done_mq_tidewater_3': {'pages': ['Tidewater work logged, {employee_id}. The sea lane is open.', 'Wet socks are not reimbursed. Wet assets get dried.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'quest_done_mq_tidewater_4': {'pages': ['{employee_id}: Tidewater task closed. Boot count checked.', 'Still two. Facilities sends its regards.'], 'parity': 'E10', 'build': 'partial', 'region': 6}, 'quest_done_mq_lanternport': {'pages': ['{employee_id}: The Page Ron Kept, closed. Lighthouse cleared.', 'Ron handed in company paper. Rare behaviour. Logged.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'quest_done_mq_lanternport_2': {'pages': ['{employee_id}: Lanternport work done. The horn has sounded.', 'Loud events raise brand awareness. Mostly with gulls.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'quest_done_mq_lanternport_3': {'pages': ['Lanternport task logged, {employee_id}. Tide-lock open.', 'A shortcut home to Fernwick. Commute value: improved.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'quest_done_mq_lanternport_4': {'pages': ['{employee_id}: the log page is on file. Seven coins as well.', 'Pages and coins. Our two favourite things. After assets.'], 'parity': 'E10', 'build': 'partial', 'region': 7}, 'quest_done_mq_cindervale': {'pages': ['{employee_id}: Something Louder, closed. Eight coins in.', 'The board ran out of adjectives. They used numbers.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'quest_done_mq_cindervale_2': {'pages': ['{employee_id}: Cindervale task done. Volcanic road survived.', 'Asset value: toasty. Asset temperature: also toasty.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'quest_done_mq_cindervale_3': {'pages': ['Cindervale work logged, {employee_id}. All coins accounted for.', 'Audit passed. The auditor asked for a nap.'], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'quest_done_mq_cindervale_4': {'pages': ['{employee_id}: eighth coin registered.', "Senior lanyards exist. Rumour says they're at HQ."], 'parity': 'E10', 'build': 'partial', 'region': 8}, 'quest_done_mq_welcome_back': {'pages': ['{employee_id}: There Will Be Cake, closed. The office is open.', 'There is cake. For the field team. And the assets.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_welcome_back_2': {'pages': ['{employee_id}: the field team is back at their desks.', 'Staff headcount restored. Asset count still higher.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_welcome_back_3': {'pages': ['Welcome-back task logged, {employee_id}.', 'Cake Friday is back. Your slice is pending approval.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_welcome_back_4': {'pages': ['{employee_id}: Brookhollow office reopened.', 'Normal service resumes. The grass still needs walking in.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_aurelith_arena': {'pages': ['{employee_id}: No Breaks Between, closed. Every Master beaten.', "Back to back. Asset value hasn't sat down since."], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_aurelith_arena_2': {'pages': ['{employee_id}: arena run complete. No healing, no losses.', 'Maximum value, minimum downtime. The dream.'], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_aurelith_arena_3': {'pages': ['Aurelith arena logged, {employee_id}. The doors stayed open.', "We said we'd come back when it was profitable."], 'parity': 'E10', 'build': 'partial', 'region': 9}, 'quest_done_mq_aurelith_arena_4': {'pages': ['{employee_id}: every Battle Master down in one go.', 'The board wants that framed. The result, that is.'], 'parity': 'E10', 'build': 'partial', 'region': 9}}

# Gary 1:00 PM CT Oct 23: region 1 Kilindex milestones are 5/10/15.
for _k in ("kilindex_milestone_25", "kilindex_milestone_25_2", "kilindex_milestone_25_3", "kilindex_milestone_25_4"):
    S["system_company_voice"][_k]["region"] = 2  # about 17-18 kinds by Master 1, so 25 is first reachable in region 2
S["system_company_voice"]["_section"] = S["system_company_voice"]["_section"].replace("Default off (?cv=1).", "Default on from v0.2.0-alpha (Gary 1:00 PM CT Oct 23), region 1 events only.")
S["system_company_voice"]['kilindex_milestone_5'] = {"pages": ['{employee_id}: 5 kinds on file. A small asset pile.', 'Small piles become big piles. Keep logging.'], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_5_2'] = {"pages": ['Five kinds logged, {employee_id}. A starter portfolio.', "It's five creatures. We call it a portfolio."], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_5_3'] = {"pages": ['{employee_id}: 5 kinds. Asset value is no longer tiny.', "Now it's just small. That's progress."], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_5_4'] = {"pages": ['{employee_id}: 5 kinds registered. The grass is paying off.', 'For the company. You get grass stains.'], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_15'] = {"pages": ['{employee_id}: 15 kinds on file. The ledger needs a new page.', 'We tore one out of your file. It was blank.'], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_15_2'] = {"pages": ['Fifteen kinds, {employee_id}. Asset value is getting serious.', "You don't have to. Just keep walking."], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_15_3'] = {"pages": ['{employee_id}: 15 kinds logged. The board asked for a chart.', "We made them a chart. You're not on it."], "parity": "E10", "build": "partial", "region": 1}
S["system_company_voice"]['kilindex_milestone_15_4'] = {"pages": ['{employee_id}: 15 kinds. The asset folder is getting heavy.', "Please don't stop. We like heavy folders."], "parity": "E10", "build": "partial", "region": 1}


# Text Bot r3 (Oct 27 2026): region retags per data/textbot_requests_rita_voice_r2.md (counts_by_region 3 = 50/100/150;
# Greystone sits behind gate_thornwood_east / beat_master_saltmere and is in region_pulls region 3).
for _b in ("kilindex_milestone_50", "kilindex_milestone_100", "area_new_greystone_entrance", "quest_done_mq_greystone_camp"):
    for _sfx in ("", "_2", "_3", "_4"):
        S["system_company_voice"][_b + _sfx]["region"] = 3
# Crystal resupply (brief data/textbot_requests_rita_resupply.md): out of dominance crystals in the opening test run
# (lab_brookhollow, catch 2) before catching two; shown in the overworld after the battle, bag restocked to {count} (5).
# "Reflect on your check" is flavour only: no deduction, debt or balance exists. DRAFT.
S["system_company_voice"]['crystal_resupply'] = {"pages": ['{employee_id}: out of crystals already. Company stock, gone.', "Supply is sending {count} more. It's going to reflect on your check."], "parity": "E10", "build": "partial", "region": 1, "status": "DRAFT"}
S["system_company_voice"]['crystal_resupply_2'] = {"pages": ['Crystals depleted, {employee_id}. In a test run.', "{count} more issued. Your check will hear about this."], "parity": "E10", "build": "partial", "region": 1, "status": "DRAFT"}
S["system_company_voice"]['crystal_resupply_3'] = {"pages": ['{employee_id}: zero crystals and the test run is not done.', "Here are {count} more. This will reflect on your check."], "parity": "E10", "build": "partial", "region": 1, "status": "DRAFT"}
S["system_company_voice"]['crystal_resupply_4'] = {"pages": ['{employee_id}: crystal stock empty. Restocking {count}.', "Hold them up at creatures this time. It shows on your check."], "parity": "E10", "build": "partial", "region": 1, "status": "DRAFT"}


S["system_phone"] = {
 "_section": "Smartphone (parity M8, G4, M5, M10). Clock = clock.js (1 real minute = 1 game hour).",
 "menu": {"labels": {"team": "Team", "pack": "Pack", "kilindex": "Kilindex", "tasks": "Tasks", "map": "Map", "contacts": "Contacts", "save": "File today's report", "options": "Options"},
          "parity": "M8", "build": "different", "pending_gary_call": "phone_vs_pc_storage", "note": "storage lives on the terminal or the phone, per Gary"},
 "clock": {"pages": ["It's {time}."], "parity": "M5", "build": "built"},
 "clock_by_phase": {"dawn": ["It's {time}. Too early for anyone but birds."], "day": ["It's {time}. Office hours."],
                    "dusk": ["It's {time}. Lamps are coming on."], "night": ["It's {time}. Most sensible people are asleep."],
                    "parity": "M5", "build": "built"},
 "ping": {"pages": ["Your phone pings. Text from {trainer}."], "parity": "G4", "build": "different"},
 "rematch_text": {"pages": ["{trainer}: \"Trained all week. You. Me. Same spot?\""], "parity": "G4", "build": "different"},
 "no_signal": {"pages": ["No signal down here."], "parity": "M8", "build": "different"},
 "task_done": {"pages": ["Task done: {task}.", "Payment pending. Good work."], "parity": "E10", "build": "different"},
}

# Contacts (Oct 23 2026, Text Bot)
G="G4"; B="different"
def e(pages, **kw):
    d={"pages":pages,"parity":G,"build":B}; d.update(kw); return d
def v(pool): return {"pages":pool[0],"variants_pool":pool,"parity":G,"build":B}
generic={
 "swap_offer": e(["Want to swap numbers? I'll text you when I'm ready for round two."], choices=["Sure","Maybe later"]),
 "swap_yes": e(["Great. Expect a text once I've trained up."]),
 "added": e(["{trainer} was added to your Contacts."]),
 "swap_no": e(["No worries. Ask me again some time."]),
 "full": e(["Your Contacts list is full. Remove someone first."]),
 "call": v([["{trainer}: \"Hey! Still training out here.\""],["{trainer}: \"Good timing. I was just thinking about our battle.\""],["{trainer}: \"Can't talk long. My team's getting restless.\""]]),
 "call_ready": e(["{trainer}: \"I'm at my usual spot. Come find me!\""]),
 "ping": e(["Your phone pings. Text from {trainer}."]),
 "rematch_text": e(["{trainer}: \"Trained all week. You. Me. Same spot?\""]),
 "tip_text": e(["{trainer}: \"Tip for you. A rare {species} was spotted.\"","\"It's on {place}{time}. Go take a look!\""]),
 "rematch_ask": e(["Ready for our rematch?"], choices=["Let's go","Not now"]),
 "rematch_not_now": e(["Okay. I'll be right here."]),
 "rematch_beaten": e(["Beaten again. Back to training for me."]),
 "rematch_won": e(["That one's mine! Come back any time."]),
 "gift": e(["Here, take this. It helps on long walks."]),
 "gift_received": e(["You got {item}."]),
 "remove_confirm": e(["Remove {trainer} from your Contacts?"], choices=["Remove","Keep"]),
 "removed": e(["{trainer} was removed from your Contacts."]),
}
strings={"title":"Contacts","call_label":"Call","remove_label":"Remove","back_label":"Back","ok_label":"OK","ready_chip":"Rematch",
 "empty":"No contacts yet. Swap numbers with trainers you beat.","last_text":"Last text","no_text":"No texts yet.","where":"Usually at",
 "time_dawn":" at dawn","time_day":" by day","time_dusk":" at dusk","time_night":" at night"}
generic.update(strings)
def T(name, d): return d
trainers={"route1":{
 "trainer_r1_d":{
  "swap_offer": e(["Swap numbers? I'll text you for a rematch. For research."], choices=["Sure","Maybe later"]),
  "swap_yes": e(["Perfect. You're in my notes now."]), "swap_no": e(["Fine. I'll log that as a no."]),
  "call": v([["Odette: \"Can't talk. I'm counting glintflies. Lost count.\""],["Odette: \"The lab wants more data. I want a rematch.\""]]),
  "call_ready": e(["Odette: \"I'm back on Trail 1. Bring your team. I need data.\""]),
  "rematch_text": e(["Odette: \"New theory. Need to test it on you. Trail 1?\""]),
  "tip_text": e(["Odette: \"Data alert! A rare {species} was logged.\"","\"It's on {place}{time}. Please log it for me.\""]),
  "rematch_ask": e(["Ready for round two? I've got notes this time."], choices=["Let's go","Not now"]),
  "rematch_beaten": e(["The notes didn't help. I need more notes."]), "rematch_won": e(["Ha! The theory works!"])},
 "trainer_r1_e":{
  "swap_offer": e(["Swap numbers? I'll text when my beetles are up for round two."], choices=["Sure","Maybe later"]),
  "swap_yes": e(["Good. Quiet texts only, though."]), "swap_no": e(["That's fine. No rush."]),
  "call": v([["Rowan: \"Shh. They're asleep. Call back later.\""],["Rowan: \"My burlbeetle ate a whole leaf today. Big day.\""]]),
  "call_ready": e(["Rowan: \"The beetles are awake. Come down by the ledges.\""]),
  "rematch_text": e(["Rowan: \"Beetles are rested and grumpy. Rematch by the ledges?\""]),
  "tip_text": e(["Rowan: \"Saw a rare {species} out near the beetles.\"","\"Try {place}{time}. Walk slow.\""]),
  "rematch_ask": e(["Beetles are ready. You?"], choices=["Let's go","Not now"]),
  "rematch_beaten": e(["Back to napping, then."]), "rematch_won": e(["Slow and steady. Told you."])},
 "trainer_r1_f":{
  "swap_offer": e(["Swap numbers? I'll text you about rematches. And good rocks."], choices=["Sure","Maybe later"]),
  "swap_yes": e(["Great. You'll hear about every rock."]), "swap_no": e(["Your loss. These rocks are great."]),
  "call": v([["Dorian: \"Found a flat one today. Perfectly flat.\""],["Dorian: \"Recounted the boardwalk stones. Same number.\""]]),
  "call_ready": e(["Dorian: \"I'm at the boardwalk. Come get your rematch.\""]),
  "rematch_text": e(["Dorian: \"New stone, new team. Boardwalk rematch?\""]),
  "tip_text": e(["Dorian: \"A rare {species} turned up by my rocks.\"","\"Check {place}{time}.\""]),
  "rematch_ask": e(["Rematch? I polished my stones for this."], choices=["Let's go","Not now"]),
  "rematch_beaten": e(["Ouch. Rock bottom."]), "rematch_won": e(["Solid win. Like a rock."]),
  "gift": e(["You keep beating me. Take this. It helps on long walks."])}},
 "fernwick":{
 "trainer_fw_a":{
  "swap_offer": e(["Swap numbers? I'll text you when I'm ready for round two."], choices=["Sure","Maybe later"]),
  "swap_yes": e(["Great. A training partner!"]), "swap_no": e(["Fine. I'll just beat you later."]),
  "call": v([["Sabine: \"Training. Always training. What's up?\""],["Sabine: \"One day I'll battle the Master. Today I'm stretching.\""]]),
  "call_ready": e(["Sabine: \"I'm by the Master's Hall. Ready when you are.\""]),
  "rematch_text": e(["Sabine: \"Trained all week. Rematch by the Hall?\""]),
  "tip_text": e(["Sabine: \"Heard a rare {species} turns up nearby.\"","\"It's on {place}{time}. Good training!\""]),
  "rematch_ask": e(["Round two? I've been practicing."], choices=["Let's go","Not now"]),
  "rematch_beaten": e(["Okay. More practice."]), "rematch_won": e(["Yes! The Hall's next!"])},
 "ron_rival_1":{
  "swap_offer": e(["We never swapped numbers? Here, put mine in."], choices=["Sure","Maybe later"]),
  "swap_yes": e(["Text me if you get stuck. Or bored."]), "swap_no": e(["Seriously? Fine. Ask me later, then."]),
  "call": v([["Ron: \"Busy. Kind of. What's up?\""],["Ron: \"Don't tell the manager, but I'm on a snack break.\""],["Ron: \"You logged more than me again, didn't you?\""]]),
  "tip_text": e(["Ron: \"Heads up. A rare {species} was spotted.\"","\"It's on {place}{time}. Beat me to it.\""]),
  "note": "Ron never offers rematches (story rival), so no rematch_* lines"}}}
CONTACTS={"_section":"Trainer Contacts (Gary 12:24 PM CT; shipping in region 1 per Gary 12:42 PM CT Oct 23 2026). Read by src/systems/contacts.js. Lookup: trainers.<map>.<id>.<field>, then generic.<field>. 'call' entries: pages = first reply, variants_pool = all replies (pick one). DRAFT Oct 23 2026 12:50 PM CT.",
 "generic":generic,"trainers":trainers}

S["system_contacts"] = CONTACTS

# Cut A (Oct 23 2026, Text Bot) opening / starter flow, read by src/overworld/intro.js _sysPages + leave_block pick. DRAFT pending Gary.
S["system_opening"] = {
 "starter_picker_title": {"labels": {"title": "Choose your partner"}, "pages": ["Choose your partner"], "parity": "G12", "build": "partial", "note": "DRAFT; picker header"},
 "test_run_progress": {"pages": ["Test run: {n}/{need} logged."], "parity": "M14", "build": "partial", "note": "DRAFT; toast after each test-run catch"},
 "test_run_logged": {"pages": ["That's two in the Kilindex. Time to head back to the lab."], "parity": "M14", "build": "partial", "note": "DRAFT; inner thought when the test run is done"},
 "leave_block": {"pages": ["Work's the other way. The office won't wait all day."], "parity": "M14", "build": "partial",
  "note": "DRAFT; inner thought when leaving town too early; first-match lines by stage (office/lab/run/back)",
  "lines": [
   {"id": "v_test_run_done", "flags": ["test_run_done"], "pages": ["Two logged. The lab's waiting on me, not the road."]},
   {"id": "v_test_run_started", "flags": ["test_run_started"], "pages": ["The test run's on Trail 1. Fernwick can wait till I'm done."]},
   {"id": "v_flg_promoted", "flags": ["flg_promoted"], "pages": ["Not without a partner. Lab first."]},
   {"id": "default", "flags": [], "pages": ["Work's the other way. The office won't wait all day."]},
  ]},
 "free_roam": {"pages": ["Free roam. Raise your team and log every kind you can find."], "parity": "M14", "build": "partial", "note": "DRAFT; toast after the job briefing"},
 "no_party_battle": {"pages": ["No creature on me. I'm not battling anyone bare-handed."], "parity": "G12", "build": "partial", "note": "DRAFT; inner thought when a battle starts with an empty party"},
}

# RT Employee Benefits (Gary 1:01-1:02 PM CT Oct 23 2026: company XP skill tree, phone tab, region 1). Coder brief: data/textbot_requests_rt_benefits.md.
# Plain strings read by ui.T('system_rt_benefits.<key>'); validated by _rtb_fields in the builder. RITA's tone, kept short for the 844x390 phone.
S["system_rt_benefits"] = {
 "_section": "RT Employee Benefits (parity E10, build different). Company XP skill tree on the phone. Voice: RITA.",
 "labels": {
  "tab_title": "RT Employee Benefits", "employee_id": "Employee ID", "id_level": "ID {level}",
  "points": "{points} pts", "points_one": "{points} pt", "xp": "XP", "xp_to_next": "{into}/{span}",
  "xp_capped": "Region cap", "buy": "Buy rank {rank}", "cancel": "Not now", "rank": "Rank {rank}/{max}",
  "cost": "Cost: {cost} pt · Needs ID {level}", "state_available": "Available", "state_owned": "Owned",
  "state_locked": "Locked", "lock_region": "Region {region}", "lock_id": "Needs ID {level}", "lock_points": "Need {cost} pt",
  "hint_perk": "Perk", "hint_buy": "Details / Buy", "back": "Back"},
 "branches": {"field_logistics": "Field Logistics", "supply_pay": "Supply & Pay", "crystal_lab": "Crystal Lab", "unit_performance": "Unit Performance"},
 "nodes": {
  "copay_coverage": {"name": "Copay Coverage",
     "desc": "We cover part of your blackout copay. Fainted assets are still assets.",
     "ranks": {"1": "Blackout copay -25%.", "2": "Blackout copay -50%."}},
  "store_discount": {"name": "Store Discount",
     "desc": "Pay less at RT shops. The money comes back to us either way.",
     "ranks": {"1": "3% off at RT shops. Stacks with staff pricing.", "2": "6% off at RT shops.", "3": "10% off at RT shops."}},
  "rt_payout": {"name": "Field Bonus",
     "desc": "A cut on top of trainer prize money. Winning keeps our assets looking pricey.",
     "ranks": {"1": "+10% trainer prize money.", "2": "+20% trainer prize money.", "3": "+30% trainer prize money."}},
  "crystal_grade": {"name": "Crystal Grades",
     "desc": "Lab-grade crystals stocked in RT shops. Your pay grade isn't there yet.",
     "ranks": {"1": "Field Crystals stocked in RT shops.", "2": "Prime Crystals stocked in RT shops.", "3": "Apex Crystals stocked in RT shops."}},
  "unit_training": {"name": "Unit Training",
     "desc": "Your team learns faster. Assets that learn are worth more. To us.",
     "ranks": {"1": "Team training boost I.", "2": "Team training boost II."}},
  # Region 2 perks (data/textbot_requests_region2.md, Oct 23 2026). Amounts match data/rt_benefits.json (placeholders there).
  "asset_logging_bonus": {"name": "Logging Bonus",
     "desc": "Coins for every new kind you log. We're paying for the data, not the walk.",
     "ranks": {"1": "+60 coins per new Kilindex log.", "2": "+120 coins per new Kilindex log."}},
  "hall_hazard_pay": {"name": "Hall Hazard Pay",
     "desc": "More prize money from hall trainers and Masters. Risk is billable.",
     "ranks": {"1": "+25% hall and Master prize money.", "2": "+50% hall and Master prize money."}}},
 "locked": {
  "region": "Locked until Region {region}. Legal says no.",
  "id": "Needs ID level {level}. Keep logging assets.",
  "points": "Not enough points. Cost {cost}, balance {points}.",
  "maxed": "Fully vested. Do not ask for more.",
  "owned_region": "Maxed for now. More ranks in Region {region}."},
 "confirm": "Spend {cost} pt on {node} rank {rank}? No refunds. Company policy.",
 "toast": {
  "bought": "{node} rank {rank} filed. Asset value up. Slightly.",
  "level_up": "ID level {level}. +1 benefit point. Try not to waste it.",
  "not_yet": "{reason}"},
}
S["system_phone"]["menu"]["labels"]["rt_benefits"] = "RT Employee Benefits"

SYSTEM = S

# coverage table aligned to design/MECHANICS_PARITY.md ids (text side only). text: covered | written_now | needs_mechanic | n/a
COVERAGE = [
 # id, system, parity status, text status, where
 ("B1", "Battle scene & turn loop", "Designed", "needs_mechanic", "menu labels proposed in parity (Skills/Pack/Team/Retreat); battle text waits on the engine"),
 ("B5", "Natures (Temperament)", "Missing", "needs_mechanic", "trait mood lines once Story Bot names the 8 traits"),
 ("B7", "Same-type bonus (Affinity)", "Designed", "written_now", "system_skills.affinity_help"),
 ("B11", "Status conditions", "Partial", "needs_mechanic", "status names pending; 'Drowsy' flagged rename in NAME_CHECK.md"),
 ("B12", "PP (energy meter)", "Different", "written_now", "system_skills.energy_low / energy_out"),
 ("B14", "Held items", "Different", "written_now", "system_party give/take/swap/held_help"),
 ("B15", "Switching", "Missing", "written_now", "system_party.out_cold_battle; battle-side switch text waits on engine"),
 ("B16", "Run / flee (Retreat)", "Missing", "written_now", "system_wild retreated/cant_retreat/it_left; system_trainers.no_retreat"),
 ("B18", "Double battles", "Partial", "written_now (pending_gary_call ron_mode)", "system_trainers.ron_co_op_join; no generic two-on-two text (not in DD)"),
 ("B19", "Exp. share (Field Notes)", "Missing", "needs_mechanic", "name flagged rename (trademark) in NAME_CHECK.md"),
 ("B21", "Level-up skills", "Designed", "written_now", "system_skills learned/slots_full/swap_ask/which/swapped/kept/evolution_skill"),
 ("B22", "Teachable skills (Training Reels)", "Designed", "written_now", "system_skills.reel_learned / reel_cant (can't-learn)"),
 ("B23", "Skill relearning (Skill Memory)", "Designed", "written_now", "system_skills memory_* (the move-reminder analogue, free)"),
 ("B24", "Evolution triggers", "Partial", "written_now", "system_evolution start/done/stopped/kilindex/courier_*"),
 ("B27", "Battle-entry variant roll", "Different", "written_now", "system_wild large/small/enraged; system_cosmic"),
 ("B28", "Blackout", "Designed", "written_now", "system_blackout (copay {fee})"),
 ("C1", "Grass encounters", "Partial", "written_now", "system_wild.grass"),
 ("C3", "Cave encounters", "Partial", "written_now", "system_wild.cave; dark caves = field_skills.glowcall"),
 ("C4", "Off-grass ambush (Enraged)", "Designed", "written_now", "system_wild.enraged"),
 ("C6", "Weekday / weekly spawns", "Partial", "covered", "kid_school disabled_until weekday; system_cosmic.meteor_night"),
 ("C7", "Fishing (Angler's Line)", "Missing", "needs_mechanic", "no rod item or fishing spots yet; text after World places spots"),
 ("C8", "Surf encounters", "Designed", "written_now", "system_wild.water (parity 9 #6 note); crossing = field_skills.tideglide"),
 ("C9", "Repel (Hush Spray)", "Designed", "covered", "comfort.hush_spray + system_wild.spray_active/spray_perk"),
 ("C10", "Rare colour variant (Cosmic)", "Different", "written_now", "system_cosmic meet/phone_buzz/caught/kilindex/got_away; system_kilindex.ledger_help"),
 ("C11", "Rustling-patch chains (Lumen Shimmer)", "Missing", "needs_mechanic", "phone ping text once the app exists"),
 ("C13", "Legendaries (Guardian)", "Different", "written_now", "system_blackout.guardian_retry (pending_story_call)"),
 ("C15", "Catch logging", "Missing", "written_now", "system_kilindex.new_entry; catalogue.logged/named"),
 ("C16", "Nickname on catch", "Partial", "covered", "catalogue.nickname_prompt; rename = system_party.rename_*"),
 ("P1", "Party of 6", "Partial", "written_now", "system_heal.team_full"),
 ("P2", "Party / summary screen", "Missing", "written_now", "system_party menu/summary_labels/move_where/new_lead"),
 ("P3", "Storage boxes / PC (Field Archive)", "Partial", "written_now (pending_gary_call phone_vs_pc_storage)", "system_heal.storage_*"),
 ("P4", "Sell / release (Transfer)", "Different", "written_now", "system_heal.transfer_*"),
 ("P5", "Daycare (Wexley's Croft)", "Different", "written_now", "system_croft"),
 ("P6", "Breeding / eggs", "Designed", "written_now (pending_story_call)", "system_croft.egg/egg_moving/hatched; system_party.unregistered"),
 ("P7", "Walking partner (Trail Buddy)", "Different/Built", "covered", "maps lead lines; system_party.new_lead; system_items.hidden_buddy"),
 ("P8", "Friendship (Warmth)", "Different/Partial", "written_now", "system_croft.warmth_board (rater analogue)"),
 ("F1-F6", "Field moves", "Different", "covered", "field_skills.* (Brushbreak, Tideglide, Stonebreak, Glowcall, Skylift)"),
 ("F7", "Waterfall (Tideglide II)", "Missing", "needs_mechanic", "-"),
 ("F8", "Rock climb (Ridgeline)", "Missing", "needs_mechanic", "-"),
 ("F9", "Ice sliding", "Partial", "written_now", "system_field.ice"),
 ("F11", "Ledges", "Built", "written_now", "system_field.ledge_up; route1 trainer tip"),
 ("F12", "Running shoes (Trail Runners)", "Built", "covered", "items.running_shoes; comfort.run_mode"),
 ("F13", "Bike (Courier Bike)", "Built", "covered", "items.bike; system_field.deep_snow"),
 ("F15", "Story gates", "Built", "covered", "blockers"),
 ("F17", "Trainer line of sight", "Missing", "written_now", "system_trainers.spotted / battle_start"),
 ("F18", "Item pickups & hidden items", "Partial", "written_now", "system_items"),
 ("F19", "Signs", "Partial", "covered", "maps.*.sign_*; signs_awaiting_world_id"),
 ("E1", "Shops", "Partial", "written_now", "system_shop (buy/qty/confirm/short/bag_full/sell/cant_sell/new_stock)"),
 ("E2", "Pricing", "Different", "written_now", "system_shop.bye; bulk-buy bonus has no mechanic (mechanics_gap)"),
 ("E3", "Money from battles", "Designed", "written_now", "system_trainers.payout / payout_coin"),
 ("E4", "Bag & pockets", "Designed", "covered", "comfort.bag_pockets/bag_sort; system_items.bag_full"),
 ("E5", "Healing items", "Designed", "written_now (pending_gary_call potions_vs_rest)", "system_party.item_heal variants"),
 ("E6", "Fruit / vitamins (Feed + garden)", "Different", "written_now", "system_garden"),
 ("E7", "Healing centre", "Partial", "written_now", "system_heal choices/taking/machine/returning/rest_go/skip_recal + maps.heal_* greetings"),
 ("E8", "PC", "Different/Partial", "covered", "company_terminal + company_inbox; system_heal.logout"),
 ("E9", "Key items", "Partial", "written_now", "system_items.key_item; system_shop.cant_sell"),
 ("E10", "Employee ID & RT Employee Benefits", "Different", "written_now", "staff_discount, extra_boxes, spray_perk, task_done"),
 ("G1", "Masters / coins", "Different/Partial", "covered", "maps Fernwick Hall etc.; coin text"),
 ("G3", "Rival (Ron)", "Different", "covered + written_now (pending_gary_call ron_mode)", "ron_battle_openers, ron_rival_1; system_trainers.rival_ron variants"),
 ("G4", "Trainer rematches", "Different", "written_now", "system_trainers.contact_*/rematch_ask; system_phone.ping/rematch_text"),
 ("G11", "Trainer intros / losses", "Partial", "covered + written_now", "per-trainer pages/battle_lost/after; system_trainers.spotted/payout"),
 ("G13", "Player character choice", "Partial", "covered (neutral)", "all text uses 'you'/{player}; pending_gary_call player_gender recorded"),
 ("M1", "Creature index (Kilindex)", "Different", "written_now", "system_kilindex labels/rating_intro/rating tiers"),
 ("M2", "Index rewards", "Different", "written_now", "system_kilindex.jingle_25/milestone; system_heal.transfer_goal"),
 ("M3", "Trading", "Different", "written_now", "system_trade; system_evolution.courier_*; system_party.rename_traded"),
 ("M5", "Day / night clock", "Built", "written_now", "system_phone.clock / clock_by_phase"),
 ("M8", "Phone apps", "Different", "written_now", "system_phone.menu/ping/no_signal/task_done"),
 ("M9", "Save", "Built", "written_now", "system_save"),
 ("M10", "Options", "Partial", "covered", "comfort.text_speed / hotkeys"),
 ("M14", "Tutorial", "Different", "covered", "SP 8.1 lines in maps/company_inbox; save framing in system_save"),
]

MECHANICS_GAP = [
 {"category": "Battle engine (all battle-side text: menus, damage, status, faint, switching)", "parity": "B1-B3, B11, B15", "needs": "battle engine on hooks.onBattle", "owner": "Coder", "text_after": "status lines once Story Bot fixes the list"},
 {"category": "Double battles (generic)", "parity": "B18", "needs": "two-on-two only exists as Ron co-op (ron_mode call). No generic double-battle trainers in DD", "owner": "Gary -> Story Bot -> Coder"},
 {"category": "Fishing", "parity": "C7", "needs": "rod key item + marked fishing spots + bite timing", "owner": "World Design (spots), Coder"},
 {"category": "Bulk-buy bonus", "parity": "E1/E2", "needs": "no free-extra-on-bulk rule in DD; RT Employee Benefits discount covers the 'reward for buying'", "owner": "Story Bot (decide), Coder"},
 {"category": "Rustling-patch chains", "parity": "C11", "needs": "Lumen Shimmer phone app + chain counter", "owner": "Coder"},
 {"category": "Waterfall / rock-climb analogues", "parity": "F7, F8", "needs": "Tideglide II current tiles, Ridgeline pegs", "owner": "Story Bot, World Design"},
 {"category": "Exp. share analogue", "parity": "B19", "needs": "bench-XP key item (name needs a rename, see NAME_CHECK.md)", "owner": "Coder"},
 {"category": "Natures analogue", "parity": "B5", "needs": "Temperament trait list", "owner": "Story Bot -> Coder"},
 {"category": "Weekday clock", "parity": "C6, M6", "needs": "1.4 weekday in clock.js + 'weekday' case in lines.js whenMatches", "owner": "Coder"},
 {"category": "Ice sliding", "parity": "F9", "needs": "Col.ICE slide-until-blocked in GridMover", "owner": "Coder"},
 {"category": "Trainer sight + walk-up", "parity": "F17", "needs": "numeric sight field + spark/hop/walk", "owner": "Coder, World Design"},
 {"category": "Item pickup runtime", "parity": "F18, E4", "needs": "bag + pocket routing + hidden sparkle", "owner": "Coder"},
 {"category": "Shop, storage, team, Kilindex, phone UIs", "parity": "E1, P2, P3, M1, M8", "needs": "UI screens that call system_* text", "owner": "Coder"},
 {"category": "Daycare, eggs, trades, garden, courier evolution", "parity": "P5, P6, M3, E6, B24", "needs": "Croft map (sunmeadow_croft/croft_int proposed), egg ruling, trader placement, garden plots", "owner": "World Design, Story Bot, Coder"},
 {"category": "Manual save", "parity": "M9", "needs": "save.js is autosave-only; system_save.prompt/replace need a manual save action (or drop them and keep toast/failed/from_backup)", "owner": "Coder"},
]

# =====================================================================================
# ---------- REGIONS 5-6 TEXT PASS (package F, REGIONS_5_6_PLAN.md; Text Bot Oct 29 2026 ~1:40 PM CT). ALL DRAFT, pending Gary. ----------
# =====================================================================================
_D = {"parity": "M1", "build": "different", "status": "DRAFT"}
_KIL_R56 = {   # live: species already in data/creatures_synced.json (Coast Road + Tidewater Coast)
 "parasoleaf": "Opens its broad leaf when rain starts. Little creatures crowd under it.",
 "drenchcrab": "Comes out by the hundred when it rains. The road goes clickety for days.",
 "reefshell": "Swims the reef with little fish riding its shell. It never says no.",
 "cliffpuff": "Plunges off sea cliffs and comes up with a beakful of fish. Every time.",
 "raywing": "Leaps out of the water and glides a little way, just to see the sky.",
 "lurelamp": "Rises at night and lights whole patches of sea. Fish follow it home.",
 "bristlereef": "Spreads its spines wide to guard the reef. Small fish hide behind it.",
 "wavelin": "Rides the bow wave of every boat. Sailors call it good luck.",
 "breakerfin": "Leaps through breaking waves in perfect arcs. It scores itself.",
 "spinyclaw": "Clicks its antennae to chat with friends across the rock pools.",
 "nudiblume": "Looks like a flower, sways like a flower. Bees are always confused.",
 "barnaclump": "Sticks to ship hulls for free rides. It has seen every harbour.",
 "foamkin": "Pops into being on the crest of a wave. Gone again by the next one.",
 "kelpstrider": "Gallops across the waves on dim nights. Leaves no hoofprints.",
 "hullwhale": "Its songs cross the whole sea. Somewhere, another one sings back.",
 "tidepony": "Wraps its tail round the kelp and holds on through the strongest pull.",
 "pearlisk": "The pearl on its brow shows a different dream every night.",
 "bleachghast": "Drifts over pale reefs, hoping to bring their colours back.",
 "squidge": "Squirts water at anything that startles it. Then hides, embarrassed.",
}
_KIL_R56["shorehound"] = "Patrols the tide line every morning. Brings back whatever washed up."
for _sid, _b in _KIL_R56.items(): S["system_kilindex"]["entries"][_sid] = {"blurb": _b, **_D}
# ---- Jestrix line (#274, #479-482; data/textbot_requests_jestrix.md, dev/jestrix-line). Dark/Devil, Sunmeadow. Text Bot Oct 29 2026 ~2:50 PM CT. DRAFT, pending sync. ----
_KIL_JESTRIX = {
 "jestrix": "Rings its ear bell before every prank. Laughs loudest when it gets caught.",
 "japkit": "Juggles acorns, pebbles, anything. Drops the lot, except what it loves.",
 "harlequop": "Deals cards with a wink. Somehow the little ones always win the hand.",
 "mummerhop": "Twirls ribbons mid-battle. Every fight turns into a show, with encores.",
 "maestrix": "One ring of its bell and the meadow goes hush. It bows to friend and foe.",
}
# Jestrix line is live: Coder synced the five ids into data/creatures_synced.json (Oct 29 2026, ~2:48 PM CT).
for _sid, _b in _KIL_JESTRIX.items(): S["system_kilindex"]["entries"][_sid] = {"blurb": _b, **_D}  # live: synced into data/creatures_synced.json Oct 29 2026
# pending: DEX_450 species not yet in data/creatures_synced.json (Character Bot art + tools/sync_creatures.mjs first). Move live once synced.
S["system_kilindex"]["entries"]["_pending_r5_r6"] = {
 "helioseed": "Turns its face to follow the sun all day. Sulks a bit at night.",
 "heliobloom": "Shares its seeds with every bird in the meadow. Birds adore it.",
 "sunquail": "Runs through tall grass in a neat line with its family. Nobody skips.",
 "sunspeckle": "Counts its spots every morning, just to be sure none went missing.",
 "lopecalf": "Follows anything that walks steadily. Farmers have to walk fast.",
 "plainhorn": "Grazes the uplands in big slow herds. Never in a hurry.",
 "stampedor": "When a herd of them runs, the ground drums for miles around.",
 "popgopher": "Pops up to say hello and is gone before you can answer.",
 "thermalark": "Sings higher than any other bird. Never lands mid-song.",
 "sicklet": "Bows politely before every battle. Then fights very hard.",
 "reapmantis": "Trims the meadow grass in neat patterns. Farmers leave it be.",
 "basklet": "Basks in the sun so long that its scales start to glow.",
 "sunbasilisk": "Spreads its frill to soak up heat by day, then glows all night.",
 "dialmoss": "Always knows the hour, even on cloudy days. Never late.",
 "dewbell": "Rings softly at dawn. Shares a sip of dew with tired travellers.",
 "jestrix": "Plays harmless tricks and laughs loudest when it gets caught.",
 "aurelmare": "Gallops across the uplands at sunrise. Its mane trails light.",
 "glisterdew": "Catches bugs on its sticky leaves, has a little chat, lets them go.",
 "pollenub": "Sneezes clouds of pollen whenever it laughs. It laughs a lot.",
 "fenflick": "Blinks on and off across the bog at night. Count them if you can.",
 "bogbeacon": "Leads travellers in circles until they laugh, then shows the way.",
 "peatfrog": "Croaks in chorus with a thousand others. It always starts.",
 "peatbellow": "Its croak rattles windows in the next town. It's very proud.",
 "reedcrane": "Dances in the dusk with its partner every spring.",
 "bogsnout": "Floats like a log and giggles when someone finds it.",
 "mirejaw": "Waits in the reed beds, patient as the bog itself.",
 "fenmaw": "Rules the deep pools. Even a grumpy Mirewump moves aside.",
 "skimnymph": "Skims the water in short hops. Never gets its feet wet.",
 "bogdart": "Darts over the bog faster than the eye can follow.",
 "turfhulk": "Sinks into the bog to sleep and rises again with the dusk.",
 "murkgleam": "Rolls over the boardwalks and hides them, just for fun.",
 "pitchergulp": "Slurps up rainwater and burps bubbles. No manners at all.",
 "bulrusher": "Builds reed houses and lets anyone who needs one move in.",
 "mirewump": "Lazy, grumpy, and very sure the whole bog belongs to it.",
 "runeskein": "When it is hurt, it unravels, then quietly weaves itself back.",
 "mireglim": "Hides in hollow logs and giggles at anyone walking past.",
 "gloommire": "Brings the dark in at dusk and carries it off again at dawn.",
 "glimmoth": "Only flies when the dusk is thick. Its wings glow faintly.",
 "kneeroot": "Sticks up out of the water and pretends to be a stump. Badly.",
 "cypresshade": "Shades the bog on hot days. Everything rests under it.",
 "silteel": "Wriggles under the boardwalks and tickles bare feet.",
 "duckmoss": "Paddles the bog, mistaken for a floating patch of green.",
 "mudwhisk": "Knows every hidden pool in the bog. Tells nobody.",
 "sprinkit": "Shakes the rain off all over its friends. On purpose.",
 "downpaw": "Runs along flooded roads, splashing as hard as it can.",
 "deluvane": "Walks ahead of the storms. Farmers cheer for it in dry years.",
 "petrelet": "Patters across puddles as if it could walk on water.",
 "galepetrel": "Flies into storms, never away from them.",
 "slurrymole": "Digs tunnels that fill with rain for others to swim in.",
 "brinehopper": "Hops along the flood line after a storm, seeing what's new.",
 "surfskipper": "Skips over the waves like a flat stone. Never sinks.",
 "driftknot": "Washes ashore after each storm, somewhere new every time.",
 "reefhatch": "Races to the sea under the moon the night it hatches.",
 "atollback": "Sailors once mistook a sleeping one for an island. It didn't mind.",
 "puffling": "Waddles to the cliff edge and has a good long think.",
 "mantlet": "Flaps along the sea floor, stirring up little clouds of sand.",
 "abyssray": "Glides over the deep reef like the shadow of a cloud.",
 "anglet": "Small, hungry, and very proud of its little lure.",
 "spinurch": "Rolls slowly over the reef, nibbling algae as it goes.",
 "sandpup": "Digs a hole in the beach, lies in it, and naps till high tide.",
 "divegannet": "Drops like an arrow from great heights. Barely a splash.",
 "shellsinger": "Sings with the tide, and the sea sings back.",
}

# ---- RT Employee Benefits: region 5 (ID cap 14) and region 6 (ID cap 16) nodes. Ids PROPOSED: Coder adds them to data/rt_benefits.json ----
S["system_rt_benefits"]["nodes"].update({
 "storm_allowance": {"name": "Storm Allowance", "desc": "Extra pay for field work in storm season. Wet assets still count.",
   "ranks": {"1": "+15% prize money during storm season.", "2": "+30% prize money during storm season."}},
 "research_clearance": {"name": "Research Access", "desc": "Unlocks one RT research site per region. Rare assets inside. Sign here.",
   "ranks": {"1": "Region 5 key card: Mirefen research station.", "2": "Region 6 key card: Tidewater sea cave lab."}},
 "salvage_rights": {"name": "Salvage Rights", "desc": "Hidden items on the coast pay a finder's fee. The finder is us.",
   "ranks": {"1": "+50 coins for each hidden item found.", "2": "+100 coins for each hidden item found."}},
})
S["system_rt_benefits"]["locked"]["keycard"] = "Needs a research key card. Ask the board, not me."
S["system_rt_benefits"]["toast"]["cap_raised"] = "Region {region} open. ID cap now {level}. Back to work."

# ---- RT research key cards + research areas (plan section 5; design/RT_KEYCARD_SPEC.md not written yet). Flags rt_keycard_r5 / rt_keycard_r6 ----
_E = {"parity": "E10", "build": "partial", "status": "DRAFT"}
S["system_research"] = {
 "_section": "RT research key cards and research-only areas, regions 5-6 (REGIONS_5_6_PLAN.md section 5). Text Bot DRAFT Oct 29 2026; map spots, item ids and flags pending World Design / Coder (RT_KEYCARD_SPEC.md). Keys are proposals.",
 "keycard_r5_name": {"pages": ["Station M Key Card"], **_E},
 "keycard_r5_desc": {"pages": ["RT key card. Opens Mirefen Peat Station, under the bog.", "Do not bend. Do not lose. It is billed."], **_E},
 "keycard_r6_name": {"pages": ["Station T Key Card"], **_E},
 "keycard_r6_desc": {"pages": ["RT key card. Opens the Tidewater Signal Lab in the sea cave.", "Salt-proof, it says. Nobody tested that."], **_E},
 "keycard_get": {"pages": ["You got the {item}!", "A little light on it blinks green. It knows who you are."], **_E},
 "door_locked": {"pages": ["A heavy RT door. The card reader blinks red.", "STAFF WITH RESEARCH ACCESS ONLY."], **_E},
 "door_open": {"pages": ["The reader blinks green. The door hisses open.", "Cold air. Old paper. Something moves inside."], **_E},
 "door_locked_ron": {"pages": ["Ron squints at the reader.", "'They gave us IDs, not keys. Classic.'"], **_E},
 "r5_entry_sign": {"pages": ["RT MIREFEN PEAT STATION\nLumen yield survey. Wipe your feet.", "Research-only creatures inside. Logs required."], **_E},
 "r5_log_1": {"pages": ["A swollen notebook. 'Day 40. Bog lights again.", "They walk us in circles, then laugh. Bogbeacon.'"], **_E},
 "r5_log_2": {"pages": ["A clipboard. 'Herd ran overhead all night.", "The tanks rattled. Stampedor. Writing that down.'"], **_E},
 "r5_log_3": {"pages": ["A note taped to a tank: 'DO NOT knock on glass.", "The Fenmaw doesn't like it. Neither do I.'"], **_E},
 "r5_log_4": {"pages": ["The last page is water-stained.", "'Lights off at dusk. Gloommire likes the dark.'"], **_E},
 "r6_entry_sign": {"pages": ["RT TIDEWATER SIGNAL LAB\nOpen at low tide only.", "Research-only creatures inside. Logs required."], **_E},
 "r6_log_1": {"pages": ["A pinned chart. 'A shadow on the reef again.", "Not a cloud. Abyssray. It glides right under us.'"], **_E},
 "r6_log_2": {"pages": ["A logbook. 'Lights in the pools at night.", "Lurelamps, dozens. Like the sea is breathing.'"], **_E},
 "r6_log_3": {"pages": ["A sticky note: 'Pearlisk showed me a dream.", "My old house. I didn't know I missed it.'"], **_E},
 "r6_log_4": {"pages": ["Scrawled on the wall: 'THE ISLAND MOVED.'", "Under it, smaller: 'Atollback. Sorry. Noted.'"], **_E},
 "research_wild_hint": {"pages": ["These creatures live nowhere else.", "They're tougher, and harder to catch. Take your time."], **_E},
 "promo_r5_offer": {"pages": ["Promotion review: log three research-only kinds", "at Mirefen Peat Station. Then report to the outpost."], **_E, "pending_story_call": True},
 "promo_r5_done": {"pages": ["Promotion filed. New title: Wetland Field Lead.", "Your desk is still a bog. Well done, we suppose."], **_E, "pending_story_call": True},
 "promo_r6_offer": {"pages": ["Promotion review: log three research-only kinds", "at the Tidewater Signal Lab. Then report in."], **_E, "pending_story_call": True},
 "promo_r6_done": {"pages": ["Promotion filed. Title: Coastal Operations Lead.", "The title comes with a towel. Not a pay rise."], **_E, "pending_story_call": True},
 "storm_season_start": {"pages": ["STORM SEASON\nThe sky over the coast goes dark.", "Roads near the sea may flood. Some won't drain."], **_E},
}

# ---- RITA region 5-6 milestone keys (4 versions each; region = first region the line can fire). Coder: add the triggers in company_voice.js ----
_RITA_R56 = {
 ("storm_season_start", 5): [
  ["{employee_id}: storm season has begun.", "Assets get wet. Wet assets still count. Keep logging."],
  ["Storm alert, {employee_id}. Field work continues.", "The weather has not been approved, but it's here."],
  ["{employee_id}: flood risk high. Asset value: dry, for now.", "Stay out of ditches. Ditches lower resale."],
  ["Storm season, {employee_id}. Water rising, so is output.", "That second part is your job."]],
 ("skill_tideglide", 5): [
  ["{employee_id}: field skill Tideglide registered.", "Your assets now double as boats. Efficient."],
  ["Tideglide logged, {employee_id}. Water is now a road.", "Roads are where assets get found. Go."],
  ["{employee_id}: you can cross water now.", "Fewer excuses. More logs. That's the deal."],
  ["Tideglide on file, {employee_id}.", "One asset, two uses. The board loves a two-for-one."]],
 ("id_cap_region_5", 5): [
  ["{employee_id}: region 5 open. ID cap raised to 14.", "More levels, more points. Not more pay."],
  ["ID cap 14 approved, {employee_id}.", "Your number may now be worth slightly more."],
  ["{employee_id}: new ceiling, ID 14.", "Ceilings exist so we can raise them. Later."],
  ["Region 5 clearance, {employee_id}. Cap now 14.", "Invest the points. We'll take the returns."]],
 ("id_cap_region_6", 6): [
  ["{employee_id}: region 6 open. ID cap raised to 16.", "The coast is a growth market. Grow."],
  ["ID cap 16 approved, {employee_id}.", "Your asset value is now legally allowed to rise."],
  ["{employee_id}: new ceiling, ID 16.", "Please don't hit your head on it. Hit the target."],
  ["Region 6 clearance, {employee_id}. Cap now 16.", "Same job, saltier air. Keep logging."]],
 ("keycard_r5", 5): [
  ["{employee_id}: Mirefen Key Card issued.", "Research access granted. Card is company property."],
  ["Key card on file, {employee_id}. Station M is open.", "Rare assets inside. Rare means valuable. Go."],
  ["{employee_id}: you hold a research key card.", "Lose it and the replacement fee is educational."],
  ["Mirefen access approved, {employee_id}.", "Bring back data. Leave the bog where it is."]],
 ("keycard_r6", 6): [
  ["{employee_id}: Tidewater Key Card issued.", "The cave lab is open at low tide. Plan around it."],
  ["Key card two on file, {employee_id}.", "Two cards, two labs. Strong portfolio."],
  ["{employee_id}: research access, coast division.", "Rare sea assets inside. Value: considerable."],
  ["Tidewater access approved, {employee_id}.", "Return the card dry. It says salt-proof. Test nothing."]],
 ("research_area_r5", 5): [
  ["{employee_id}: entered Mirefen Peat Station.", "Research-only assets nearby. Tag them all."],
  ["Peat Station logged, {employee_id}. It's damp.", "The assets don't mind. Neither do we."],
  ["{employee_id}: research site entered.", "Hard to catch, high value. That's what we pay for."],
  ["Mirefen research zone, {employee_id}.", "The old team's notes are company property too."]],
 ("research_area_r6", 6): [
  ["{employee_id}: entered the Tidewater Signal Lab.", "Research-only assets nearby. Mind the tide."],
  ["Cave lab logged, {employee_id}.", "High tide seals the doors. Overtime is unpaid."],
  ["{employee_id}: research site entered, coast division.", "Rare stock, rare value. Fill the logs."],
  ["Tidewater research zone, {employee_id}.", "Everything in here is worth more than the cave."]],
 ("research_catch_first", 5): [
  ["{employee_id}: research-only asset secured.", "Book value: high. Your share: an approving beep."],
  ["Rare asset logged, {employee_id}.", "It lives nowhere else. Now it lives in our records."],
  ["{employee_id}: research stock acquired.", "The portfolio just got exclusive."],
  ["Research catch filed, {employee_id}.", "Limited editions appreciate. So do our margins."]],
 ("area_new_mirefen", 5): [
  ["{employee_id}: Mirefen logged. Town on stilts.", "Property values: wobbly. Asset values: fine."],
  ["Mirefen added, {employee_id}. Boardwalks, mostly.", "Don't drop anything. Especially the crystals."],
  ["{employee_id}: new area, Mirefen.", "Swamp stock is underpriced. Fix that."],
  ["Mirefen on the map, {employee_id}.", "The frogs are loud. The returns should be louder."]],
 ("area_new_route_coast", 6): [
  ["{employee_id}: Coast Road logged.", "Half road, half sea. Both full of assets."],
  ["Coast Road added, {employee_id}. It floods.", "Floods move assets right to your feet. Handy."],
  ["{employee_id}: new area, Coast Road.", "Seawall, jetty, rain. Log the lot."],
  ["Coast Road on the map, {employee_id}.", "Mind the tide. Drowned staff log nothing."]],
 ("promotion_r5", 5): [
  ["{employee_id}: promoted. Wetland Field Lead.", "Same pay. Bigger title. Industry standard."],
  ["Promotion approved, {employee_id}.", "Your asset value just got a fancier label."],
  ["{employee_id}: Field Lead now. Of wetland.", "Lead by example. The example is logging."],
  ["Wetland Field Lead on file, {employee_id}.", "Higher rank, higher targets. You'll love it."]],
 ("promotion_r6", 6): [
  ["{employee_id}: promoted. Coastal Operations Lead.", "The view is lovely. The targets are lovelier."],
  ["Promotion approved, {employee_id}. Coastal division.", "Your number now outranks some other numbers."],
  ["{employee_id}: Operations Lead. Two titles now.", "Neither one comes with a raise. Focus."],
  ["Coastal Operations Lead on file, {employee_id}.", "Assets under management: growing. Keep it so."]],
}
for (_k, _r), _vs in _RITA_R56.items():
    for _i, _p in enumerate(_vs):
        S["system_company_voice"][_k + ("" if _i == 0 else f"_{_i + 1}")] = {"pages": _p, "parity": "E10", "build": "partial", "region": _r, "status": "DRAFT"}

# Text Bot r78 (Oct 29 2026, data/textbot_requests_r78.md on dev/regions-5-8). DRAFT.
_RITA_R78 = {
 ("id_cap_r7", 7): [
  ["{employee_id}: ID level capped for this region.", "Win coin 7 to unlock further growth."],
  ["Cap reached, {employee_id}. Lanternport's Master", "holds the paperwork for your next level."],
  ["{employee_id}, you've hit the ceiling. Again.", "Coin 7 raises it. Head Office loves a raise."],
  ["Growth paused, {employee_id}. Not a demotion.", "Just a very long coffee break. Win coin 7."]],
 ("id_cap_r8", 8): [
  ["{employee_id}: ID level capped for this region.", "Win coin 8 to unlock further growth."],
  ["Cap reached, {employee_id}. The Cindervale", "Master signs off on the next step."],
  ["{employee_id}, the ladder ends here for now.", "Coin 8 adds rungs. Hot ones, probably."],
  ["Growth paused, {employee_id}. Foundry rules.", "Nothing leaves until it's been tested."]],
 ("promoted_id18", 7): [
  ["Promotion! {employee_id} is now ID 18.", "Lighthouse signal store access approved."],
  ["{employee_id}: ID 18 confirmed. Well done,", "said with full corporate sincerity."],
  ["ID 18, {employee_id}. New key card on the board.", "Please don't lose it in the sea."],
  ["{employee_id} promoted to ID 18. A new door", "awaits. Probably a damp one."]],
 ("promoted_id20", 8): [
  ["Promotion! {employee_id} is now ID 20.", "Foundry lab access approved."],
  ["{employee_id}: ID 20 confirmed. That's senior.", "Act like it, at least near cameras."],
  ["ID 20, {employee_id}. New key card on the", "Benefits board. Mind the hot surfaces."],
  ["{employee_id} promoted to ID 20. Head Office", "sends its warmest regards. Very warm."]],
 ("rt_keycard_r7", 7): [
  ["{employee_id}: Lanternport key card issued.", "The signal store is yours to inventory."],
  ["Key card logged, {employee_id}. Lighthouse", "signal store. Count every flare twice."],
  ["{employee_id}, signal store access granted.", "Whatever's blinking in there, log it."],
  ["Key card active, {employee_id}. Salt damage", "to company property comes out of wages."]],
 ("rt_keycard_r8", 8): [
  ["{employee_id}: Cindervale key card issued.", "The foundry lab is open to you."],
  ["Key card logged, {employee_id}. Foundry lab.", "Gloves recommended. Eyebrows optional."],
  ["{employee_id}, foundry lab access granted.", "Please return all samples un-melted."],
  ["Key card active, {employee_id}. The lab's", "research is company property. So are you."]],
}
for (_k, _r), _vs in _RITA_R78.items():
    for _i, _p in enumerate(_vs):
        S["system_company_voice"][_k + ("" if _i == 0 else f"_{_i + 1}")] = {"pages": _p, "parity": "E10", "build": "partial", "region": _r, "status": "DRAFT"}

S["system_story_r78"] = {"_section": "Regions 7-8 story bits (src/region78/index.js reads system_story_r78.<key>). DRAFT, r78 request.",
 "r7_ron_page_handoff": {"pages": ["Ron: Remember the page I wouldn't show you? It's dry now. Here.",
                                   "A page from an old company field log. Someone drew the river up the mountain.",
                                   "Ron: I don't know what it means yet. But I'm not scared of it anymore."],
                         "speaker": "Ron", "region": 7, "mood": "major key", "status": "DRAFT", "parity": "F15", "build": "partial"},
 "r7_ron_flies": {"pages": ["Ron: The bags out back? The flies have names now.", "Don't ask me their names, {nick}."],
                  "speaker": "Ron", "region": 7, "status": "DRAFT", "note": "moved from Tidewater (G3)", "parity": "F15", "build": "partial"},
 "r7_node_name": {"pages": ["Research Access: Lighthouse"], "region": 7, "status": "DRAFT", "parity": "F15", "build": "partial"},
 "r7_node_desc": {"pages": ["Key card for the lighthouse signal store.", "Flares, lenses and one very old radio."], "region": 7, "status": "DRAFT", "parity": "F15", "build": "partial"},
 "r8_node_name": {"pages": ["Research Access: Foundry Lab"], "region": 8, "status": "DRAFT", "parity": "F15", "build": "partial"},
 "r8_node_desc": {"pages": ["Key card for the Cindervale foundry lab.", "Mind the kilns. They mind you back."], "region": 8, "status": "DRAFT", "parity": "F15", "build": "partial"},
 "field_reading_sheet_name": {"pages": ["Field Reading Sheet"], "region": 7, "status": "DRAFT", "parity": "F15", "build": "partial"},
 "field_reading_sheet_desc": {"pages": ["A field team's reading sheet, from Ron.", "\"Drift: bonded, stable. Not a fault.\""], "region": 7, "status": "DRAFT", "parity": "F15", "build": "partial"}
}

# =====================================================================================
# ---------- REGIONS 5-6 STORY LINES (Story Bot handoff design/story_r5_r6/HANDOFF_TEXTBOT.md, 27 groups). Text Bot Oct 29 2026 ~1:50 PM CT. ALL DRAFT. ----------
# Most of these spots are not on a map yet (route1_east, sunmeadow_croft, station_mirefen, lab_tidewater, RT outpost/desk, storm variants).
# They live here until World places the spots; then Text Bot moves them to maps.<map>.<id>. 'gate' is plain text for Coder (no flag check).
# '_held' entries wait on a Gary ruling (OPEN_QUESTIONS.md); the validator skips them, Text Bot checked the 2x40 fit by hand.
# =====================================================================================
def _st(group, speaker, pages, parity="F15", **kw):
    d = {"pages": pages, "parity": parity, "build": "partial", "status": "DRAFT", "group": group, "speaker": speaker}; d.update(kw); return d
S["system_story_r56"] = {
 "_section": "Regions 5-6 story lines from Story Bot's handoff (27 groups). Keys g<NN>_<what>. Pending map spots from World Design; flags in 'gate' are proposals unless already known. DRAFT pending Gary.",
 # 1 ridge sign
 "g01_ridge_sign": _st(1, "sign", ["RT SURVEY RIDGE\nDO NOT CHIP THE CRYSTAL.", "Underneath, in pencil: 'Too late.' Then: 'Sorry.'"]),
 "g01_ridge_graffiti": _st(1, "inspect", ["Someone has drawn a little face on the rock.", "It's smiling. The rock, less so."]),
 # 2 survey researcher + new trainers
 "g02_researcher_1": _st(2, "Field Researcher", ["Same readings the office already has. I take them anyway.", "The numbers come out the same. Just a bit lower."]),
 "g02_researcher_2": _st(2, "Field Researcher", ["Lower every season since the wall went up.", "Ridge used to glow at night. Now it sort of... hums."]),
 "g02_researcher_3": _st(2, "Field Researcher", ["I write it down. Somebody files it. Nobody writes back.", "Still. Someone ought to notice. May as well be me."]),
 "g02_researcher_4": _st(2, "Field Researcher", ["Your lead keeps looking at the rocks.", "Mine does too. I've stopped asking it why."]),
 "g02_trainer_a_intro": _st(2, "Ridge Climber", ["Ridgeskinks won't move for anyone. I respect that.", "I won't move for you either. Battle?"]),
 "g02_trainer_a_lost": _st(2, "Ridge Climber", ["Moved. Fine. You earned it."]),
 "g02_trainer_a_after": _st(2, "Ridge Climber", ["Spinemonitor up the nook walks the same loop daily.", "Step in its way and it rushes you. Walk round."]),
 "g02_trainer_b_intro": _st(2, "Surveyor", ["Hold that stake straight while we battle, would you?"]),
 "g02_trainer_b_lost": _st(2, "Surveyor", ["The stake's crooked now. Like my team."]),
 "g02_trainer_b_after": _st(2, "Surveyor", ["Ten years I've measured this ridge.", "First year I've measured it going down."]),
 # 3 pillars after dim (E1 solved)
 "g03_pillars_hum": _st(3, "system", ["The dim pillars hum, all five notes at once, very faint.", "Then nothing. {lead} looks back at them for a while."], gate="beat_master_frostspire + E1 solved; first pass only"),
 # 5 Nan
 "g05_nan_1": _st(5, "Nan Wexley", ["You'll be the one from the company. You've got the walk.", "Gate's broken, Tumbloams are out. Sit down after."]),
 "g05_nan_2": _st(5, "Nan Wexley", ["Flowers came back the week the wall went dim.", "Took me a month to believe it. Still counting them."]),
 "g05_nan_3": _st(5, "Nan Wexley", ["The shine got brighter every season. More fitted, I say.", "That's my opinion. I'm old. I'm allowed them."]),
 "g05_nan_4": _st(5, "Nan Wexley", ["Wild one hurt my littlest Tumbloam last spring.", "Wild is hard. That doesn't make the shine kind."]),
 "g05_nan_5": _st(5, "Nan Wexley", ["Three back in the pen. You're quicker than you look.", "Soup's on the stove. Take a bowl for the walk."], gate="sq_shine herd done"),
 # 6 Ron sighting (no battle)
 "g06_ron_1": _st(6, "Ron", ["{nick}! Fancy. I'm on a break. A long one.", "Nan says I can stay if I fix the gate. I can't fix gates."]),
 "g06_ron_2": _st(6, "Ron", ["How many coins now? Five?", "...Cool. Cool cool cool. That's great. Really."]),
 "g06_ron_3": _st(6, "Ron", ["I'm heading down the coast. There's a job going.", "Proper one. Boats. Probably boats. I'll find out."]),
 "g06_ron_4": _st(6, "Ron", ["Don't look at me like that. I'm between things.", "Things are just far apart right now."]),
 "g06_nan_on_ron": _st(6, "Nan Wexley", ["Useless with a hammer, that one.", "Come back when you're not busy, I told him. He will."]),
 # 7 Mirefen townsfolk
 "g07_painted_owner": _st(7, "villager", ["Like the crystal? My aunt in Fernwick does the paint.", "Don't tell the outpost. They'd want it in grey."]),
 "g07_painted_owner_2": _st(7, "villager", ["Underneath it's the same crystal as yours.", "On top, it's a bit of Fernwick. Suits him."]),
 "g07_kid_1": _st(7, "kid", ["Race you to the end of the boardwalk! No shoes!", "...You've got shoes. That's cheating."]),
 "g07_kid_2": _st(7, "kid", ["I know every frog on this street by its croak.", "That one's Big Doug. He's a liar."]),
 "g07_sandbagger_1": _st(7, "villager", ["Storm season soon. Bags go by the doors, low side first.", "We lose a porch most years. Never a person."], gate="before storm_season"),
 "g07_sandbagger_2": _st(7, "villager", ["Mind the stack. Took me all morning.", "My Turfhulk did the heavy ones. Then sat on them."], gate="before storm_season"),
 "g07_scholar": _st(7, "Scholar Dilys", ["Bog lights again last night. Seven, in a ring.", "Folk say they're lost souls. I say they're Fenflicks. Mostly."]),
 # 8 lunch tin
 "g08_lunch_tin": _st(8, "inspect", ["A dented lunch tin. Scratched on the lid: 7/10.", "Somebody liked that lunch. Not loved it. Liked it."]),
 # 9 storm sequence
 "g09_wenna_stops": _st(9, "Wenna Peat", ["Take it, then. Reed Coin. You've earned...", "Hold on. Smell that? That's the sea coming in."], gate="right after beat_master_mirefen"),
 "g09_town_nets": _st(9, "villager", ["Nets in! Boats tied! You, coin-holder, grab a bag!", "No, we're not scared. We're busy. Different thing."]),
 "g09_town_kids": _st(9, "villager", ["Kids, home. Now. Yes, you can watch from the window."]),
 "g09_town_old": _st(9, "villager", ["Fifty storms I've seen from this porch.", "Every one, I still tie the boat twice."]),
 "g09_frogs_quiet": _st(9, "system", ["The frogs have stopped croaking.", "All of them. At once."]),
 "g09_first_lightning": _st(9, "system", ["Lightning over the sea. Then the rain comes.", "Storm season has begun."], gate="sets storm_season"),
 "g09_wenna_jetty": _st(9, "Wenna Peat", ["Your water one's itching to go. Let it.", "I'll walk with you till the boards run out. Then it's you two."], gate="after_storm, Tideglide lesson"),
 "g09_wenna_jetty_2": _st(9, "Wenna Peat", ["Boards end here. Go on. It knows the water.", "...That'll do. That'll more than do."]),
 # 10 storm memo
 "g10_storm_memo": _st(10, "Facilities", ["ALL STAFF: Storm season has begun. Field staff, report in daily.", "Missed check-ins will be followed up. - Facilities"], parity="E10", subject="Storm season reminder", sender="Facilities", note="company_inbox email; unsigned, NOT Vane. Q12 wording check pending Gary."),
 # 11 Mirefen Peat Station inspects
 "g11_plaque": _st(11, "inspect", ["REVIVAL TECH MIREFEN PEAT STATION", "Lumen yield survey. The year's under the moss."], note="year left off per Q13"),
 "g11_closing_notice": _st(11, "inspect", ["STATION CLOSED. STAFF REASSIGNED.", "Instruction from Head Office. That's all it says."]),
 "g11_shoe_sign": _st(11, "inspect", ["SHOES OFF ON THE CLEAN FLOOR.", "There is mud up to the sign. Nobody's been clean in years."]),
 "g11_clock": _st(11, "inspect", ["A wall clock, stopped. The hands still point at the same time.", "The second hand twitches once. Then doesn't."]),
 "g11_jars": _st(11, "inspect", ["Rows of jars of peat. Each one glows a little.", "'Core 14. Depth 3 m. Colour: amber.' The next is violet."]),
 "g11_jars_bogbeacon": _st(11, "inspect", ["A Bogbeacon is curled on the warmest jar.", "It blinks at you and doesn't move. Its jar now."]),
 "g11_visitor_book": _st(11, "inspect", ["The visitor book. Last page, one day, four hands.", "T.B., a list. P.A., a frog. M.Q., 'Lunch: none, 2/10.'"], gate="sets found_station_r5"),
 "g11_visitor_book_2": _st(11, "inspect", ["The fourth, I.S., wrote no words.", "Just five dots and a gap. Like a tune left open."]),
 "g11_whiteboard": _st(11, "inspect", ["Half-wiped whiteboard: 'Q: does the unit need", "the crystal to stay calm IF bonded?' The rest is gone."]),
 "g11_clipboard": _st(11, "inspect", ["A clipboard. 'Unit test: calm response. Drift: yes / no.'", "Every 'bonded - handler's own' unit says yes."], gate="may set read_drift_log (Q5)"),
 "g11_clipboard_2": _st(11, "inspect", ["Every other unit says no.", "Nobody wrote what it means."]),
 "g11_counter": _st(11, "inspect", ["A cracked handheld counter. It still shows a number.", "On the back: 'Count by hand. The scanners don't like our four.'"], gate="flooded room, has_tideglide"),
 "g11_locker_toy": _st(11, "inspect", ["A toy frog, wrapped in a sock to keep it dry.", "Someone wanted this back. They didn't come for it."]),
 "g11_sampling_map": _st(11, "inspect", ["An old sampling map. A pencil arrow runs down the coast:", "'Tide readings: sea cave, Tidewater.'"], gate="after beat_master_mirefen"),
 "g11_leave": _st(11, "system", ["Daylight. {lead} shakes off the station all over you.", "Then rolls in the mud, very pleased with itself."]),
 # 12 key reader
 "g12_reader": _st(12, "system", ["ACCESS: RESEARCH STAFF. Your lanyard: FIELD.", "The reader blinks violet. It thinks about it."], parity="E10"),
 "g12_reader_2": _st(12, "system", ["...Then it lets you in. Cold air comes up the ladder."], parity="E10"),
 "g12_lead_hesitates": _st(12, "system", ["{lead} won't go down first.", "It waits until you're on the ladder. Then follows, close."]),
 # 13 Mirefen outpost supervisor (pq_bog_census)
 "g13_super_1": _st(13, "RT Supervisor", ["Promotion? Sure. Count the reeds, fix the camp, come back.", "I'd do it myself but my socks are drying."], parity="E10"),
 "g13_super_2": _st(13, "RT Supervisor", ["Done already? Show-off. Give us the form.", "Stamp. Stamp. Wetland Field Lead. Lovely."], parity="E10", gate="pq_bog_census done"),
 "g13_super_3": _st(13, "RT Supervisor", ["Oh, and this. Drawer nobody's opened since the station sank.", "Key card. Head Office says Field Leads get access."], parity="E10", gate="gives rt_keycard_r5"),
 "g13_super_4": _st(13, "RT Supervisor", ["Nobody said why. Nobody ever does.", "Mind the ladder. Mind the frogs. Mind yourself."], parity="E10"),
 "g13_super_after": _st(13, "RT Supervisor", ["The board's pinned under the frog paperweight.", "Frog's not part of the job. He just likes it there."], parity="E10"),
 # 14 Wenna (pre-battle variants that need a flag or warmth live here; the hall map entry keeps intro/coin/gift/after)
 "g14_wenna_lanyard": _st(14, "Wenna Peat", ["RT lanyard. Mud on the boots, though.", "I'll judge you by the boots."]),
 "g14_wenna_camp": _st(14, "Wenna Peat", ["You fixed the camp in the reeds. I knew those four.", "Kind to the frogs, they were. Not many are."], gate="camp_restored_mirefen (generic until Q3 confirms Marta)"),
 "g14_wenna_warmth": _st(14, "Wenna Peat", ["Your one's showing its own colour.", "Don't let anyone at the outpost talk you into fixing that."], gate="lead Warmth >= 60"),
 "g14_wenna_rematch": _st(14, "Wenna Peat", ["Back again. Good. Bog's still here. So am I.", "Boots dry? Doesn't matter. Come on."], gate="lost to Wenna before"),
 "g14_wenna_ace_low": _st(14, "Wenna Peat", ["Easy, love. You're fine. Breathe."], gate="mid-battle, her ace low HP; said to her creature"),
 "g14_wenna_ace_faint": _st(14, "Wenna Peat", ["That'll do. You did plenty. Rest now."], gate="mid-battle, her ace faints"),
 "g14_wenna_storm_window": _st(14, "Wenna Peat", ["Lamp stays lit in the window all storm season.", "Anyone out on the bog at night, they look for it."], gate="storm_season, after the coin"),
 "g14_wenna_frogs": _st(14, "Wenna Peat", ["That's Mabel, that's Fitch, that's Old Gorm.", "Every frog in this hall has a name. Yours too, if you stay."]),
 "g14_wenna_chores": _st(14, "Wenna Peat", ["Question? Hand me that rope first.", "...There. Now what was it? Never mind. You'll work it out."]),
 # 15 hall helpers: one listening hint each
 "g15_h1_listen": _st(15, "Cass", ["Stop moving. Stop talking. Just listen a bit.", "The frogs tell you the way if you let them."]),
 "g15_h2_listen": _st(15, "Juno", ["Wenna made me sit in the dark an hour once.", "I heard everything. Couldn't unhear it. Try it."]),
 "g15_h3_listen": _st(15, "Arlo", ["Shut your eyes. Count the croaks. Then open them.", "Feels daft. Works every time."]),
 # 16 side quests
 "g16_ask_nicely_1": _st(16, "angler", ["...", "I used to run the station's boat. Before it sank."], gate="sq_ask_nicely: sat at Dusk without talking"),
 "g16_ask_nicely_2": _st(16, "angler", ["Then it sank, and nobody asked.", "You didn't ask either. That's why I told you."]),
 "g16_count_1": _st(16, "census clerk", ["Count Day again. Same reeds, same pond.", "Fewer every week. I check my sums twice. They hold."]),
 "g16_count_2": _st(16, "census clerk", ["I'm not meant to name them. I name them anyway.", "Pip, Mossy, the one with the bent fin... Don't tell."]),
 "g16_count_3": _st(16, "census clerk", ["You found a counter in the station?", "That number's the same as my missing ones. Exactly."], gate="after g11_counter"),
 "g16_count_4": _st(16, "census clerk", ["I'm not saying who's taking them. I don't know.", "I'm saying I counted. Somebody should."]),
 "g16_count_5": _st(16, "census clerk", ["Broke a rule today. Wrote names, not numbers.", "Felt brilliant. Don't tell my supervisor."]),
 "g16_lamp_1": _st(16, "Wenna Peat", ["Tam's not home. Out on the bog after dark, in this.", "Follow the lamp. Your water one'll find the way."], gate="sq_wenna_lamp start, storm_season, Night"),
 "g16_lamp_2": _st(16, "kid Tam", ["I saw the bog lights! I wanted to see them closer!", "...And then I couldn't see anything."]),
 "g16_lamp_3": _st(16, "kid Tam", ["Is that Wenna's lamp? Okay. Okay. I'm coming."]),
 "g16_lamp_4": _st(16, "Wenna Peat", ["Wasn't worried. Lamp was on anyway.", "Tam. Bucket. Frog tank. Now. All week."]),
 "g16_lamp_5": _st(16, "Wenna Peat", ["Take a spare reed lamp. Put it in your window.", "Somebody'll be out late one night. They always are."], gate="gives Reed Lamp"),
 "g16_lamp_6": _st(16, "villager", ["Wenna was on that jetty all night.", "Says she wasn't worried. Lamp says different."]),
 # 17 Lantern Rest keeper
 "g17_keeper_wick": _st(17, "Lantern Rest keeper", ["Wick's brighter since the bog. Like it found an old friend.", "Ivo's spark always did know where to look."], gate="after sq_lumen_chain"),
 # 18 Brookhollow in the storm
 "g18_neighbour_1": _st(18, "neighbour", ["You're home! In this? Here, hold this sandbag.", "Welcome back. Lift with your knees."], gate="storm_season"),
 "g18_neighbour_2": _st(18, "neighbour", ["Every window's lit tonight. It's what we do.", "So anyone out walking knows where the doors are."], gate="storm_season"),
 "g18_kid": _st(18, "kid", ["Did you meet any sea monsters yet?", "...Next time, okay? Promise."], gate="storm_season"),
 "g18_bin_down": _st(18, "inspect", ["Ron's bin is on its side. Five bags rolled to the fence.", "You stand them back up. A neighbour waves from a window."], gate="storm_season, interact"),
 "g18_bin_up": _st(18, "inspect", ["Ron's bin, upright, in the rain. Still full."], gate="after g18_bin_down"),
 "g18_home_1": _st(18, "home", ["Look at you, dripping. Get in. Rest your team.", "Ron came by. Borrowed an umbrella."], gate="storm_season"),
 "g18_home_2": _st(18, "home", ["Said he's going down the coast for a job.", "He looked thin. Keep an eye out for him, would you?"]),
 # 19 Coast Road (map route_coast) stranded + new trainers. GD trainers on this map: tr_route_coast_a..f (maps.route_coast.route_coast_trainer_1..6)
 "g19_postman_1": _st(19, "Postman", ["Not coming down. The letters are dry up here.", "Down there, they're soup."]),
 "g19_postman_battle": _st(19, "Postman", ["Fine. Battle me. If I win, I stay on the roof."]),
 "g19_postman_lost": _st(19, "Postman", ["Rules are rules. Help me down. Mind the bag."]),
 "g19_postman_after": _st(19, "Postman", ["Tidewater's that way. Tell them post's coming. Slowly."]),
 "g19_diver_1": _st(19, "Cliff Diver", ["Just waiting it out. Been waiting since breakfast.", "I'm so bored I'd battle a seagull. You'll do."]),
 "g19_diver_lost": _st(19, "Cliff Diver", ["Best thing that's happened all day. Still lost."]),
 "g19_diver_after": _st(19, "Cliff Diver", ["Right. Glide me over to the ridge? I'll walk from there.", "Cheers. Look up when you pass the cliffs. Lightning shows a cave."]),
 "g19_contractor_1": _st(19, "Reef Contractor", ["My float's gone out to sea. Company float. Numbered.", "They'll want it back. Of course they will."]),
 "g19_contractor_battle": _st(19, "Reef Contractor", ["Battle me first. If I lose, I'll stop thinking about the float."]),
 "g19_contractor_after": _st(19, "Reef Contractor", ["Float's gone. I'm not. Funny which one goes on the form.", "Thanks for getting me off the wall."]),
 "g19_fisher_1": _st(19, "fisher", ["Storm frightens them. Frightens us too.", "We don't bite, mostly. They do. Can't blame them."], gate="after the forced Enraged fight"),
 "g19_fisher_2": _st(19, "fisher", ["Blew in from the deep, that one. Lost, angry, far from home.", "Sound like anyone you know?"]),
 "g19_fisher_tumbloam": _st(19, "farmer", ["You brought her back! She was on a hedge.", "Can't pay you. Have a scone. It's a bit wet."], gate="optional Tumbloam rescue"),
 # 20 Tidewater townsfolk
 "g20_boat_kid_1": _st(20, "kid", ["Nineteen... twenty... twenty-one.", "There should be twenty-two. I counted twice."]),
 "g20_boat_kid_2": _st(20, "kid", ["The Bright Morn's still out. That's my dad's.", "He's coming back. He always says so, and he does."]),
 "g20_crew_1": _st(20, "harbour crew", ["Grab the rope! No, the other rope! Pull!", "Good. You'll do. Everyone does, in a storm."]),
 "g20_crew_2": _st(20, "harbour crew", ["Three hundred years we've pulled boats up this slip.", "Nobody pays us for it. Nobody needs to."]),
 "g20_crew_3": _st(20, "harbour crew", ["Soup's in the hut. Lanterns are in the box.", "Everyone's got a job. Yours is not falling in."]),
 "g20_poster": _st(20, "inspect", ["A poster, half washed off the harbour wall:", "'NAMES, NOT NUMBERS.' A firefly drawn in the corner."]),
 "g20_rt_desk_sign": _st(20, "sign", ["RT TIDEWATER DESK\nClosed for storm. Mostly."]),
 # 21 Ron Tidewater fight (5-page opener split a/b; bin line placement waits on Q7, see _held)
 "g21_ron_opener_a": _st(21, "Ron", ["Don't say anything about the umbrella.", "...", "Job fell through. Like, structurally. Boat didn't go out."]),
 "g21_ron_opener_b": _st(21, "Ron", ["You've got coins, {nick}. I've got... the bins.", "Come on. Make me feel good at something. Or lose. Also fine."]),
 "g21_ron_ace_low": _st(21, "Ron", ["Hey. Hey. I've got you. Stay under here."], gate="mid-battle, his ace low; umbrella shield animation"),
 "g21_ron_win": _st(21, "Ron", ["Ha! Okay. Yeah. Okay.", "That's the most fun I've had since the letter."], gate="player wins"),
 "g21_ron_loss": _st(21, "Ron", ["Go dry off. Come back. I'm not going anywhere.", "Literally. No boat."], gate="player loses"),
 "g21_ron_after_1": _st(21, "Ron", ["I found something, {nick}. It's...", "Later. When it's not raining on it."], gate="after win; pats coat pocket, does NOT show the page"),
 "g21_ron_umbrella": _st(21, "Ron", ["Here. Have the umbrella. It's a souvenir now.", "Don't fix it. It's more honest like this."], gate="gives rons_umbrella"),
 "g21_ron_town": _st(21, "Ron", ["I'm helping drag boats. They say I'm useless but cheerful.", "Two out of two, {nick}. I'll take it."], gate="later, around town; harbour crew, until beat_master_tidewater (then Ron leaves north)"),
 "g21_fisher_on_ron": _st(21, "harbour crew", ["Your mate's useless with a rope. Cheerful, though.", "We'll keep him. Cheerful's hard to find in a storm."]),
 # 22 storm turn morning
 "g22_system": _st(22, "system", ["Morning. Sun on wet slate. The gulls are back.", "The storm broke in the night."], gate="after beat_master_tidewater, next morning"),
 "g22_boat_in": _st(22, "kid", ["Twenty-two! TWENTY-TWO!", "Told you. He always comes back."]),
 "g22_crew": _st(22, "harbour crew", ["Every boat home. Not a rope lost.", "Kettle's on. Hot squash for everyone."]),
 # 23 Tidewater Signal Lab inspects
 "g23_reader": _st(23, "system", ["The reader blinks. Station T. It lets you in quicker this time.", "Violet light shivers on the water inside."], parity="E10"),
 "g23_buoys": _st(23, "inspect", ["Instrument buoys bob in each pool, numbered.", "Lurelamps drift between them like they own the place."]),
 "g23_chart": _st(23, "inspect", ["A wall chart. A violet line marked 'signal strength'.", "A blue line marked 'tide'. They move together."]),
 "g23_sticky": _st(23, "inspect", ["A sticky note under the chart, very neat:", "'Correlation is not cause. - T.'"]),
 "g23_jacket": _st(23, "inspect", ["A jacket on a chair. A half-finished mug of tea, cold.", "Someone left in a hurry. They meant to come back."]),
 "g23_rota": _st(23, "inspect", ["Staff rota. This week's column, in red:", "'ALL STAFF OFF - STORM.'"]),
 "g23_birthday": _st(23, "inspect", ["A birthday card, signed by six people.", "'Happy 40th, Gwil! Don't touch the generator.'"]),
 "g23_visitor_sheet": _st(23, "inspect", ["A second visitor sheet. Three sets of initials: T.B., P.A., I.S.", "'Readings copied. Taking them north.' No M.Q."], gate="found_station_r5"),
 "g23_crate": _st(23, "inspect", ["Nailed shut. Stencilled:\nLANTERNPORT. INSTRUMENTS – SIGNAL."], note="story_beats §S rev 1: stencil identical to system_story_r78.signal_crate_first. DRAFT pending Gary"),
 "g23_tide_warning": _st(23, "sign", ["TIDE TURNING.\nLeave by the mouth while you still can.", "The water is already at your ankles."]),
 # 24 Tidewater desk clerk (pq_storm_duty)
 "g24_clerk_1": _st(24, "night clerk", ["Promotion? Form says someone has to be here to sign it.", "You're someone. Hold on, my blanket's stuck."], parity="E10"),
 "g24_clerk_2": _st(24, "night clerk", ["Three stranded, three rescued. Lovely.", "Form calls it 'asset retention'. I call it people."], parity="E10", gate="pq_storm_duty done"),
 "g24_clerk_3": _st(24, "night clerk", ["Coastal Operations Lead. Sounds very important.", "Comes with this. For the cave thing."], parity="E10", gate="gives rt_keycard_r6"),
 "g24_clerk_4": _st(24, "night clerk", ["Don't go at high tide. Last one who did, we had a form.", "Long form. Two pages. Please don't make me fill it in."], parity="E10"),
 "g24_clerk_after": _st(24, "night clerk", ["Still here. Still blanket. Storm can't last forever.", "That's what I tell the kettle, anyway."], parity="E10"),
 # 25 Jory (variants needing flags/warmth live here; hall map entry keeps intro/coin/gift/after)
 "g25_jory_slip_1": _st(25, "Jory Swell", ["You. Grab that rope. Pull when I pull.", "...Now. Steady. Steady. There."], gate="first meeting, slipway, storm"),
 "g25_jory_slip_2": _st(25, "Jory Swell", ["Thanks. How's your team? Cold?", "Hall's up the hill. Come when it's calm. Nobody fights well in this."]),
 "g25_jory_rescues": _st(25, "Jory Swell", ["Heard you pulled people off roofs on the way in.", "That's the job. The coin's just a coin."], gate="Coast Road rescues done"),
 "g25_jory_ron_won": _st(25, "Jory Swell", ["Your friend on the wall. He all right?", "Keep an eye on him. The sea's not the only thing that pulls."], gate="beat Ron at Tidewater"),
 "g25_jory_ron_lost": _st(25, "Jory Swell", ["Bad day for everyone. Go easy on yourself."], gate="lost to Ron at Tidewater, not yet won"),
 "g25_jory_warmth": _st(25, "Jory Swell", ["That one'd swim back for you.", "Don't ever give it a reason to have to."], gate="lead Warmth >= 60; he looks at the creature, not the crystal"),
 "g25_jory_rush": _st(25, "Jory Swell", ["Patience. The water's not ready, and neither are you.", "Sit. Watch the clock. It'll tell you when."], gate="hall puzzle not solved (soft flavour)"),
 "g25_jory_tide_table": _st(25, "Jory Swell", ["Hang on.", "...Turning in forty minutes. Right. Where were we?"], gate="random, any talk"),
 "g25_jory_ace_talk": _st(25, "Jory Swell", ["Easy, old friend. Let it come to you."], gate="mid-battle, any turn"),
 "g25_jory_ace_faint": _st(25, "Jory Swell", ["...", "There. You did fine. You always do."], gate="his ace faints; he kneels, then stands"),
 "g25_jory_morning": _st(25, "Jory Swell", ["Storm's turned. Smell that? That's the sea apologising.", "Lanternport's north. Keeper there doesn't sleep in a storm either."], gate="after beat_master_tidewater, morning after"),
 # 26 side quests
 "g26_glass_1": _st(26, "beachcomber", ["My best sea glass is violet now. More every month.", "Never used to be violet. That's all I know."]),
 "g26_glass_2": _st(26, "beachcomber", ["Three sandbars past the point. Glide out, bring me what's there."]),
 "g26_glass_3": _st(26, "beachcomber", ["I make chimes from it. Listen.", "...That bit. Don't know where it comes from. Pretty, isn't it?"]),
 "g26_glass_4": _st(26, "beachcomber", ["Take a bag to The Firefly, would you? Back room.", "For evidence, I said. Of what, I didn't say."]),
 "g26_glass_5": _st(26, "beachcomber", ["Heard that tune in the chimes once more last night.", "The Firefly's DJ hums it too. Small world."], gate="sq_missing_note active"),
 "g26_glass_6": _st(26, "Firefly back room", ["Violet sea glass. Huh. Put it on the shelf with the rest.", "We don't know what it means either. We keep it anyway."]),
 "g26_lifeguard_1": _st(26, "lifeguard", ["Get out of the water. Now. Not you, Splash.", "...You didn't see him. Got it?"], gate="lead Warmth >= 50"),
 "g26_lifeguard_2": _st(26, "lifeguard", ["No crystal. Never had one. He just stayed.", "Best swimmer on this coast. Don't put that on a form."]),
 "g26_lifeguard_3": _st(26, "lifeguard", ["Storm rescue. He bolted first. Scared stiff.", "Then he came back on his own. Pulled the kid out."]),
 "g26_lifeguard_4": _st(26, "lifeguard", ["Wild's not soft. Neither's tame. Both can turn round.", "That's all I know about creatures. It's enough."]),
 "g26_lifeguard_5": _st(26, "lifeguard", ["Splash likes you. He doesn't like anyone.", "Keep the secret. That's all I'm asking."]),
 "g26_lights_1": _st(26, "kid", ["Lantern stays in the window till the Bright Morn's back.", "Dad says it helps. So it helps."]),
 "g26_lights_2": _st(26, "kid", ["Will you sit with it? I'm not tired. I'm just resting my eyes."], gate="Night, storm"),
 "g26_lights_3": _st(26, "system", ["The kid is asleep by the lantern. Outside, a sail.", "Blow out the lantern?"], gate="dawn after beat_master_tidewater", choices=["Blow it out", "Leave it lit"]),
 "g26_lights_4": _st(26, "skipper", ["Saw a light in my window from the point. Steered for it.", "Thank you. Here. She drew this for you. Before she fell asleep."]),
 "g26_lights_5": _st(26, "system", ["A crayon drawing: a boat, a lantern, and you.", "You're very tall in it."]),
 "g26_umbrella_1": _st(26, "shopkeeper", ["A proper umbrella? Last one. Storm's had the rest.", "For a friend? Then it's half price. Don't tell anyone."]),
 "g26_umbrella_2": _st(26, "Ron", ["A new one? For me? {nick}, that's...", "I'm keeping the broken one too. Obviously."], gate="give at Lanternport"),
 "g26_umbrella_3": _st(26, "Ron", ["One for rain. One for remembering.", "Don't make it weird."]),
 "g26_umbrella_4": _st(26, "system", ["Ron opens the new umbrella. It stays the right way out.", "He looks at it like it did something clever."]),
 # 27 items (ids proposed; Game dev confirms)
 "g27_rons_umbrella_name": _st(27, "item", ["Ron's Umbrella"], parity="F18"),
 "g27_rons_umbrella_desc": _st(27, "item", ["Inside out, one rib bent. A souvenir now.", "Ron said not to fix it. You won't."], parity="F18"),
 "g27_reed_lamp_name": _st(27, "item", ["Reed Lamp"], parity="F18"),
 "g27_reed_lamp_desc": _st(27, "item", ["A lamp of woven reeds, like the one in Wenna's window.", "Put it in yours. Somebody's always out late."], parity="F18"),
}
# HELD until Gary rules (OPEN_QUESTIONS). Not validated by the builder; fit checked by Text Bot.
S["system_story_r56"]["_held"] = {
 "g05_nan_soup": {"pages": ["Had four guests once. Ate me out of house and home.", "Rated my soup an eight. I'm still cross about it."], "hold": "Q4 field-team timeline (undated visit)"},
 "g06_ron_bin_5": {"pages": ["Neighbour sent a postcard about the bins.", "It's fine. It's a nice postcard, actually."], "hold": "Q6: bin line outside battle?"},
 "g21_ron_bin_line": {"pages": ["Neighbour says the bags have started paying rent.", "Five bags. One for each of your coins. I counted."], "hold": "Q7: fight no. and bin count"},
 "g16_riverglint_1": {"pages": ["A big creature, drawn in charcoal on the islet stone.", "Its eyes are closed. Someone drew it very carefully."], "hold": "Q2 Guardian throughline: mood only; sq_gd_riverglint on HOLD"},
 "g16_riverglint_2": {"pages": ["Riverglint looks at you. Then at the water.", "It nods, once. Then it's gone."], "hold": "Q2"},
 "g16_angler_folklore": {"pages": ["Old folk say there's one that keeps the light.", "Old folk say a lot of things."], "hold": "Q2 (folklore only)"},
 "g18_trail_kid_jory": {"pages": ["(no new line) Sunmeadow 'Trail Kid Jory' keeps the name."], "hold": "Q8 rename (Gary: keep 'Trail Kid Jory' for now)"},
}
_RITA_R56B = {
 ("area_new_route1_east", 5): [
  ["{employee_id}: Trail 1 East logged. Land behind the barrier.", "Now land on the asset map. Mind the ridge."],
  ["Ridge added, {employee_id}. It glows. Glow is value.", "Do not chip it. That's our job."],
  ["{employee_id}: new area past the wall.", "It was always ours. Now it's on paper."],
  ["Crystal ridge on file, {employee_id}.", "Readings are down. Your output shouldn't be."]],
 ("area_new_station_mirefen", 5): [
  ["New asset site logged, {employee_id}.", "It was always ours. You just weren't cleared."],
  ["{employee_id}: research site Station M on file.", "Things you saw down there are company property."],
  ["Peat Station logged, {employee_id}. Sunk, not lost.", "Assets don't sink. They wait."],
  ["{employee_id}: welcome to research. Briefly.", "Touch only what you can log."]],
 ("storm_weather_event", 5): [
  ["Weather event logged, {employee_id}.", "Assets are not waterproof. Please keep them dry."],
  ["{employee_id}: lightning detected. Stay low.", "Assets with antennae, stay lower."],
  ["Storm on file, {employee_id}. Field work continues.", "Rain is not an absence reason. We checked."],
  ["{employee_id}: storm conditions. Asset value: holding.", "Unlike that porch."]],
 ("storm_turn", 6): [
  ["Storm damage below forecast, {employee_id}.", "Asset losses: acceptable. You: also acceptable."],
  ["{employee_id}: storm peak passed. Inventory intact.", "Please resume normal levels of productivity."],
  ["Clear skies logged, {employee_id}.", "Sun dries assets. Dry assets log faster."],
  ["{employee_id}: storm over, mostly.", "Rescues logged as asset retention. Lovely."]],
}
for (_k, _r), _vs in _RITA_R56B.items():
    for _i, _p in enumerate(_vs):
        S["system_company_voice"][_k + ("" if _i == 0 else f"_{_i + 1}")] = {"pages": _p, "parity": "E10", "build": "partial", "region": _r, "status": "DRAFT"}

# ---- Playtest fixes 3 (Coder request data/textbot_requests_playtest_fixes_3.md in the ps_clone site copy, Oct 29 2026) ----
S["system_items"]["team_link_band"] = {"pages": ["Team Link Band. Give it to a creature to hold.", "Holder earns 25% more XP, and half XP while benched."], "parity": "B19", "build": "partial", "status": "DRAFT"}
S["system_party"]["summary_labels"]["labels"]["met_starter"] = "Asset 1: first partner"
S["system_party"]["summary_labels"]["labels"]["met_gift"] = "Given as a gift"
S["system_field"]["hall_gate_mirefen"] = {"pages": ["Not yet. Light the reed lamps in the right order.", "Then we talk."], "parity": "F15", "build": "partial", "status": "DRAFT", "speaker": "Wenna Peat", "note": "src/progression/index.js:176 Mirefen in-map puzzle gate"}
S["system_field"]["hall_gate_default"] = {"pages": ["Open the way first. Then we talk."], "parity": "F15", "build": "partial", "status": "DRAFT", "note": "src/progression/index.js:176 other in-map halls"}

# ---------- R5-R6 v2 (Story Bot handoff updated 1:45 PM CT for Gary's rulings G1-G5). Text Bot Oct 29 2026 ~1:50 PM CT. DRAFT. Overrides and additions to system_story_r56. ----------
_V2 = S["system_story_r56"]
_V2.pop("_held", None)            # all holds lifted (G1-G5); every held line resolved below
for _k in ("g21_ron_opener_a", "g21_ron_opener_b", "g21_ron_after_1"):
    _V2.pop(_k, None)
_V2.update({
 # 5 Nan (G1 fact 2 said plainly; soup line live, undated)
 "g05_nan_3": _st(5, "Nan Wexley", ["The more crystals they fit, the brighter the shine gets.", "I've watched it forty seasons. That's not a guess."]),
 "g05_nan_soup": _st(5, "Nan Wexley", ["Had four guests once. Ate everything I had.", "Rated my soup an eight. I'm still cross about it."], note="undated nod to Marta; sets no date"),
 # 6 Ron bin line #5 at the Croft (heard here; the Tidewater opener has its own 5-bag line)
 "g06_ron_bin_5": _st(6, "Ron", ["Neighbour sent a postcard about the bins.", "It's fine. It's a nice postcard, actually. Has a duck on it."]),
 # 11 station: G1 facts 2 and 3 as data, never named
 "g11_strip_chart": _st(11, "inspect", ["A paper strip: 'Carrier: source reference.' Violet trace.", "It dips each time a crystal is set down. Slow to recover."]),
 "g11_strip_note": _st(11, "inspect", ["Pencil, in the margin: 'Each new unit draws on the source.", "Source is finite?' The question mark is dug in hard."]),
 "g11_is_doodle": _st(11, "inspect", ["Below, in another hand: a big creature, curled up asleep.", "There's a crack drawn on its brow. Signed I.S."]),
 "g11_bonded_tally": _st(11, "inspect", ["At the bench end, the four 'handler's own' units.", "Their trace runs flatter. 'Less draw.' Nobody wrote why."]),
 "g11_warm_glint": _st(11, "system", ["Out in the light, {lead}'s crystal flickers.", "For a blink, it isn't violet at all. Then it is."], gate="leaving the station, lead Warmth >= 70"),
 # 12 reader: card comes from the Benefits node (G5)
 "g12_reader": _st(12, "system", ["Benefits card: RESEARCH ACCESS. Your lanyard: FIELD.", "The reader blinks violet. It thinks about it."], parity="E10"),
 # 13 outpost: promotion unlocks the node; card arrives by post
 "g13_super_2": _st(13, "RT Supervisor", ["Done already? Show-off. Give us the form.", "Stamp. Stamp. Wetland Field Lead. Lovely."], parity="E10", gate="pq_bog_census done, sets promoted_id14"),
 "g13_super_3": _st(13, "RT Supervisor", ["New pin on the board. Field Leads can buy station access.", "Head Office calls it a perk. I call it a ladder in a bog."], parity="E10", gate="unlocks rt_node_station_m"),
 "g13_super_4": _st(13, "RT Supervisor", ["Buy it and the card comes by post. Pigeonhole by the door.", "Mind the ladder. Mind the frogs. Mind yourself."], parity="E10"),
 "g13_node_name": _st(13, "Benefits board", ["Research Access: Station M"], parity="E10"),
 "g13_node_desc": _st(13, "Benefits board", ["Key card for Mirefen Peat Station.", "A rare privilege. Wipe your feet."], parity="E10"),
 "g13_pigeonhole_empty": _st(13, "inspect", ["Your pigeonhole. A flyer for the staff raffle.", "Nothing else. Yet."], gate="before rt_node_station_m bought"),
 "g13_pigeonhole_card": _st(13, "inspect", ["An envelope with your number on it. A card inside.", "Station M Key Card. It's still warm from the sorting room."], gate="after rt_node_station_m bought; gives rt_keycard_r5"),
 # 14 Wenna: Marta camp is canon (G2)
 "g14_wenna_camp": _st(14, "Wenna Peat", ["You fixed Marta's camp. I knew those four.", "She rated my eel pie a four. Fair. It was a four."], gate="camp_restored_mirefen"),
 "g14_wenna_camp_2": _st(14, "Wenna Peat", ["...They were kind to the frogs.", "Not many are. Go on, then. Show me."]),
 "g14_wenna_rematch": _st(14, "Wenna Peat", ["Bog takes boots, not grudges.", "Back again. Good. Come on."], gate="lost to Wenna before"),
 "g14_wenna_ace_low": _st(14, "Wenna Peat", ["Easy. You're fine. Breathe."], gate="mid-battle, her ace low HP; said to her creature"),
 # 16 Where It Rested (sq_gd_riverglint, G1, R5 §9a)
 "g16_rested_1": _st(16, "angler", ["Station crew had a name for the islet out there.", "They called it 'the bed'."], gate="sq_nicely_done + found_station_r5, Dusk"),
 "g16_rested_2": _st(16, "angler", ["All this was a river bend once. Before the water dropped.", "Go at dusk. Go quiet. You'll see why they called it that."]),
 "g16_rested_glint": _st(16, "system", ["A Riverglint flashes gold, once, twice.", "Always the same way. Upstream. Toward home."], gate="dark islet, first visit look-only"),
 "g16_rested_hollow": _st(16, "inspect", ["A hollow in the peat, big as a house. Curled, like a body.", "In the middle, a stone with an old violet stain."]),
 "g16_rested_stone": _st(16, "system", ["The stain pulses, faint and slow.", "Each time it does, {lead} turns to face upstream."]),
 "g16_rested_warm": _st(16, "system", ["Near the stone, {lead}'s crystal shows its own colour.", "Just for a beat. As if something pushed back."], gate="lead Warmth >= 50"),
 "g16_rested_posts": _st(16, "inspect", ["Three notes come off the water. Then nothing.", "Old posts. The water line on them is far above your head."]),
 "g16_rested_3": _st(16, "angler", ["Here. My gran drew this. Kept it in the boat for luck.", "Said it keeps the light."], gate="Night, gives old_river_drawing"),
 "g16_rested_4": _st(16, "angler", ["Said it gets tired when people take too much of it.", "...That's all she said. That's all I'll say."], gate="sets sq_rested_done"),
 "g16_angler_folklore": _st(16, "angler", ["Old folk say there's one that keeps the light.", "Old folk say a lot of things. Some of them are right."]),
 "g16_drawing_name": _st(16, "item", ["Old River Drawing"], parity="F18"),
 "g16_drawing_desc": _st(16, "item", ["A huge river creature, eyes shut, a crack in its brow.", "Drawn by the angler's gran. It looks tired."], parity="F18"),
 # 17a Trail Kid Jory (Sunmeadow kid; separate from Master Jory Swell)
 "g17a_trail_kid_default": _st("17a", "Trail Kid Jory", ["My name's Jory. It's the best name.", "Nobody else has it. I checked. Twice."], gate="default, before beat_master_tidewater"),
 "g17a_trail_kid_proud": _st("17a", "Trail Kid Jory", ["There's a Master called Jory?! Is he kind?", "...He is? Good. Then I'll keep it. We can share."], gate="after beat_master_tidewater, once"),
 # 18 home: river low (G1)
 "g18_home_river": _st(18, "home", ["Strange thing. Rain all week, and the river's still low.", "Lowest I've ever seen it. Anyway. Sit. Eat."], gate="storm_season"),
 # 21 Ron 5, optional (G3): soul beats before the choice play for all
 "g21_ron_wall_1": _st(21, "Ron", ["Don't say anything about the umbrella."], gate="breakwater end, storm; plays for all"),
 "g21_ron_wall_2": _st(21, "Ron", ["Job fell through. Like, structurally.", "Boat didn't go out. There wasn't a boat. Or a job."]),
 "g21_ron_bin_line": _st(21, "Ron", ["Neighbour says the bags have started paying rent.", "Five bags. One for each of your coins. I counted."], note="coin-5 bin line: 5 bags, no flies (G3)"),
 "g21_ron_honest": _st(21, "Ron", ["I don't know what I am if I'm not at work, {nick}.", "You've got coins. I've got... the bins."]),
 "g21_ron_choice": _st(21, "Ron", ["Come on. Make me feel like I'm good at something.", "Or lose. That's fine too."], choices=["Battle", "Not now"]),
 "g21_ron_decline_1": _st(21, "Ron", ["...Yeah. No. You're right.", "I'd have lost my footing anyway. Wall's slippy."], gate="Not now; sets ron5_declined, met_ron_tidewater"),
 "g21_ron_decline_2": _st(21, "Ron", ["...Thanks for coming out here, though. In this.", "Means more than a battle. Don't tell anyone I said that."]),
 "g21_ron_rematch": _st(21, "Ron", ["Changed your mind? Good.", "I've been practising on the gulls. They're winning."], gate="ron5_declined, harbour slip, only before beat_master_tidewater (G6: rematch window closes there; then g21_ron_missed_parting)"),
 "g21_ron_pocket_win": _st(21, "Ron", ["I found something, {nick}. It's...", "Later. When it's not raining on it."], gate="after win; pats pocket, does NOT show the page"),
 "g21_ron_pocket_loss": _st(21, "Ron", ["Hey. I found something, {nick}. It's... no.", "Later. You win one first. Kidding. Later."], gate="after loss; pats pocket only"),
 "g21_ron_pocket_decline": _st(21, "Ron", ["Oh. I found something. It's... not for the rain.", "Later, {nick}. I'll be in town. Clearly."], gate="after decline; pats pocket only"),
 "g21_ron_umbrella": _st(21, "Ron", ["Here. Have the umbrella. It's a souvenir now.", "Don't fix it. It's more honest like this."], gate="all paths; gives rons_umbrella, sets met_ron_tidewater"),
 # 23 lab: fact 1 lands as data (G1)
 "g23_contour_map": _st(23, "inspect", ["A coast map. The violet signal is drawn as contours.", "The tightest ring sits on the river mouth."]),
 "g23_contour_map_2": _st(23, "inspect", ["The rings run inland up the river, like a vein.", "Label: 'Carrier strongest at fresh-water inflow. Source upstream?'"]),
 "g23_photo": _st(23, "inspect", ["A photo of the river mouth at low tide.", "Under the water, a long dark shape. Too blurry to read."]),
 "g23_sticky_tb": _st(23, "inspect", ["Sticky note, very neat: 'Don't guess. Measure. - T.B.'"]),
 "g23_sticky_is": _st(23, "inspect", ["Under it, in looser writing:", "'It's sleeping. Or it's tired. - I.S.'"]),
 # 24 desk: promotion unlocks the node; no Ron requirement (G3, G5)
 "g24_clerk_2": _st(24, "night clerk", ["Three stranded, three rescued, one Master. Lovely.", "Form calls it 'asset retention'. I call it people."], parity="E10", gate="pq_storm_duty done, sets promoted_id16"),
 "g24_clerk_3": _st(24, "night clerk", ["Coastal Operations Lead. New pin on the board for you.", "Station access. Cave thing. It's a perk, apparently."], parity="E10", gate="unlocks rt_node_station_t"),
 "g24_node_name": _st(24, "Benefits board", ["Research Access: Station T"], parity="E10"),
 "g24_node_desc": _st(24, "Benefits board", ["Key card for the Tidewater Signal Lab.", "Valid at low tide. Company not liable at high tide."], parity="E10"),
 # 25 Jory: Ron declined variant; optional nod to his namesake
 "g25_jory_ron_declined": _st(25, "Jory Swell", ["Your friend on the wall. You didn't fight him? Good.", "Some days you just sit with someone."], gate="ron5_declined"),
 "g25_jory_namesake": _st(25, "Jory Swell", ["Kid in Sunmeadow's got my name, I hear.", "Tell him I'll try to live up to it."], gate="optional, after g17a_trail_kid_proud"),
 # 26 sea glass says it out loud (G1); umbrella gated on met_ron_tidewater (G3)
 "g26_glass_1": _st(26, "beachcomber", ["My best sea glass is violet now. More every month.", "It washes out of the river mouth. Worse every season."]),
 "g26_glass_2": _st(26, "beachcomber", ["Like the river's bleeding. That's how it looks to me.", "Three sandbars past the point. Bring me what's there."]),
 "g26_glass_hum": _st(26, "system", ["The violet glass in your bag hums, very faintly."], gate="near the lab's tight contour"),
 "g26_umbrella_1": _st(26, "shopkeeper", ["A proper umbrella? Last one. Storm's had the rest.", "For a friend? Then it's half price. Don't tell anyone."], gate="met_ron_tidewater (fought or not)"),
})
for _i, _p in enumerate([
  ["Unregistered landmark, {employee_id}. Not on the asset map.", "Please stop finding things that aren't on the asset map."],
  ["{employee_id}: you found a hole in a bog.", "Holes have no resale value. Moving on."],
  ["Landmark not on file, {employee_id}. So it isn't there.", "That's how files work."],
  ["{employee_id}: a stone in a bog. Logged as 'stone'.", "Asset value: under review. Forever."]]):
    S["system_company_voice"]["landmark_unregistered" + ("" if _i == 0 else f"_{_i + 1}")] = {"pages": _p, "parity": "E10", "build": "partial", "region": 5, "status": "DRAFT", "note": "sq_gd_riverglint step 6"}
# ---- row 21 [NEW] parting beat (Gary G6): beat_master_tidewater without ever fighting Ron 5. DRAFT, Text Bot 1:49 PM CT ----
S["system_story_r56"]["_route_coast_trainers"] = {  # Brookhollow-Tidewater trainers: Game dev ids (balance.json region6) -> text keys. Map route_coast, player-facing 'Coast Road'.
 "tr_route_coast_a": "maps.route_coast.route_coast_trainer_1", "tr_route_coast_b": "maps.route_coast.route_coast_trainer_2",
 "tr_route_coast_c": "maps.route_coast.route_coast_trainer_3", "tr_route_coast_d": "maps.route_coast.route_coast_trainer_4",
 "tr_route_coast_e": "maps.route_coast.route_coast_trainer_5", "tr_route_coast_f": "maps.route_coast.route_coast_trainer_6"}
S["system_story_r56"]["g21_ron_missed_parting"] = _st(21, "Ron", [
  "Coin six. Look at you, {nick}. All grown up.",
  "Bag's packed. Five bins' worth of socks. I'm off north.",
  "Keep the umbrella dry. Well. Dry-ish.\nSave me a fight up there, yeah?"], gate="ron5_missed: beat_master_tidewater, never fought Ron 5; harbour slip, bag packed")
# ---- Options screen labels (v0.2.75 wind toggle). Text Bot Oct 29 2026 1:59 PM CT. DRAFT ----
S["system_phone"]["options"] = {"labels": {"wind": "Wind"}, "parity": S["system_phone"]["menu"].get("parity", "M1"), "build": "built", "status": "DRAFT"}

# ---- R5/R6 GD balance trainers (design/regions56_gd/balance.json) with no map spot yet. Text Bot Oct 29 2026 2:15 PM CT. DRAFT. ----
# Same fields as maps trainers (npc(): pages / battle_lost / after / trainer_class / name). Move to maps.<map>.<id> when World places them.
# Replaces my earlier invented route1_east trainers g02_trainer_a/b (Ridge Climber, Surveyor): GD's four take those slots.
for _k in [k for k in S["system_story_r56"] if k.startswith("g02_trainer_")]:
    S["system_story_r56"].pop(_k)
def _tr(gd_id, map_, cls, name, pages, lost, after, gate=None):
    d = _st(2 if map_ == "route1_east" else 19, name, pages, battle_lost=lost, after=after, trainer_class=cls, name=name, gd_id=gd_id, map=map_)
    if gate: d["gate"] = gate
    return d
S["system_story_r56"].update({
 "tr_route1_east_a": _tr("tr_route1_east_a", "route1_east", "Rock Hound", "Tamsin",
   ["Hold still. That rock by your boot might be a gem.", "...It's a rock. Battle me while I get over it."],
   ["Lost the battle. Still got a pocket full of maybes."],
   ["Four hundred rocks this year. Not one gem.", "Tomorrow, though. I've a feeling about tomorrow."]),
 "tr_route1_east_b": _tr("tr_route1_east_b", "route1_east", "Glyph Scholar", "Oswin",
   ["These ancient marks declare... that you must battle me.", "Probably. The light's bad. I'm confident anyway."],
   ["I may have read that one upside down. I stand by it."],
   ["The stones were carved long before the company.", "I can't read them. I read them anyway. Someone should."]),
 "tr_route1_east_c": _tr("tr_route1_east_c", "route1_east", "Kite Runner", "Tavi",
   ["Race you! Oh. Battles. Fine. Race you in a battle.", "The wind's winning today, but it's not here to fight."],
   ["Wind beat me, and you beat me. Big day."],
   ["Four hundred and twelve losses to the wind. Zero wins.", "I keep the sheet. One day it'll have a tick on it."]),
 "tr_route1_east_d": _tr("tr_route1_east_d", "route1_east", "Hedge Keeper", "Marlo",
   ["Stand still. I want to remember your face.", "I cut a hedge for everyone who beats me. Mostly one shape."],
   ["Yours'll be a big hedge. I'll need a ladder."],
   ["Grief's easier with shears in your hand.", "Losing's just a shape. I make it a nice one."]),
 "tr_tidewater_coast_cliffdiver_1": _tr("tr_tidewater_coast_cliffdiver_1", "tidewater_coast", "Cliff Diver", "Skye",
   ["And Skye steps up to the edge. The crowd goes quiet.", "There is no crowd. It's you. Battle me anyway!"],
   ["Skye loses! A ten from the judges, still. I'm the judges."],
   ["Highest drop on the coast, that ledge. I do it daily.", "Scared every time. Scared's how you know it counts."]),
 "tr_tidewater_coast_cliffdiver_2": _tr("tr_tidewater_coast_cliffdiver_2", "tidewater_coast", "Cliff Divers", "Bram & Bree",
   ["We're twins, and we always finish each other's...", "Socks. No, sentences! Bram, it's sentences. Battle!"],
   ["You beat... Us. Both of us. Together, for once."],
   ["Bram says we argue too much. I say we just talk loud.", "We'd jump off anything for each other. Just not in time."]),
 "tr_tidewater_coast_lighthouse_keeper": _tr("tr_tidewater_coast_lighthouse_keeper", "tidewater_coast", "Lamp Keeper", "Old Gus",
   ["Forty years I've polished that lens. I can tell a person.", "Let's see how you treat things that work hard for you."],
   ["You'll do. Your team trusts you. That's the whole test."],
   ["Light doesn't care who's out there. It just keeps on.", "That's the job. Shine. Don't ask who for."]),
 "tr_tidewater_coast_reef_researcher_1": _tr("tr_tidewater_coast_reef_researcher_1", "tidewater_coast_cave", "Reef Researcher", "Dr. Coralie Finch",
   ["Four hundred and six barnacles. Four hundred and--", "You've made me lose count. Again. You'll battle for that."],
   ["Fine. Fine. I'll start again from one. I like one."],
   ["Five times I've lost count in this cave.", "Doesn't matter. Somebody counting is the point."],
   gate="map tidewater_coast_cave; cave mouth, low tide"),
 "tr_tidewater_coast_reef_researcher_2": _tr("tr_tidewater_coast_reef_researcher_2", "tidewater_coast_cave", "Reef Researcher", "Idris",
   ["(whispering) Night shift. Everyone else went home.", "(whispering, but fiercely) Battle stations."],
   ["(whispering) Well played. Don't wake the Lurelamps."],
   ["(whispering) I talk quiet so the cave can talk loud.", "Listen. Drips. Tide. It's never actually quiet."],
   gate="map tidewater_coast_cave; cave, low tide; not the Signal Lab staff (Q10)"),
})

# ---- R5/R6 skill descriptions (dev/r56-wiring data/textbot_requests_r56_moves.md; Team screen reads system_skills.skill_desc.<id>). Text Bot Oct 29 2026 ~2:50 PM CT. DRAFT, pending. ----
# Pending: bogsnap/mirelob/brinelash/undertow/kelplash are not in src/battle/data/skills.js on this tree yet (only on dev/r56-wiring).
# Coder/Text Bot: when they land, move this dict to S["system_skills"]["skill_desc"]. Stat names follow STAT_NAMES (spe = Agility, atk = Might).
S["system_skills"]["_pending_skill_desc_r56"] = {
 "bogsnap": {"pages": ["Snaps shut with a jaw full of bog mud. The swamp never lets go easily."], "parity": "B21", "build": "designed", "status": "DRAFT"},
 "mirelob": {"pages": ["Lobs a sticky glob of mire. Squelch! May lower the target's Agility."], "parity": "B21", "build": "designed", "status": "DRAFT"},
 "brinelash": {"pages": ["Cracks a whip of stinging salt spray. Smarts like a wave to the face."], "parity": "B21", "build": "designed", "status": "DRAFT"},
 "undertow": {"pages": ["Drags the target into a sneaky pull of current. May lower its Might."], "parity": "B21", "build": "designed", "status": "DRAFT"},
 "kelplash": {"pages": ["Swings a long rope of kelp like a whip. Slippery, smelly and fast."], "parity": "B21", "build": "designed", "status": "DRAFT"},
}

# ---- Old Gus Brine Lash tutor (dev/r56-wiring textbot_requests_r56_moves.md; src/region56/tutor.js TUTOR_KEYS read system_story_r56.old_gus_*). Text Bot Oct 29 2026 ~2:48 PM CT. DRAFT. ----
# Pending: NPC tr_tidewater_coast_lighthouse_keeper has no map spot yet. When placed, move these four keys to the top level of S["system_story_r56"].
S["system_story_r56"]["_pending_old_gus"] = {
 "old_gus_offer": _st("tutor", "Old Gus", ['Forty years by the sea teaches you a trick.', 'Brine Lash. I could show {creature} how.', 'Salt spray, one good crack. Want it?'], parity="B21", choices=["Teach it", "Not today"], npc="tr_tidewater_coast_lighthouse_keeper"),
 "old_gus_none": _st("tutor", "Old Gus", ['None of yours have the sea in them yet.', 'No shame. The tide comes in for everyone.'], parity="B21", npc="tr_tidewater_coast_lighthouse_keeper"),
 "old_gus_taught": _st("tutor", "Old Gus", ['There. {creature} learned Brine Lash.', 'Treat it well. It works hard, like a lamp.'], parity="B21", npc="tr_tidewater_coast_lighthouse_keeper"),
 "old_gus_known": _st("tutor", "Old Gus", ['{creature} already knows Brine Lash.', "Can't polish a lens that's already clean."], parity="B21", npc="tr_tidewater_coast_lighthouse_keeper"),
}

# =====================================================================================
# ---- ORIGIN REVEAL R5/R6 + R1-R4 seeds + Dex fields (design/regions56/HANDOFF_TEXTBOT_ORIGIN.md CANON keys;
#      story_beats.md D0-D10, Gary approved Oct 29 2026 3:05 PM CT). Text Bot Oct 29 2026 ~3:15 PM CT. DRAFT wording.
# ALL PENDING: maps lab_mirefen_sunken / lab_tidewater_cave don't exist yet (Coder maps them), the spots (ins_m_*, term_*, ins_t_*,
# npc_confessor, npc_ron_lab) aren't placed, and the flags (lore_origin_r5, read_containment_index, read_breakout_logs,
# read_test7_sheet, seen_old_plaque_m, ron_in_lab_r6, ron_knows_origin, lore_origin_full, confessor_done) aren't in the flag list.
# Keys are the handoff's own dotted keys. Rule kept: nobody says "they were made". Coralie implies; Ron asks; logs show data.
# NOT written: finale fin.* (DRAFT, awaiting Gary). Removed per handoff: ron.lanternport.origin_aside, master.wenna.origin_aside, dex.field.line_none.
# New vars used here (add to the var list when live): {dex_no} {species} {line} {facility} {ron_partner_species} {ron_partner_line}.
# =====================================================================================
SAMPLES.update({"{ron_partner_species}": "Bramblehorn12", "{ron_partner_line}": "99", "{dex_no}": "450", "{line}": "99", "{facility}": "99"})
NEW_PLACEHOLDERS.update({"{ron_partner_species}": "species name of Ron's partner creature", "{ron_partner_line}": "containment line no. of Ron's partner species (origin reveal)",
 "{dex_no}": "Kilindex number", "{line}": "containment line no. of a species (origin reveal)", "{facility}": "RT facility no. of a species (origin reveal)"})
def _og(speaker, pages, key, gate, **kw):
    return _st("origin", speaker, pages, parity="D", key=key, gate=gate, **kw)
S["system_story_r56"]["_pending_origin"] = {
 # ---- R5: lab_mirefen_sunken (Station M), partial reveal ----
 "lore.r5.plaque_old": _og("inspect", ["Under the LUMEN YIELD SURVEY plaque,\nan older one peeks out.", "Only the end of it shows:\n'...LINE 14 BREEDING ANNEXE'"],
     "lore.r5.plaque_old", "ins_m_plaque_old; sets seen_old_plaque_m"),
 "lore.r5.jar_species": _og("inspect", ["A row of jars, labelled by hand.\nNot numbers. Names.", "BOGBEACON, GEN 3.\nMIREWUMP, GEN 5.", "{lead} sniffs the Mirewump jar.\nIt doesn't stop for a long time."],
     "lore.r5.jar_species", "ins_m_jar_species"),
 "lore.r5.term_log_1": _og("terminal", ["TERMINAL 1. LOG 0114.\nLine 14 stable. Batch healthy.", "Batch released to the bog for field\ntrial. Handlers on rotation."],
     "lore.r5.term_log_1", "term_m_log; rt_keycard_r5 + station power"),
 "lore.r5.term_log_2": _og("terminal", ["LOG 0115.\nField trial lost.", "Batch not responding to handlers.\nStation sealed. Pumps off."],
     "lore.r5.term_log_2", "term_m_log page 2"),
 "lore.r5.term_log_3": _og("terminal", ["LOG 0116. From: Head Office.", "Count what got out.\nDo not say 'got out'."],
     "lore.r5.term_log_3", "term_m_log page 3; sets lore_origin_r5"),
 "lore.r5.station_m_counter": _og("inspect", ["A cracked handheld counter. The number\nwas counted up, then counted back down.", "On the back: 'Count by hand.\nThe scanners don't like our four.'"],
     "CHANGED intent: Station M counter", "flooded locker, has_tideglide",
     note="replaces live g11_counter when lab_mirefen_sunken ships (tally of escapes counted back; sticky note meaning kept). g16_count_3 still reads fine."),
 "lore.r5.visitor_dc": _og("inspect", ["VISITOR BOOK. Marta's handwriting:", "'Damage control, they call it.\nWe call it a census. Sounds kinder.'"],
     "lore.r5.visitor_dc", "ins_m_visitor_dc"),
 "lore.r5.marta_census_line": _og("inspect", ["Marta's last camp page:\n'Twelve today. All fine.'", "'I don't think they're escapes.\nI think they live here now.'"],
     "lore.r5.marta_census_line", "camp_restored_mirefen (Marta's camp, G2)"),
 # ---- R6: lab_tidewater_cave (Signal Lab), full truth pieced together, Ron alongside ----
 "ron.r6.lab_join": _og("Ron", ["Boat's not till the tide turns.\nSo. I'm coming in.", "Someone has to read the signs out loud.\nYou go all quiet when it's spooky."],
     "ron.r6.lab_join", "cave mouth, low tide; met_ron_tidewater + beat_master_tidewater + rt_keycard_r6; sets ron_in_lab_r6"),
 "ron.r6.cheer_1": _og("Ron", ["Go on! Show them what a bin-man's\nbest mate can do!"], "ron.r6.cheer", "reef battle 1 (optional)"),
 "ron.r6.cheer_2": _og("Ron", ["She's counting barnacles mid-battle.\nHonestly? Respect."], "ron.r6.cheer", "reef battle vs Coralie (optional)"),
 "ron.r6.cheer_3": _og("Ron", ["I'd help, but I'm holding the torch.\nMorally, I'm helping."], "ron.r6.cheer", "reef battle 3 (optional)"),
 "lore.r6.term_index_header": _og("terminal", ["CONTAINMENT INDEX. RESTRICTED.\nDEX NO. / SPECIES / LINE / FACILITY"],
     "lore.r6.term_index_header", "term_t_index; rt_keycard_r6 + low tide; sets read_containment_index"),
 "lore.r6.term_index_row": _og("terminal", ["{dex_no}  {species}\nLine {line}, Facility {facility}"],
     "lore.r6.term_index_row", "term_t_index rows: the lead's species, then Ron's partner",
     fixed_rows={"442": ["442  RIVER UNIT\nLine 1, Facility 1"], "443": ["443\nLine 2, Facility 1"]}),
 "ron.r6.index_react": _og("Ron", ["Hang on. Let me look up {ron_partner_species}.", "Line {ron_partner_line}! Fancy.\nLike a postcode.", "...Why's my partner got a postcode?"],
     "ron.r6.index_react", "after term_t_index while ron_in_lab_r6"),
 "lore.r6.breakout_log_1": _og("inspect", ["FACILITY 3. NIGHT LOG, DAY 1:\nUnits unresponsive. Signal check due."],
     "lore.r6.breakout_log_1", "ins_t_breakout_logs; sets read_breakout_logs after 3"),
 "lore.r6.breakout_log_2": _og("inspect", ["FACILITY 5. DAY 2:\nUnits attacking staff. Doors holding.", "Doors not holding."],
     "lore.r6.breakout_log_2", "ins_t_breakout_logs"),
 "lore.r6.breakout_log_3": _og("inspect", ["FACILITY 1. DAY 3:\nFacility breached.", "A map is pinned behind. Red rings round\nevery RT site. Revival Heights too."],
     "lore.r6.breakout_log_3", "ins_t_breakout_logs"),
 "lore.r6.test7_sheet": _og("inspect", ["SIGNAL TEST 7. RUN SHEET.", "Objective: single-carrier command,\nall lines.", "Source: Line 1. Load: 140%.\nDated the night before the first log.", "Rows of neat ticks. Then the last row,\nin a hand that won't keep still:", "'Source crystal fracture.\nAll lines reacting.'"],
     "lore.r6.test7_sheet", "ins_t_test7_sheet; sets read_test7_sheet"),
 "lore.r6.brief": _og("inspect", ["PRODUCT BRIEF. Unsigned.", "Dominance crystal: containment,\nrebranded as companionship.", "Field teams: damage control,\nrebranded as research.", "In the margin, someone has drawn\na small, neat smiley face."],
     "lore.r6.brief", "ins_t_brief", note="unsigned; NOT Vane"),
 "ron.r6.logs_react": _og("Ron", ["Day one. Day two. Day three. Same week.", "And the test was the night before?", "'All lines.' All of them? Every one?", "And the index starts at Line 1. So...", "...So before that week, there weren't\nany? Not one?", "Revival Heights is on that map.\nI took the bins out there for two years."],
     "ron.r6.logs_react", "after read_containment_index + read_breakout_logs + read_test7_sheet while ron_in_lab_r6; sets ron_knows_origin + lore_origin_full"),
 "ron.r6.logs_react_short": _og("Ron", ["I keep doing the dates in my head.\nThe night before. All lines.", "So before that week... there weren't\nany. Were there?"],
     "ron.r6.logs_react", "cove variant: player left the lab early; sets ron_knows_origin + lore_origin_full"),
 "ron.r6.still_mine": _og("Ron", ["Ron looks at {ron_partner_species}\nfor a long time.", "Still mine, though. Right?", "{lead} leans against Ron's leg."],
     "ron.r6.still_mine", "right after ron.r6.logs_react"),
 "npc.confessor.c1": _og("Dr. Coralie Finch", ["You read the shelf.\nEveryone reads the shelf."], "npc.confessor.c1", "npc_confessor; Coralie beaten + read_containment_index"),
 "npc.confessor.c2": _og("Dr. Coralie Finch", ["Read the dates.\nThen read them again."], "npc.confessor.c2", "npc_confessor"),
 "npc.confessor.c3": _og("Dr. Coralie Finch", ["They call it research.\nIt's counting. Bringing back.", "Mopping up. Forty-odd years of it."], "npc.confessor.c3", "npc_confessor"),
 "npc.confessor.c3b_cause": _og("Dr. Coralie Finch", ["She looks at the run sheet a long time.\nShe doesn't pick it up.", "I was on nights that week.\nI made the tea. That's all I did.", "...That's all I'm saying."],
     "npc.confessor.c3b_cause", "Ron asks what Test 7 was (ron_in_lab_r6)", note="implied only; also the finale loop (she made the tea that night)"),
 "npc.confessor.c4": _og("Dr. Coralie Finch", ["This one was a 'retrieval'.\nSix years ago.", "I'd fight anyone who called her\nan escape now. Anyone."], "npc.confessor.c4", "npc_confessor"),
 "npc.confessor.c5": _og("Dr. Coralie Finch", ["What do you call yours?", "...Good. Call it that.\nNot the number. Never the number."], "npc.confessor.c5", "npc_confessor"),
 "npc.confessor.c5_warmth60": _og("Dr. Coralie Finch", ["{lead}'s colour shifts.\nCoralie goes very quiet.", "Theirs did that too.\nYour four."], "npc.confessor.c5_warmth60", "npc_confessor; lead Warmth 60+"),
 "npc.confessor.c6_ron": _og("Dr. Coralie Finch", ["She nods, once.", "Always was."], "npc.confessor.c6_ron", "after ron.r6.still_mine; sets confessor_done"),
 "lore.r6.teo_note_v2": _og("inspect", ["Teo, on the visitor sheet, in a list:\n1. Readings copied.", "2. Taking them north.\n3. If the scanners don't like our four,", "maybe the scanners are wrong."],
     "lore.r6.teo_note_v2", "visitor sheet in lab_tidewater_cave"),
 "ron.r6.boat_leave": _og("Ron", ["Right. Boat. Tide. Me.\nIn that order.", "I'll think about it on the boat.\nBoats are good for thinking. Mostly.", "Don't read anything else without me.\nI mean it. I'll know."],
     "ron.r6.boat_leave", "cove, tide turning; Ron motif stays major (bright toy piano)"),
 # ---- Seeds R1-R4 (subtle; spoil nothing) ----
 "seed.r1.home_drawing": _og("inspect", ["A child's drawing, framed. The river,\nreeds, a big sun. Nothing else.", "Signed in crayon: 'Grandad, age 8.'"], "seed.r1.home_drawing", "R1 home (house_1f)"),
 "seed.r1.mum_drawing": _og("Mum", ["Grandad drew that when he was your age.", "Said it was very quiet back then.\nHe always said it like a question."], "seed.r1.mum_drawing", "R1 home, after seed.r1.home_drawing"),
 "seed.r2.poster_fineprint": _og("sign", ["REVIVAL TECH.\nRest. Care. Recovery.", "Tiny print at the bottom:\n'Serving the region since the Incident.'"], "seed.r2.poster_fineprint", "Revival Centre poster (R2)"),
 "seed.r2.stone_stamp": _og("inspect", ["Low on the stone, almost worn away:\na small stamp. 'RT HERITAGE OFFICE.'"], "seed.r2.stone_stamp", "R2 old stones, after lore_origin_full; live Glyph Scholar line stays"),
 "seed.r3.club_enraged": _og("Club patron", ["Enraged, they call it. Eyes go all red.", "My dad said that's what the first lot\nwere like. Dunno what he meant."], "seed.r3.club_enraged", "R3 club_int patron"),
 "seed.r4.returned_board": _og("inspect", ["An old tally board, chalk gone grey:\n'RETURNED: 312'", "Newer chalk underneath: 'RETURNED: 313'\nNext to it, a little drawn heart."], "seed.r4.returned_board", "R4 Greystone / Frostspire tally board"),
}
# Dex fields (Kilindex UI). Line shows the dash until lore_origin_full; legendary (442/443) entries get the heritage note.
S["system_kilindex"]["_pending_origin_fields"] = {
 "dex.field.line": {"pages": ["Line: {line}"], "default_pages": ["Line: \u2014"], "flags": ["lore_origin_full"], "values": {"442": "1", "443": "2"}, **_D},
 "dex.field.heritage_note": {"pages": ["Entry source: RT Heritage Office."], "applies_to": ["442", "443"], "flags": ["lore_origin_full"], **_D},
}
# RITA exit lines (system_company_voice pattern: key, key_2.._4, region tag, bare {employee_id}). Pending: maps not placed.
_RITA_O = {
 "rita.lab_m.exit": (5, [["Reminder, {employee_id}: research areas\nare a Benefits perk. Not a story."],
                         ["{employee_id}, exiting research area.", "Perks are perks. Plots are not provided."],
                         ["Research perk used, {employee_id}.\nNo story is included in that package."],
                         ["{employee_id}: facility visit logged.", "Reading old logs is not a career path."]]),
 "rita.lab_t.exit": (6, [["Your session in an unlisted area has\nbeen noted, {employee_id}."],
                         ["{employee_id}: unlisted area, logged.\nYour file now has a new tab."],
                         ["Session noted, {employee_id}.\nUnlisted rooms are not a Benefit."],
                         ["{employee_id}. You were in a room\nthat isn't on the list. Noted."]]),
 "rita.lab_t.exit_beat": (6, [["...", "...Have a nice day."],
                              ["...", "...Please have a nice day, {employee_id}."],
                              ["Further comment is...", "...Have a nice day."],
                              ["...", "Have a nice day. That's all. Good."]]),
}
S["system_company_voice"]["_pending_origin_rita"] = {}
for _k, (_reg, _vs) in _RITA_O.items():
    for _i, _p in enumerate(_vs):
        S["system_company_voice"]["_pending_origin_rita"][_k + ("" if _i == 0 else f"_{_i+1}")] = {"pages": _p, "parity": "E10", "build": "partial", "region": _reg, "status": "DRAFT"}

# Interim ending (Gary approved Oct 29 2026; request: data/textbot_requests_interim_ending.md on dev/interim-ending).
# Live (v0.2.87 credits). DRAFT until Gary approves the rest. credits_crew = Gary's dictated 'Dev team: Gary Hight' only (no bot roles, no studio line).
_E = {"parity": "M1", "build": "different", "status": "DRAFT"}
S["system_ending"] = {"_section": "Interim ending: Ron 6 win with 8 coins -> Ron + RITA -> credits -> home to Brookhollow -> postgame note. DRAFT, pending Gary.",
 "ron_after": {"pages": ["Six losses. Eight coins. Yours, mind.\nStill. Not a bad week, was it?", "Head Office can wait a day.\nLet's go home first, {player}."], "note": "Suggested key: Ron 6 after-battle variant when the win rolls straight into credits (replaces maps.aurelith.aurelith_ron_6.after there; that line stays for the arena walk-in). Coder to wire.", **_E},
  "ron_home": {"pages": ["Home, then. Head Office can wait\none more day.", "Somebody should take the bins out.\n...Fine. Tomorrow."], **_E},
  "postgame": {"pages": ["GAME CLEARED.", "Your save keeps going. Catch, battle\nand explore anywhere you like.", "The Aurelith Arena opens in a future\nupdate. Head Office is still up there."], **_E},
  "credits_open": {"pages": ["You did it, {name}.", "Eight coins. One Ron. A very long week."], **_E},
  "credits_team_head": {"pages": ["The team that got you here"], **_E},
  "credits_coins_head": {"pages": ["Eight halls, eight coins"], **_E},
  "credits_ron": {"pages": ["Ron", "Who lost six times", "and came along anyway."], **_E},
  "credits_rita": {"pages": ["RITA", "Who logged every step.", "Lunch break: still pending."], **_E},
  "credits_bin": {"pages": ["The bin", "Still waiting.", "Ron says tomorrow."], **_E},
  "credits_crew_head": {"pages": ["Made with care by"], **_E},
  "credits_crew": {"pages": [["Dev team", "Gary Hight"]], "note": "Gary, Oct 29 2026 (dictated): dev team is just Gary Hight; no bot role names; no studio line.", **_E},
  "credits_crew_note": {"pages": ["Grok Bot was used in the production of this game."], "note": "Gary, Oct 29 2026 (dictated).", **_E},
  "credits_thanks": {"pages": ["And you.", "Thank you for playing Kilumen."], **_E},
  "credits_end": {"pages": ["To be continued...", "Head Office is still up there."], **_E},
}

# Aurelith city lift prompt (Galleria 1F-4F + Roof, Hotel 1F/2F). Map json carries prompt "Lift. Which floor?" today; Coder may read this key instead. DRAFT
S["system_field"]["lift_prompt"] = {"pages": ["Lift. Which floor?"], "note": "Aurelith Galleria + Grand hotel lifts; floor labels stay in the map json", **_D}

# Text Bot r78b (Oct 29 2026): hall order lock (src/systems/hall_order.js, {master} = previous town). DRAFT.
S["system_field"]["hall_locked_prev"] = {"pages": ["The door's locked. A note says:", "\"Beat the {master} Master first.\""], "note": "{master} = previous town name", **_D}

# Text Bot r78 crate (Oct 29 2026, story_beats §S rev 1). DRAFT pending Gary. Live once lanternport_grotto has the crate spot, else parked.
_CRATE_R78 = {
 "signal_crate_first": {"pages": ["LANTERNPORT. INSTRUMENTS – SIGNAL.\nThe lid's pried up. The straw is damp.",
                                  "One gauge left. Past 100%, the dial\nturns red. Someone scratched a 7 there.",
                                  "The needle's jammed past the red.\nSlip: \"Facility 1. Do not exceed 100%.\""],
                        "sets": "found_signal_crate_r7"},
 "signal_crate_again": {"pages": ["The SIGNAL gauge.\nStill jammed past the red. Still."]},
}
import os as _os
_GROTTO = _os.environ.get("KILUMEN_MAPS_DIR", "/workspace/kilumen/art/world/overworld/maps") + "/lanternport_grotto.json"
_crate_live = _os.path.exists(_GROTTO) and '"lanternport_grotto_signal_crate"' in open(_GROTTO).read()
for _k, _v in _CRATE_R78.items():
    _e = dict(_v, region=7, status="DRAFT", note="pending Gary (story_beats §S)", parity="F15", build="partial")
    if _crate_live: S["system_story_r78"][_k] = _e
    else: S["system_story_r78"].setdefault("_pending_crate", {})[_k] = _e

# Text Bot hall overhaul (Oct 29 2026, dev/hall-trainers 7eb218b, src/progression/hall_v2.js). {fee} is a bare number, so "gold" is written in. DRAFT pending Gary.
S["system_halls"] = {"_section": "Hall v2: attendant progress, Master gate, rematch. Coins are Master awards; money is gold.",
 "progress": {"pages": ["Beat {need} trainers here to face\nthe Master. You've beaten {wins}.", "{left} to go. The Master's watching."], **_D},
 "progress_open": {"pages": ["{wins} wins. You needed {need}.\nThe Master will see you now.", "Go on up. Mind the last step."], **_D},
 "master_locked": {"pages": ["Not yet. Win {left} more in my hall.", "{wins} of {need}. Come back with the rest."], **_D},
 "prism_open": {"pages": ["The prism catches the light and\nsplits it into every colour.", "The way to the Master is open.\nGo on up. Mind your eyes."], **_D},
 "master_puzzle": {"pages": ["You'll have to reach me first.", "The hall is the first test.\nFind your way to the front."], **_D},
 "rematch_prompt": {"pages": ["Back for more? A rematch costs\n{fee} gold, paid now, win or lose."], **_D},
 "rematch_no_gold": {"pages": ["A rematch is {fee} gold.\nCome back when your wallet agrees."], **_D},
 "rematch_won": {"pages": ["Beaten again. Fair's fair:\n{prize} gold, as promised.", "Spend it well. I'll be training."], **_D},
}# Coder fields kept exactly as on the branch (4ddf8285): read alongside the text by hall_v2.js / contacts.js
for _k in ("progress", "progress_open", "master_locked", "rematch_prompt", "rematch_no_gold", "rematch_won", "master_puzzle"):
    if isinstance(S["system_halls"].get(_k), dict):
        S["system_halls"][_k].update(placeholder=True, note="PLACEHOLDER (hall overhaul, Coder Oct 29 2026): Text Bot to replace, see data/textbot_requests_hall_overhaul.md")

NEW_PLACEHOLDERS.update({"{wins}": "hall trainers beaten in this hall (digits)", "{left}": "hall trainer wins still needed (digits)"})
SAMPLES.update({"{wins}": "12", "{left}": "12"})
SAMPLES.update({"{prize}": "1200"})
NEW_PLACEHOLDERS.update({"{prize}": "Master rematch prize, bare number (1200); text adds gold"})

# DRAFT pending Gary (Oct 29 2026, 5:37 PM): three keys the wt_r58 src reads with fallbacks.
# overworld.js:432 text() wants a string list joined with "\n" (toast; no {pages} dict). Shown when
# R78.lanternportGate names a flag the player lacks (e.g. beat_master_tidewater); currently null = open.
S["system_story_r78"]["lanternport_gate"] = ["Lanternport's keeping its lamps low.\nBest earn your Tidewater coin first."]
# ui.js:757 P() then .join(' ') into a 2.2 s note: one short page.
S["system_save"]["locked"] = ["Not now! RITA can't file reports\nmid-scene. Try again in a moment."]
# ui.js:892 T() plain strings: title + the KEY ids here/built/later.
S["system_phone"].setdefault("map", {})["legend"] = {"title": "Map key", "here": "You are here", "built": "Open now", "later": "Coming soon", "status": "DRAFT"}

# G6 ruled (Gary 5:55 PM CT Oct 29, relayed by Coder): ron.r6.boat_leave fires on the forced low tide right after
# beat_master_tidewater. Unparked from _pending_origin, wording unchanged (fits: Ron leaves by boat as the tide drops).
_bl = S["system_story_r56"]["_pending_origin"].pop("ron.r6.boat_leave")
_bl.update(parity="F15", gate="forced low tide right after beat_master_tidewater", ruling="G6 ruled: Gary 5:55 PM CT Oct 29",
           note="trigger = the forced low tide after beat_master_tidewater (G6). Wording DRAFT; cove, Ron motif stays major (bright toy piano)")
S["system_story_r56"].setdefault("ron", {}).setdefault("r6", {})["boat_leave"] = _bl   # nested: region56/index.js getPath(`system_story_r56.${LOW_TIDE.key}`) splits on "."

# Text Bot (Oct 29 2026, 6:03 PM): Aurelith Arena run text, src/region78/arena.js ARENA_KEYS (look(): list or {pages}). DRAFT pending Gary.
_AR = dict(parity="F15", build="partial", status="DRAFT", note="arena.js ARENA_KEYS; data/textbot_requests_arena.md (18e06603)")
S["system_arena"] = {"_section": "Aurelith Arena: 8 Arena fighters back to back, no heal between. DRAFT pending Gary.",
 "run_start": {"pages": ["Eight rooms, no breaks, no clinic.\nIs your team ready to go?"], "trigger": "fighter 1, before the run; Yes / No follows", **_AR},
 "next_fighter": {"pages": ["On to the next room!\nThe crowd's getting louder."], "trigger": "between fights", **_AR},
 "fighter_waiting": {"pages": ["Not yet! Rooms go in order.\nStart with Marisol, in the first room."], "trigger": "fighters 2-8 talked to directly", **_AR},
 "run_lost": {"pages": ["That's the run over.\nBack to the first room next time!"], "trigger": "loss; blackout to the last clinic follows", **_AR},
 "run_won": {"pages": ["That's all eight, back to back!\nThe Aurelith Arena is yours!"], "trigger": "all 8 beaten; sets arena_cleared", **_AR},
 "clerk_cleared": {"pages": ["All eight in a row. Your name's\non the board now, in big letters."], "trigger": "clerk after arena_cleared", **_AR},
}
