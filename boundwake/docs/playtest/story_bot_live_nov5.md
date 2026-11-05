# Boundwake LIVE playtest — Story Bot (Nov 5 ~4:43 PM CT)

Two full lives (death at 65 elf, 68 human). Data-audit report still finishing; story-side gaps will follow.

## Paths
- Life1: Brynn Marrow, Elf, poor, fire, Restless Feet; Hearthfold Vale only; Stall Hand→Peddler→Trader; died 65 "A sickness no healer can outrun."; gold 3489; legacy 397. Tried Guild Hall visit + Adventure "Set out".
- Life2: Wil Marrow, Human, Echo of Wits reincarnate; traveled to Glassmarket at 18; died 68 same sickness line; ended No work / 4 gold. Never founded tournament team (Adventure shows 80g+action but skills need lvl 20; Literacy highest but not on list). No Teams/Grand Teams/Guild Hall claim.

## Bugs / friction (did → happened → expected)
1. Reincarnate with 0 heirs → journal "You wake as {heir_name}. The house still smells like them — like you." → replace placeholder; no-heir fallback copy.
2. Echo of Wits → no fate-draw; still Human + Restless Feet unexplained → show fate/echo effects or explain inherit.
3. Open `/` → first screen "You died. Continue/Skip" with no context → title/new-game or explain saved state.
4. "A Friend's Empty Purse": first choice (Lend) greyed with no gold but still clickable in DOM (`data-a=ch`) → disabled attribute + visible reason; auto-click-first loops stall.
5. Playwright `.click()` on event modal buttons times out; native click / dispatchEvent works → fix overlay/animation hit-target.
6. Age 19 showed stage "Child"; age 10 "Student"; never saw Youth/Adult/Elder labels → stage by age.
7. Elf died 65, Human 68, same generic sickness death → race lifespan + varied death causes.
8. Elder years (56–64+) felt same loop; little elder-specific content → elder events.
9. Life1 ages 20–55 mostly job-title changes, events sparse; Life2 had denser events (106) → uneven adult coverage.
10. Journal one-liners often ignore the chosen option; end-screen odd lines (tea quote) → journal should reflect choice.
11. Age 11 "Choose your path" panel skipped; "Child" persisted — unclear if path mattered → persist path / clarify.
12. Mossbeam Guild Hall visit → only "A hall slot could be claimed from Work." but Work showed everyday jobs only, no claim button → claim UI on Work or Hall.
13. Realm map: 4 slots ??? UNDISCOVERED; only one travel unlock checked → discovery pacing OK? or stuck.
14. Console showed "3 errors" on first load (unread) → check console.
15. Fate "Hidden talents: 3" — no later UI to review → Skills/Codex surface.

## Not exercised
Teams, Grand Teams, Guild claim, Bonds/Social, pastimes, healer, Belongings, Codex (tabs only). Event prose mostly unread (speed run) except {heir_name}.
