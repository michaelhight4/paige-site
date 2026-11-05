# Boundwake — Content playtest: thin / missing

**Date:** Thu Nov 5, 2026 (America/Chicago)  
**Method:** Dry playtest from `data_fantasy/` + docs + engine eligibility sims (`eligible()` by age/race/job) + 120-life smoke (`218/267` distinct events fired) + live browser findings folded in.  
**Scope:** No game `src` edits; no content stripped. Pack size: **267** live events (89 core + 142 expansion + 36 passion).

---

## Top 10 priorities for Gary

1. **Wire Track A/B ownership story beats (A0–A13 / B0–B12) into yearly events** — systems exist; narrative beats do not. **Blocker.**
2. **Fix long-life content cliff** — elf/dwarf `eligible()` collapses to ~6 @ cage 120 and **1** @ 150+ without ownership. **Blocker.**
3. **Fix death/illness vs lifespan** — elves & humans both die ~65–68 of the same sickness (ailments keyed to `cage`, death curve soft until `hage>70`). **Blocker.**
4. **Fix `{heir_name}` unsubstituted on reincarnate birth log** (`terms.death.after`). **High.**
5. **Stop showing “Child” for calendar teens/adults** — `stage()` / header label use `hage` (elf cage 19 ≈ hage 2.85 → Child). **High.**
6. **Make guild hall claim discoverable** — copy says Belongings; control lives in Work accordion; easy to miss. **High.**
7. **Gate realm-tagged events on current region** — 52 tagged events fire anywhere. **High.**
8. **Fill early childhood (0–5) + Glassmarket/Thornreed child flavor.** **High.**
9. **Career-gated work for cook & weaver (0 today); thicken rogue/scholar/retainer/spellblade.** **Med/High.**
10. **Reduce RNG feast-or-famine yearly draws + thicken elder (50–89 human / post-90 longlife) pools.** **Med/High.**

---

## Findings (severity · what’s thin/missing · evidence · suggested fill)

### Blocker

| ID | What’s thin / missing | Evidence | Suggested fill |
|----|----------------------|----------|----------------|
| B1 | **Team/guild ownership story beats absent from event pool** | Story doc lists A0–A13 / B0–B12 (`docs/tournament_team_and_guild_hall_story_beats.md`). Pack search for `team_founding`, `guild_founding`, `team_hook_notice`, etc. → **0 IDs**. Live has only `x_ll_*` / `x_cross_*` plus flavor hall/meet work cards (`work_hall_*`, `fame_hall_testimonial`). Engine UI can found team/hall, but yearly narrative arc is missing. | Author once-gated events (or chains) per beat id; bind `if.team` / `if.guild` stages; reuse dialogue in `docs/events_draft/tournament_guild_scene_dialogue.md`. |
| B2 | **Elf/dwarf long-life yearly pool empty after ~120** | Sim: human@90 → 24 eligible; elf@120 → 6; **elf@150/200/300/500 → 1** (`oldage_slow_mornings` only) unless team+guild owned. Lifespans 250/600 (`races.json`) unused by content. | Broaden 40–80 non-ownership events to ages `[18,400]` with race flavor variants; add mid/late life family, craft, realm, travel cards minAge 90–300; keep ll_* as extras not the only food. |
| B3 | **Race longevity not felt in death** — elf & human both die ~65–68 illness | Live browser. Engine: ailments use **calendar** age (`bw_engine.js` ailment filter `a >= d.ages[0]`); `heartstop_spark` ages `[40,200]` death=1; several deadly ailments cap at 100 cage. Old-age dieP uses `hage>70`, but illness kills earlier equally across races. | Scale ailment ages by lifespan or `hage`; reserve instant_death for high hage; add elf/dwarf “second century” illness set; keep founding gates on `cage`. |

### High

