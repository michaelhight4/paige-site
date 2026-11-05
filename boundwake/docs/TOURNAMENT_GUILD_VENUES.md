# Boundwake — Tournament & guild hall venues

**Status: DRAFT — World Design · Nov 5, 2026 ~3:25 PM CT.** No push/publish. Content only; no Lifeline code or `/workspace/lifesim` edits.
Companion to `TOURNAMENT_TEAMS_AND_GUILDS.md` (systems locked there). Voice matches `data_fantasy/regions.json`.

## Rules for these pins
- Parks, stalls, ponds, lawns over caves. Parchment fantasy life-sim; no cottage-suburb look.
- No alcohol, drugs, or tobacco. Fire, hearth, forge smoke OK. Celebrate with food stalls and lamps.
- Original Boundwake names only — no other-IP names. *Hall* not *gym*; *path/lane* not *route*; *healer* not *nurse*.
- Engine hook: realm meets fire when Visiting a `tournament`/`arena`/`fair` location, so meet venue `kind` includes **Tournament** or **Arena**. Halls use kind **Guild hall**.
- Ids follow `regions.json` prefixes (`hf_`, `gm_`, `tr_`, `sw_`, `em_`). None duplicates an existing id or name.

## Per realm

### Hearthfold Vale (`hearthfold`)
| Role | id | Name | Kind | Flavor | Visit hook |
|---|---|---|---|---|---|
| Guild hall | `hf_mossbeam_hall` | Mossbeam Guild Hall | Guild hall | An old grain barn with a job board nailed to every post; the first fee is always a bargain. | Open hall · rent hall slot · pay fees · read job board |
| Meet venue | `hf_ribbon_green` | Ribbon Green Lists | Tournament field | Rope rings on a mown meadow; families picnic on the slope and cheer the wrong team. | Watch meet · enter team (10g + 1 act) · scout recruits |
Placement: Ribbon Green sits beside **Greenwell Commons** (separate field, not the commons itself). Mossbeam is a short walk from **Market Row**. **Low Watchpost** stays the civic/Watch pin (its "sparring day" passion event stays separate).

### Glassmarket Coast (`glassmarket`)
| Role | id | Name | Kind | Flavor | Visit hook |
|---|---|---|---|---|---|
| Guild hall | `gm_tidebell_hall` | Tidebell Guild Hall | Guild hall | A harbor warehouse with a brass bell rung for every finished job; brokers bid on crews. | Open hall · pay fees · post a job · read renown ledger |
| Meet venue | `gm_pier_ring` | Saltpier Ring | Arena (pier) | A planked ring at the end of the long pier; losers sometimes go in the water. | Watch meet · enter team · bet-free stall snacks |
Placement: Tidebell sits by **Lantern Quay**. Hall *contracts* are stamped at existing **Ledger Hall** (civic seals) — Tidebell does not replace it. Saltpier Ring is not **Tidepool Court**.

### Thornreed Wilds (`thornreed`)
| Role | id | Name | Kind | Flavor | Visit hook |
|---|---|---|---|---|---|
| Guild hall | `tr_reedlodge_hall` | Reedlodge Guild Hall | Guild hall | Stilted longhouse over the marsh edge; trackers carve finished jobs into the rafters. | Open hall · pay fees · hire trackers · take wild jobs |
| Meet venue | `tr_stakeline_meet` | Stakeline Clearing | Tournament clearing | A trampled clearing ringed by marked stakes; meets end before the reeds go dark. | Watch meet · enter team · forage-trial bracket |
Placement: Reedlodge sits near **Foragers' Camp** (camp stays the mentor/forage pin). Stakeline is off **Reedpath Trail**, well away from **Standing Stone Ring** and **Ashen Gate**.

### Spireward Heights (`spireward`)
| Role | id | Name | Kind | Flavor | Visit hook |
|---|---|---|---|---|---|
| Guild hall | `sw_quillkey_hall` | Quillkey Guild Hall | Guild hall | A narrow stone house of map tables and sealed job scrolls; scholars hire crews for relic errands. | Open hall · pay fees · take Codex jobs |
| Meet venue | `sw_crest_terrace` | Crestfall Terrace | Tournament terrace | Tiered lawns below the Collegium; rune posts mark lanes and score in chalk light. | Watch meet · enter team · spell-bracket meets |
Placement: Crestfall is a separate tiered ground — **Practice Lawn** stays supervised spars/training. Quillkey sits near **Scribe Stalls** / **Archive Steps**, not inside the Collegium.

### Emberlight Marches (`emberlight`)
| Role | id | Name | Kind | Flavor | Visit hook |
|---|---|---|---|---|---|
| Guild hall | `em_cinderhorn_hall` | Cinderhorn Guild Hall | Guild hall | Timber-and-iron hall by the escort gate; a horn sounds when crews ride out. | Open hall · pay fees · take escort/frontier jobs |
| Meet venue | `em_sparkfield_arena` | Sparkfield Arena | Arena | Packed-earth ring behind the forges; spark showers mark each round. | Watch meet · enter team · blade-bracket meets |
Placement: Sparkfield sits behind **Forge Plaza**; **Emberlight Drill Hall** stays school/training. Cinderhorn neighbors **Redlamp Fort** (fort keeps escort writs). Not near **Deep Vault Threshold**.

## Grand tournament (every 3 years) — DRAFT
**Primary site: Spireward Heights — `sw_grand_tiers`, "The Grand Tiers"** (Kind: Tournament grounds; flavor: *Every third year the terraces fill with banners from all five realms; brackets run from dawn bell to lamp-lighting.*). Reason: neutral academy ground already tied to tournament brackets in `shared_map_unity.md`, and it hosts Spark brackets beside Blade/craft/Teams without favoring the martial realm. Crestfall Terrace is its everyday small-meet section; the Grand Tiers pin only appears/unlocks on tournament years.
Alt (if Gary wants frontier grit): Sparkfield Arena expanded in Emberlight.

## Collision check
Avoided: Ledger Hall, Drill Hall, Practice Lawn, Watchpost (existing pins); "Herb Fair" and "Watchpost sparring day" (existing passion events). All new names/ids unique vs `regions.json`.
