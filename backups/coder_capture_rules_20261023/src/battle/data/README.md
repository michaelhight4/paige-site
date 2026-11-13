# src/battle/data: Kilumen battle data (PLACEHOLDERS)

These tables feed the vendored engine (`vendor/battle-sim`, `installData()`). Creature names, elements, skill names and
item names already exist in the game (`src/ui/data.js`, `text/overworld_lines.json`). **Every number and effect below is a
PLACEHOLDER** that Gary needs to sign off. The bracketed ids are rows in `design/MECHANICS_PARITY.md`. Nothing here comes
from upstream data.

## Numbers and rules: for Gary
| Where | What | Placeholder value |
|---|---|---|
| creatures.js | Base stats (no stat sheets yet, B2/B3) | flat per evolution stage: 45 / 60 / 80; creatures with no line 60 |
| creatures.js | Evolution level | 16 × stage |
| creatures.js | Catch rate / base XP | 0.6 / 0.4 / 0.2 by stage; 50 + 40 × stage |
| creatures.js | Creature count | 16 in `SPECIES` (the brief mentioned 21) |
| elements.js | Element chart (B6: "no chart anywhere") | `PLACEHOLDER_CHART`: only water, fire, grass, earth, light, dark rows; 24 elements (23 effect folders + normal) |
| rules.js | Clean Strike odds / multiplier [B8] | 1/20 base, ×1.4 |
| rules.js | Affinity main / sub element [B7] | ×1.3 / ×1.3 (sub value unclear in DD) |
| rules.js | Strong / weak [B6] | ×1.5 / ×0.6; main + sub element results add up but never pass one step either way (`effectivenessCap` 1, `creature.ts runEffectiveness`) |
| rules.js | Energy overuse [B12] | power ×0.6, accuracy ×0.7, self-hit 1/8 max HP |
| rules.js | Warmth endure | Warmth ≥ 200, once per battle |
| rules.js | Retreat [B16] | always escapes if your Agility ≥ the foe's; else chance/256 = floor(yours × 128 / theirs) + 30 × (attempts − 1) |
| rules.js + vendor kilumen.ts | Catch [B13/B17] | p = catch rate × (1 − 0.85 × HP%) × status (Drowsy ×2, Scorched ×1.5) × crystal grade (1 / 1.5); 3 shakes, each passes with p^(1/3) |
| rules.js | XP [B20] | base XP × foe level / 7, trainer ×1.5 (floored); level L needs floor(0.8 × L³) |
| rules.js | Variants [B27] | Large Vitality/Guard ×1.1, Small Agility ×1.1, Enraged Might ×1.1, Cosmic cosmetic |
| rules.js | Scorched / Drowsy [B11] | 1/16 max HP per turn / skips 1–3 turns |
| rules.js | Items | Small Remedy +20 HP, Big Remedy +60, Pep Remedy +5 energy (pending `potions_vs_rest`), Calm Tea cures status |
| skills.js | Physical/special split | by element (`SPECIAL` set) |
| skills.js | Skill effects | `EXTRA`: Burrow Down, Tailwind, Dawnglow, Fade Out, Unravel, Huff (Drowsy 75%), Spark Sneeze (30% Scorch), Coal Charge (−1 priority), Swoop / Ferret Dash (+1) |
| skills.js | Energy per slot | 15 / 12 / 9 / 6 (same as `skillsFor()`) |
| skills.js | Fallback skill name | `[PLACEHOLDER fallback skill]` (engine-only, unreachable while overuse exists) |
| ../ui_sd.js | Trainer team | 2 creatures near the lead's level (no trainer rosters yet) |
| ../ui_sd.js | Wild foe for `?ui=battle` | Cindrip (Rillop if the lead is Cindrip), lead level −1 |
| ../ui_sd.js | Party level | from the placeholder `statsFor()` the Team screen already uses |

Not built yet (need design): Temperament, Focus stages, field conditions (Rain/Ashfall/Fog/Snow; the engine hook is kept).

## Text keys: for Text Bot
`src/battle/ui_sd.js` looks up `system_battle.<key>` in `text/overworld_lines.json`. Until a key exists it shows the
fallback below (marked `PH` in the code). Proposed namespace `system_battle`. Tokens are in braces.

| Key | Fallback |
|---|---|
| foe_sends | Trainer sends out {creature}! |
| go | Go, {creature}! |
| used | {creature} used {skill}! |
| overuse_hurt | {creature} pushed too hard and got hurt. |
| scorched_hurt | {creature} smarts from its scorch. |
| healed | {creature} feels better. |
| strong | That hit its weak spot! |
| weak | It shrugged most of that off. |
| immune | It didn't touch {creature}. |
| crit | A clean hit! |
| miss | {creature} missed. |
| fail | Nothing happened. |
| status_drowsy / status_scorched | {creature} got drowsy. / {creature} got scorched. |
| cure_drowsy / cure_scorched | {creature} shook it off. |
| cant_drowsy | {creature} is too drowsy to move. |
| stat_up / stat_down | {creature}'s {stat} went up. / went down. |
| warmth_endure | {creature} held on for you! |
| fainted | {creature} is out cold! |
| xp | {creature} gained {n} XP. |
| levelup | {creature} grew to Lv.{level}! |
| item_used | You used a {item} on {creature}. |
| crystal_throw | You held up a {item}. |
| caught | {creature} is with you now! |
| crystal_escape | {creature} broke free! |
| lost | Your team is out of strength... |
| prompt | What will {creature} do? |
| pack_empty | Nothing in the Pack you can use here. |
| pack_prompt | Use which item? |
| team_prompt | Swap in who? |
| send_next | Who goes in next? |
| out_cold_tag | Out cold |
| party_hp | Team: {n} of {total} can battle (screen-reader label of the party HP readout in the info card, Oct 22 2026) |

Existing keys reused: `system_wild.grass`, `system_wild.retreated`, `system_wild.cant_retreat`,
`system_skills.energy_low`, `system_skills.energy_out`, `system_trainers.no_retreat`, `system_item_catalogue` (item names).
Stat names shown on level-up: Vitality, Might, Guard, Focus, Resolve, Agility (`STAT_NAMES`, B2).

## Battle ground platforms (per biome) (Oct 22, 2026)
Each creature stands on an oval patch of ground drawn in code (our own art), set up in `platforms.js`:
- `PLATFORM_BIOMES[biome]` holds that biome's battle background (`bg`) and platform palette (shadow, rim, front face, top, light top, flecks, tufts, feet shadow). Only `grass` exists for now; its colours were sampled from `art/world/battle_bg.png`.
- `PLATFORM_SIZES`: `near` (player, 88×22 art px) and `far` (foe, 70×18, smaller for perspective).
- `drawPlatform(biome, size)` returns a cached pixel-art PNG data URL.
- The biome comes from `opts.biome`, then `?biome=`, then defaults to `grass`. An unknown biome falls back to grass.
- To add a biome, add one entry with its own `bg` and colours. Nothing else changes.
- Layout lives in `src/ui/ui.css` ("Battle fix pass" block). Each creature box's bottom edge is its sprite's feet line (`--feet`, measured from the sprite's lowest opaque row in `ui_sd.js`). The platform is centred on that line.
- Platform size is `--b-plat-px` × sprite scale: 2 px per art px on PC, 1.5 on phones (the `body.platform-mobile` rules), so the two profiles stay independent.