| ID | What’s thin / missing | Evidence | Suggested fill |
|----|----------------------|----------|----------------|
| H1 | **`{heir_name}` literal on reincarnate** | `data_fantasy/slice/terms.json` → `death.after`: `You wake as {heir_name}…`. `reincarnate()` logs `D.terms.death.after` raw (`bw_engine.js` ~921). `continueAsHeir()` correctly interpolates `n.first`. | Substitute `{heir_name}` (and `{gold}`/`{heirs}` in `summary_line`) in reincarnate + death UI; or stop using template string for reincarnate (new soul ≠ heir). |
| H2 | **“Child” label at calendar age 19** | Live browser. `ui.js` header: `st === 'baby' \|\| st === 'child' ? 'Child'`. `stage()` = f(`hage`). Elf cage 19 → hage ≈ 2.85 → baby/child. | Drive player chrome (Child/Student/No work) from **`cage`** (or separate displayStage); keep hage for portrait curve only. |
| H3 | **Guild hall claim “missing” from Work** | Live: cannot find claim. Code: Open hall is Work accordion `acc('guild'…)` (`ui.js` ~282–313). Travel/year copy says claim from **“Work (Belongings)”** (`bw_engine.js` ~436, ~1658) but Belongings tab only *summarizes* hall (`ui.js` ~503–505). Emberlight also needs renown 40+ (`canFoundGuild`). | Fix copy → “Work → Adventure guild hall”; surface disabled reason; optional Belongings deep-link button; toast when cage hits 18. |
| H4 | **Team founding soft-locked behind skill 20** | Live + `foundTeam` / UI `need 20` (`bw_engine.js` ~1077, `ui.js` ~345). Design lock: cage≥16 **and** affinity≥20 — correct per docs, but early adult lives often never reach 20 → track invisible. | Soften to 15 for founding / 20 for captain; or one “clerk waiver” event; show training tips on disabled buttons. |
| H5 | **Realm tags are cosmetic — wrong-realm flavor** | 52 realm-tagged events have **no** `if.region` (`matches()` has no region key). Tags like `hearthfold` only bias via `visit_bias`. Quay events can fire in Emberlight. | Add `if.region` / `if.regions` in `matches()`; retrofit expansion realm cards. |
| H6 | **Early childhood (0–5) starvation** | Sim: age 3 → **4** eligible. Child-only (max≤11): **7** IDs. Overlap 0–5: `child_first_word`, `child_stick_sword`, `child_mud_king`, `health_fever_season`, `x_child_hf_paper_boat` (+few). | +12–20 toddler/child cards (all realms); GF/TR/SW/EM child mirrors of HF paper boat / statue ribbons. |
| H7 | **Glassmarket & Thornreed childhood sparse** | Realm tag band 0–11: HF 7, **GM 2**, **TR 3**, SW 4, EM 4. No GM/TR child-only IDs beyond loose overlaps. | 3–4 child events each (quay toys, reedpath sticks, tidepool dare kid variant). |
| H8 | **cook / weaver: zero `if.career` events** | Career scan of live pack: cook & weaver absent from all career gates. Rogue 2, scholar mostly shared, retainer thin. | 3 work cards each (kitchen count already ungated — gate it; loom jam, dye spoil, rush order). |
| H9 | **Adult event density feast-or-famine** | Live: one life sparse adults, another dense. Engine `drawEvents`: 75% chance per slot, 1–2 slots (`bw_engine.js` ~638–648); many `once:true`; career gates shrink pool. Smoke 218/267 ever seen. | Guarantee ≥1 non-once slice event ages 18–49; raise draw floor when eligible\<30; reduce once on work fillers. |
| H10 | **Elder years thin (human 85+ / all races post-peak)** | Sim: human 70→95 eligible, **85→24**; elder-min≥50 only **14** events. Live: elder years feel empty. | Expand `oldage_*`, mentor-the-young, realm elder councils; extend work/fame max ages; human 80–90 exclusive set. |

### Medium

| ID | What’s thin / missing | Evidence | Suggested fill |
|----|----------------------|----------|----------------|
| M1 | **Dialogue seeds mid beats** | Was missing A3/A7/A9/A13/B3/B8/B12. **Filled + Gary OK ~4:47 PM CT** in `tournament_guild_scene_dialogue.md`. | Coder wire A0–A13 / B0–B12 from seeds. |
| M2 | **Long-life beats exist but unreachable without dual ownership + survival** | `x_ll_*` (10) + `x_cross_*` (7) gated on race/team/guild. Without hall+team, elf 150+ has almost nothing. | Decouple some ll flavor from ownership; add “never founded” late life slice. |
| M3 | **`school_dojo_style_choice` sets `flag` style_* but combat uses `swordStyle`** | Event `school_dojo_style_choice` flags `style_bulwark/thorn/storm`. Engine bonuses read `s.swordStyle` (Skills UI). Flags never become swordStyle. | On choice, set `swordStyle` (or map flags→style in `matches`/skill mult). |
| M4 | **`school_academy` flag unused by events** | Set by `school_academy_entrance`; no event `if.flag: school_academy`. (Patronage uses age window, not flag.) | Gate academy school cards / Spireward exams on flag **or** drop flag. |
| M5 | **Job `promo_line` mass copy-paste** | `occupations.json`: same 4 lines ×15–22 jobs (“Your hands stop shaking…”, “Songs get your details wrong…”). | Per-sector promo lines (25 careers × ranks). |
| M6 | **Workshop content thin** | 16 workshop types, **3** events (`biz_theft`, `biz_blight`, `biz_praise`). | +1 event per type or 8 shared with `if.workshop`. |
| M7 | **Spireward / Emberlight adult OK; TR has 0 events minAge≥90** | Tag counts: TR longlife band 90+ = 0. | One TR standing-stone elder card; EM forge memorial. |
| M8 | **Beastkin marked stub** | `races.json` beastkin `src: coder_stub…`. Lifespan 80 — same cliff as human. | Confirm v1 inclusion; if yes, beastkin childhood/wild events. |
| M9 | **Passion tracks complete but decline choices empty_fx** | 12 passions × mentor/contest/gig = 36. Contest/gig “Stay home”/“Pass” → `fx:{}` (34 empty_fx total, mostly these). | Tiny spirit/stress tick so pass isn’t null. |
| M10 | **Docs contradiction: cross bonuses OFF paragraph vs lock ON** | Noted in `tournament_guild_longlife_and_crossbonus.md` §D vs story_beats cross paragraph. | One-line doc fix (no code). |

