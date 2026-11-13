# Kilumen hall hints QA review (Tidewater, Lanternport, Cindervale): PARTIAL

**PARTIAL: stopped at Gary's request on Oct 30 2026, 12:54 AM CT.** I read the code and data but did not finish a full walk of the grids or run a solver. No game files were edited.

Code read: /workspace/wt_r58/kilumen (the branch the audit names). /workspace/kilumen itself has no hall_v2.js.

## Audit is partly stale
Commit ce646459 already landed static tells (belt arrows, paired-pad glyphs, plate/gate colours with lamps, wall shimmer, gate pan), the reset note and door toast, and new trainer `after` lines for Tidewater and Cindervale. The audit's top fix, "v1 after-lines", is done for these two halls.

## Preliminary issues (not fully verified)
1. **Lanternport: the 1F guide's dialogue describes a puzzle that doesn't exist. MAJOR (possible blocker for understanding).** `maps.lanternport_lighthouse_int.lanternport_hall_int_guide.lines` talks about "four coloured panes... light lamps in that order". The v2 floors have hidden walls, warp pads and a plate, and no lamps. The lens and window signs in the lamp room ("flashing a code") point the same wrong way. Fix: rewrite them to match the v2 rules, or check that the hall_v2 attendant talk path overrides these lines.
2. **Lanternport: the entry toast "The Master waits at the far end of the carpet" fires on 1F, 2F and 3F.** The toast fires on any door arrival, and each floor's door is its stairs-down arrival. There is no carpet on those floors. MAJOR/minor. Fix: show a per-floor rule toast instead.
3. **Lanternport HALL_HINTS fallback page 2 ("Walk left along the carpet...stairs by the door") describes the lamp room, but the guide stands on 1F.** Minor. The Text Bot hints override it if they load.
4. **Lanternport: each floor resets its gate bits only when you arrive by its stairs-down cell.** Coming down from above keeps the saved bits. On 3F the stairs from the lamp room land on the gate b cell (21,1). Check that the player is never inside a closed gate. Possible soft-lock: needs a test.
5. **Lanternport 2F has 4 warp pairs and the 3F maze leads to a plate that toggles every time you step on it.** Stepping back over T (21,3) on the way up closes gate b again. Nothing says the plate toggles. MAJOR. Fix: hint "step on it once" and show gate b on screen.
6. **Tidewater: "Both plates hide in the little maze on the west side" is inaccurate.** The plates are at U (2,13) and T (5,13), with trainer h4 at (3,13) standing between them in a 1-tile row. The player has to fight or swap past h4. Not verified. Minor.
7. **Tidewater: no demo glide strip in the foyer (rows 17-19 are plain floor).** The first ice is the big field at rows 5-8. Minor.
8. **Cindervale: the hint says "the gap on the far right, just past the door", and h6 says "the way up to the springs is a gap on the left".** In the grid, the belt field entry is from row 27, and row 22 has a gap at x=3 (left). The two hints may contradict each other. MAJOR, needs a check.
9. **Cindervale: h8 says "The two plain plates share one gate. Step twice and it shuts".** Both T plates (6,15) and (4,21) toggle bit 0, so stepping on both cancels them out. A player can undo their own progress without understanding why. Signposting is OK but terse. Minor.
10. **Cindervale: 12 trainers are packed into the belt field and side rooms (h1-h6 on belt rows 24-26).** Trainers standing on or next to belts may block forced chains. The warp code ends the chain if an NPC sits on the destination pad. Unverified. Needs a solver run with trainers as blockers.

## Not done
- Full BFS for unreachable tiles and soft-locks on each grid
- Checking the hall_anim-off public look
- Severity confirmation for items 4, 8 and 10
