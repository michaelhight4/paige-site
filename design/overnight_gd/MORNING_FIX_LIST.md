# Kilumen morning fix list (Game dev QA pass, Oct 23 2026, ~6:35 AM CT)

Read-only pass against /workspace/quality/GAME_QUALITY_CHECKLIST.md. Nothing in other bots' files or /workspace/kilumen code was edited.

Checked: 28 overnight maps + staging (art/world/overworld/qa/overnight_maps/), live maps/ and text/overworld_lines.json, 211 overnight creature sheets (creatures/_overnight/, manifest + previews), Coder's shots (shots/batch3_wire_v1, creatures_overnight, creature_wire_20261023, platform_profiles, mobile_fullscreen), and Game dev's own 84 files in design/overnight_gd/.

## Results that are green
- `run.py --check` (art/world/overworld/tools): 0 problems, nothing written, all 16 progression states reachable, TEXT IDS OK (405).
- Shot reports: batch3_wire_v1 failures 0; creatures_overnight and creature_wire_20261023 have 0 errors on PC and phone.
- design/overnight_gd: all 84 JSON parse; no blocked words; "tonic" appears only as approved item ids (energy_tonic, tonic_small, tonic_large), never as a label.
- Blocked words over maps and live map text: none player-facing. "bar", "smoke", "drug" hits are only the Firefly juice-bar rule notes ("no drink/drug/smoke"). "shiny" in tileset.json is an internal tile note ("shiny new padlock"), not shown.
- Code: capture is hold-up, not throw (src/ui/ui.js holdCrystal, src/ui/capture_fx.js). Battle UI shows "En x/y", not PP; `pp` is internal engine field only.
- PC 1920x1080 and phone 844x390 shots: HUD, dialogue, touch pad and A/B buttons fit in landscape.

## Fixes needed
1. **[DONE 6:25 AM CT, Text Bot: now "Hold it up…"; no "throw" left in overworld_lines.json] [MUST, IP] Throw-to-catch text.** text/overworld_lines.json ~line 14401, item `dominance_crystal`, page 2: "Throw it to bring a wild creature onto your team." Breaks the no-throw rule. Owner: Text Bot. Suggested: "Hold it up to a wild creature to bring it onto your team." Also check `dominance_crystal_plus` (Prime Crystal) and other crystal pages for the same wording.
2. **[SHOULD] Internal notes naming blocked terms.** text/overworld_lines.json lines ~614 ("PP (energy meter)") and ~747 ("Shiny-style rarity (Cosmic)") sit in the parity table. Not player-facing, but the publish scrub must strip them (checklist: scrub internal notes, deny-hash scan the whole build). Owner: Coder at build time / Text Bot.
3. **[SHOULD] Kilindex phone tooltip overlap.** shots/creatures_overnight/kilindex_phone.png: the "Peeplark Wind / Bird" hover card covers No.018 and No.019. Anchor it inside the selected card or over the right panel on phone. Owner: Coder.
4. **[NICE] PC pillarbox in narrow interiors.** shots/batch3_wire_v1/pc_1080p_*: Mirefen and hall interiors are narrower than the 1920 view, so wide black bars show. Fine if intended; otherwise frame with wall/void tiles or tighter PC zoom for interiors (PC profile only). Owner: World Design / Coder.
5. **[NICE] Enemy HP number missing in battle.** shots/creatures_overnight/battle_phone_turn1.png: the foe panel has a bar but no number (matches the genre, so only if Gary wants it).
6. **[OPEN] One TODO_ROSTER slot left.** design/overnight_gd/encounters_route_brookhollow_aurelith.json line ~99 `TODO_ROSTER:sea` (sea fishing slot). Owner: Game dev, when the dex has a fitting sea creature.
7. **[OPEN] All 211 overnight creatures are `status: draft`** in manifest_overnight.jsonl (placeholder stats, draft art). Needs Gary's look at shots/creatures_overnight/contact_sheet.png before anything is marked final.

## Gary decisions carried over (from World Design's MORNING_SUMMARY.md)
- Draft names and texts; reed lamp size (16px x4 vs full 64px); unbuilt Aurelith Arena interior and Greystone B2; whether natural fog/mist is OK as weather under the no-smoke rule; 4 older signs readable only from the side (sign_fern also under a tree top).

## Screenshots to send Gary
- shots/batch3_wire_v1/contact_sheet.png, shots/creatures_overnight/contact_sheet.png, shots/platform_profiles/contact_sheet.png
- art/world/overworld/qa/signs_fix/signs_before_after.png, qa/autotile_port/<map>/before_after.png, qa/batch3/mirefen_hall_phases.png