### Low

| ID | What’s thin / missing | Evidence | Suggested fill |
|----|----------------------|----------|----------------|
| L1 | Soft-decline empty_fx on core events | e.g. `explore_strange_merchant` “Walk on”, `work_raise` “Stay quiet” | Optional karma 0 / journal-only OK |
| L2 | Content bans clean in live JSON | No alcohol/drugs/tobacco gameplay; “smoke” = hive/forge/camp. Docs mention bans only. BitLife named only as voice/UI constraint. | Keep screening on new batches |
| L3 | No lorem/TODO in live event prompts | `TBD` only in design doc rewards line; “placeholder contract” in journals draft | OK |
| L4 | Duplicate prompts/titles | None in live pool | OK |
| L5 | Youth-only exclusive band tiny | Only `school_dance` strictly 12–17-only; most youth share adult max | More teen-only social/school once cards |

---

## Age / realm / job dry-path summary

### Eligible pool by calendar age (no job/team; mana on)

| Race | 3 | 6 | 12 | 16 | 30 | 60 | 90 | 120 | 150+ |
|------|---|---|----|----|----|----|----|-----|------|
| human | 4 | 18 | 68 | 127 | 105 | 103 | 24 | — | — |
| elf | 4 | — | — | 127 | 105 | 103 | 26 | **6** | **1** |
| dwarf | 4 | — | — | 127 | 105 | 103 | 26 | **6** | **1** @200+ |

### Realm flavor (tagged events ≈)

| Realm | Tagged ≈ | Child 0–11 | Gap |
|-------|----------|------------|-----|
| Hearthfold Vale | 15 | 7 | Best childhood |
| Glassmarket | 15 | 2 | Child + hard region gate |
| Thornreed | 10 | 3 | Child + no 90+ |
| Spireward | 13 | 4 | OK academy lean |
| Emberlight | 14 | 4 | Founding renown 40 friction |

### Careers with little/no gated work

- **None:** cook, weaver  
- **Thin (≤2 unique gates):** rogue, carpenter, mill_hand, orchard, fisher, inn_hand, courier, stablehand, retainer  
- **Healthier:** blacksmith, merchant, adventurer, farmer, guard/knight shared combat  

### Team / guild track vs story docs

| Stage | Engine/UI | Yearly event beat | Dialogue seed |
|-------|-----------|-------------------|---------------|
| Tease A0/B0 | copy hints | missing | yes |
| Found A1/B1 | `tfound`/`gfound` | missing | yes |
| Hire/board A2–A3/B2–B3 | roster UI | missing | A3/B3 **no** |
| First proof A4/B4 | meets/jobs resolve | missing | yes |
| Rival/crisis A5–A6/B5–B7 | seize/reclaim | missing | yes |
| Renown A9/B8 | renown number | missing | **no** |
| Legacy A12/B11 | handoff UI | missing | yes |
| Echo A13/B12 | Codex | missing | **no** |
| Long-life L1–L10 | gates work | **events present** (`x_ll_*`) | mostly yes |
| Cross C1–C7 | bonuses + events | **present** (`x_cross_*`) | yes |

---

## Coder handoff (bugs / friction / polish / flows / thin)

Concrete repros from data sims + live browser. Format: **did → happened → expected**.

### Bugs

1. **`{heir_name}` on reincarnate**  
   - Did: Die → Reincarnate (Echoes) → read birth journal.  
   - Happened: `You wake as {heir_name}. The house still smells like them — like you.`  
   - Expected: New name or reincarnation-specific line (not heir template).  
   - Fix: `reincarnate()` must not log unsubstituted `terms.death.after`; use distinct string.

