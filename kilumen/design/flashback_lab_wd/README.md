# Wellspire rebellion flashback lab (wd/wellspire-lab)

There are ten new maps, `fin_past_wlab_01_entry` … `fin_past_wlab_10_ondravel`, linked in order by code-4 doors. The forward door is in the top wall face. The back door is in the bottom wall, and you land one tile in front of the other door. Room 1 has no back door because the flashback drops you in at (5,11).

| # | map | theme |
|---|-----|-------|
| 1 | 01_entry | white entry corridor, reception counter, crest-crystal cast |
| 2 | 02_medical | clean medical wing, beds, restorer, cooler |
| 3 | 03_control | holo screens, 3×2 scan table, consoles |
| 4 | 04_tanks | main tank floor, six 2×3 cyan tanks, Line 2–9 pods |
| 5 | 05_amber | amber specimen corridor, pods and jar shelves |
| 6 | 06_growth | dark green growth room, green tanks, vines |
| 7 | 07_vats | sunken vats with railed grate walkways |
| 8 | 08_core | energy core: helix column, catwalks over a shaft |
| 9 | 09_observation | observation deck with a 4×3 porthole |
| 10 | 10_ondravel | 6×5 water-filled crystal tank with tubes (Ondravel release and fight) |

## Build
- `python3 tools/wellspire_lab/lab_art_kit.py` (re)draws `tiles_{1,2,3}x/wellspire_lab.png` (161 tiles) and appends them to `tileset_arena.json` (ids 12201+, category `wellspire_lab`). Shared kit tiles (beds, desks, consoles, plants, chairs) are reused wherever they exist.
- `python3 tools/wellspire_lab/build_lab_maps.py [--check]` writes the maps from ASCII layouts. Its checks: BFS reaches every floor cell; each room's doors are gated by trainer sight (the door is unreachable once sight cells are removed); every sign has a reachable stand cell; the arrival cell is not in any sight line.
- The 16 trainers (`fin_wlab_tech_1..15`, `fin_wlab_chief`) use L67–69 teams in `src/region9/teams.js`. The maps are listed in `world_layout.json` `maps_built`.

## Coder must wire (index.js / summit_fx.js, not touched here)
1. `FLASHBACK.to` → `fin_past_wlab_01_entry` (5,11) (currently fin_past_lab1_f1 11,9).
2. `R9.topLanding` / `WARP_GATES`: gate entries for the new maps as needed.
3. `guardian()` map `'fin_past_enclosure'` → `'fin_past_wlab_10_ondravel'` (or alias). Room 10 reuses spot ids `fin_past_dome` (7,7, stand 7,8) and `fin_past_logbook` (3,9, stand 3,10) so the existing handlers apply.
4. `summit_fx.js rowFor()`: add `fin_past_wlab_10_ondravel`. The map has `ondravel: {x: 7, y: 6}`, and the 4×4 sprite fits inside the tank.
5. TALK entries for the 16 trainers, plus Text Bot `battle_lost` lines (see TEXT_SPOTS.md), otherwise they won't challenge.
6. The phase teams test still keys `fin_past_enclosure.<phase>`. Keep those or re-key them.
7. This overlaps with Coder's `build_lab_v3.py` / `fin_past_lab1_*`. Pick one set. These maps are standalone and touch none of Coder's files.
8. The tank art stays intact after the release (no broken-glass variant yet).