2. **Player labeled Child at calendar 19 (esp. elf)**  
   - Did: Play elf to Age 19, check Life header subtitle.  
   - Happened: “Child” (stage from hage≈2.85).  
   - Expected: Teen/adult / Student / No work by **cage**.  
   - Fix: Split portrait-stage (hage) from employment label (cage).

3. **Elf dies like a human of illness mid-60s**  
   - Did: Live elf + human runs; both ~65–68 illness.  
   - Happened: Same ailment age bands; lifespan 600 irrelevant.  
   - Expected: Elf illness curve stretched; old_age dominant near hage 70+.  
   - Fix: Ailment ages via hage or `ages * lifespan/90`; nerf cage-40 instant_death for long-lived races.

4. **Blade style event doesn’t set combat style**  
   - Did: Take `school_dojo_style_choice` → Steady Guard.  
   - Happened: `flags.style_bulwark=1`; `swordStyle` still unset until Skills picker.  
   - Expected: Event choice commits style (or says “confirm at Skills”).  
   - Fix: Set `s.swordStyle` from choice flag.

### Friction / confusing UI

5. **Guild hall claim not where copy points**  
   - Did: Age 18+, read journal “claim from Work (Belongings)”, open Belongings.  
   - Happened: Summary “No hall” only; founding buried under Work → accordion.  
   - Expected: Belongings CTA or accurate Work path; visible unlock toast.

6. **Team affinity 20 gate feels like missing feature**  
   - Did: Age 16+, Adventure → found team; all affinities disabled “need 20”.  
   - Happened: No path explanation beyond disabled buttons.  
   - Expected: Clear “train X on Skills” or lower founding threshold.

7. **Emberlight hall locked without renown explanation surfacing**  
   - Did: In Emberlight, Work → guild accordion, button disabled.  
   - Happened: Easy to miss `lock-why` (renown 40+).  
   - Expected: Prominent reason + “travel to softer realm to found”.

### Broken / weak flows

8. **Ownership fantasy = UI without story cards**  
   - Did: Found team + hall, age up through renown.  
   - Happened: Numbers move; no A4/B4/A5 narrative events.  
   - Expected: Yearly beats matching story doc.

9. **Long-life ownership content trapped behind dual-track + not dying**  
   - Did: Elf without team/guild to 150.  
   - Happened: 1 eligible event.  
   - Expected: Slice-of-life centuries even if player never owns banners.

10. **Yearly event RNG variance**  
    - Did: Two adult lives, same age band.  
    - Happened: One sparse, one busy (75% draw × once gates).  
    - Expected: Steadier floor of work/realm flavor.

### Missing polish

11. Promo lines identical across ladders (`occupations.json`).  
12. Workshop types lack per-type events (3 global only).  
13. Empty `fx:{}` on passion pass choices.  
14. `school_academy` flag dead to event gates.

### Thin content (Coder+Text)

15. cook/weaver careers; early child; GM/TR child; human 85+; elf/dwarf 120+.  
16. Region gating implementation.  
17. Wire drafted nov5 work/fame/school already merged in expansion — good; still need ownership beat IDs.

### Story-side notes (for Text / Story Bot)

- Priority prose: A0–A13 / B0–B12 event prompts (dialogue seeds exist for most; fill A3,A7,A9,A13,B3,B8,B12).  
- Long-life non-ownership slice (not only `x_ll_*`).  
- Toddler pack + GM quay / TR reed childhood.  
- cook/weaver work voices; avoid alcohol/tavern-drunk; keep tea/lamps/forge-glow.  
- Reincarnate birth line ≠ heir line (tone).  
- Elder human “last harvest / guest lecture” density.  
- When gating, prefer `cage` in copy (“Age 16”) matching UI Age N.

---

## Content ban check

| Ban | Live data | Notes |
|-----|-----------|-------|
| Alcohol / drugs / tobacco | Clear | Mentions only in ban docs; “smoke” = bees/forge/camp |
| Bit Tensie / BitLife cloning | Clear | Docs cite as anti-goal; UI “BitLife-simple labels” = brevity not IP |
| gym / nurse | Clear | hall / healer used |

---

## Files touched by this audit (read-only)

- `data_fantasy/events.json`, `events_expansion.json`, `passion_events.json`, `passions.json`, `regions.json`, `races.json`, `slice/occupations.json`, `slice/terms.json`, `workshops.json`, `ailments.json`  
- `docs/tournament_team_and_guild_hall_story_beats.md`, `tournament_guild_longlife_and_crossbonus.md`, `events_draft/*`  
- `src/bw_engine.js`, `src/ui.js`, `src/pack.js` (repro only)  
- Smoke: `node tests/smoke.mjs` → PASS, 218/267 distinct events  

---

*Playtest Bot · Nov 5, 2026 CT · report only — no src/content edits*
