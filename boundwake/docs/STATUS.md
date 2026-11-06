## Live — **f6edd14f** Legacy accordion + row info · https://paigegames.net/boundwake/

## DEPLOY — Legacy collapsible + goal/ach info panel — Coder Nov 5 ~6:35 PM CT
- Life Goals + Achievements collapsible (`details.legacy-acc`); default both collapsed; `sessionStorage bw.ui.legacyAcc`
- Click/tap row (or title ⓘ) opens Boundwake info panel: desc + progress + reward plain words (from item fields)
- Desktop hover tip on rows; Claim buttons untouched
- Fixed info.js `[data-tab]` exclusion (same body[data-tab] trap as Age/Skip) so chips/rows open again
- Cache-bust `?v=legacyacc2`
- Smoke PASS: collapse, info panel, Claim All does not open info, Age +1

## Live — **f1bdc0c1** Legacy Life Goals/Achievements collapsible · https://paigegames.net/boundwake/

## DEPLOY — Legacy hub collapsible sections — Coder Nov 5 ~6:27 PM CT
- Life Goals + Achievements are `<details class="legacy-acc">` panels with chevron + counts (claimed/total · N ready)
- **Default: both collapsed** so Achievements header peeks above the fold (no marathon scroll past 48 goals)
- Collapse state persisted in `sessionStorage` key `bw.ui.legacyAcc` for the play session
- Claim / Claim All / Age+1 smoke PASS; Age/Skip `data-tab` trap untouched; plum contrast HARD kept
- Cache-bust `?v=legacyacc1` on ui.js / style.css / contrast_polish.css

## Live — **0289a75e** contrast HARD v3 · https://paigegames.net/boundwake/

## DEPLOY — Animator contrast HARD v3 — Coder Nov 5 ~6:25 PM CT
- Replaced `contrast_polish.css` with HARD pass v3 (Life Goals hue tiles + hard plum columns)
- Cache-bust `?v=hard3` on contrast link; style.css plum merge unchanged
- `.legacy-row` life/moss, `.legacy-ready` gold, `.legacy-claimed` mist; moss well on `.panel-legacy .card-body`; darker `.legacy-bar`

## Live — **3b421b00** desktop contrast polish · https://paigegames.net/boundwake/

## DEPLOY — Animator contrast polish — Coder Nov 5 ~6:20 PM CT
- Desktop columns `.play-hub/.play-main/.play-side` → plum night `#221a34`→`#140e1f`
- Opaque parchment restored on hub / panel-life / side plates (merged into `style.css` ≥1024 block)
- Opt-in `assets/ui_motion/contrast_polish.css` linked after style.css
- Age/Skip click trap untouched; smoke Age +1 PASS

## Live — **f69b7ac1** P1 body[data-tab] click steal hotfix · https://paigegames.net/boundwake/

## HOTFIX P1 — Age/Skip/Rest clicks stolen by body[data-tab] — Coder Nov 5 ~6:12 PM CT
- Root cause: `closest('[data-tab]')` matched `body[data-tab]` from setChrome; every Age/Skip/Rest re-rendered Life and returned before `data-a`
- Fix: tab delegation only `button[data-tab], a[data-tab], .flare[data-tab]`
- Engine ageUp was fine; UI path blocked

## Live — **532c1717** WD Legacy merge + motion · https://paigegames.net/boundwake/

## DEPLOY — WD Legacy content merge + Animator motion — Coder Nov 5 ~6:10 PM CT
- Motion: `legacy_motion.css` linked; LEGACY_HOOKS.md bw-* classes (panels/bars/claims/autopilot)
- WD merge (additive, live 34/20 kept): **+14 Life Goals**, **+8 Achievements** → **48 / 28**
- New progress: skillCat, passionMastered, notices, places, teamWins, guildJobs, codexId + prereq raceIn
- Meta flags: guildJobsTotal, everCraft40, everPassionMaster, everHome, longLife200
- Safeguards: startGold apply ≤80, rareTrait≤0.10, marketBuy≤0.05, act/social≤2; echoBoost + scoutBonus hooked
- Additive goal gold balanced ≈ **361g** (total claimable gold crumbs ≈ **1371g** with live base)
- Market: **16** herald flavor lines; Codex shelves: Skills / Craft & stalls / Banners & halls
- Smoke PASS; Lifeline untouched

## Live — **bb825ef5** Legacy motion + Autopilot polish · https://paigegames.net/boundwake/

## DEPLOY — Animator Legacy motion wired — Coder Nov 5 ~6:05 PM CT
- Opt-in `assets/ui_motion/legacy_motion.css` linked in `index.html`
- Hooks per LEGACY_HOOKS.md: `.bw-legacy-panel` / `-in`, `.bw-legacy-bar` + fill `is-filling`, `.bw-claim` / `-ready` / `-spark` / Claim All stagger ≤6, `.bw-auto-host` + `.bw-auto-skip-flash` `is-skipping`, `.bw-auto-dock`
- Claim handlers restored; Age +1 / Skip flash; Autopilot age advance smoke PASS
- Lifeline / tournament pack untouched

## Live — **f56882ee** Legacy Goals + Autopilot hotfix · https://paigegames.net/boundwake/

## DEPLOY — Achievements / Life Goals + Autopilot P1/P3 — Coder Nov 5 ~5:55 PM CT

### P1 Autopilot hotfix
- Age +1 / Skip broken at cage 0: incomplete Legacy hooks called undefined `tickLegacyLifeFlags` / `applyAchievementMods` mid-`ageUp`/`begin` → throw after age bump, UI never re-rendered
- Stubs + full Legacy API wired; Age +1 and Skip 1 advance cage from 0 (smoke PASS)
- Skip promise `.catch` + Age try/catch so future engine errors surface as toasts

### P3 Autopilot card blank
- Desktop flex: `.panel-life .card-body` had `flex:1;min-height:0;overflow:hidden` inside `height:auto` cards → body collapsed to 0
- Fix: non-journal Life cards `flex:0 0 auto` + visible body; Autopilot `auto-host` plate with readable ink + primary Skip buttons

### Legacy hub (Bit Tensie–inspired structure, Boundwake parchment — no IP/chrome copy)
- Data: `data_fantasy/legacy.json` — **34 Life Goals**, **20 Achievements**
- New **Legacy** tab: Life Goals (this life) + Achievements (meta) + permanent modifiers panel
- Claim / Claim All for goals and achievements; rewards gold/spirit/renown/skill crumbs; ach → Legacy sparks + mods (start gold, rare trait weight, act/social crumbs, etc.)
- Persist: `meta.legacy` in `bw.meta.v1` across reincarnates; mods reapplied on `begin`
- Codex deepen: category filters (All / Events / Places / Realms) with completion ratios + ??? locked rows

### Pack / smoke
- Life Goals **34** / Achievements **20** / market **36** / expansion **225** / own **27**
- Smoke: fresh dwarf Age +1 + Skip 1 → cage 2; claim `ach_first_life` + `lg_age_10` PASS
- Path: `/workspace/boundwake` · live https://paigegames.net/boundwake/
- Lifeline untouched

## Live — **57485ea3** Market+Autopilot+playtest · https://paigegames.net/boundwake/

## DEPLOY ready — Market (Game Dev) + Autopilot + TB2/Soccer/Story — Coder Nov 5 ~5:45 PM CT

### Yearly Market (Game Dev `YEARLY_MARKET.md` / `market.json`)
- OPTIONAL pack load `market.json` (36 trade goods)
- Belongings → Yearly Market: listings with **% vs normal**, cart → checkout, sell from packs
- Bartering: buy discount + sell rate per Game Dev formulas; XP capped +4/yr
- Seeded per cage year + realm; minAge **10**; gear/homes/mounts stay on Gear shop
- Autopilot does **not** auto-buy Market (player-driven)

### Also in this ship
- Autopilot/Skip 1/5/10/25/custom (Life + Age dock)
- TB2: baby magic 6+, Skills/Work crush, tourney empty copy, jail fmt/job-drop, healer dedupe, pool-tier, belongings team copy
- Soccer v3: Adventure flare→tab, Stall Hand apron fee shown, journal scroll, unique names, crime 12+, favicon
- Story Bot: Teams Meet on Adventure when team **or** party 2+ & skill 15+ @15; journal copy aligned; modal choice hit-target (sheet z-index, flare pointer-events none)
- Death age vs cemetery (68 vs 65): noted for later polish — not blocking

### Pack / smoke
- Expansion **225** / own **27** / market goods **36**
- Smoke: **PASS**
- Path: `/workspace/boundwake` · live https://paigegames.net/boundwake/
- Lifeline untouched

## Live note — edae02a8 (TB2 + Soccer v3 + Autopilot)

- Smoke PASS · expansion 225 / own 27
- https://paigegames.net/boundwake/
- Soccer path: `/workspace/boundwake`

## TB2 + Soccer v3 + Autopilot DEPLOY — Coder Nov 5 ~5:40 PM CT

### Bugfixes (Text Bot pass 2)
- Baby magic / school: age **6+** gate (Practice + choose school)
- Skills (+ Work) desktop crush: flex 0 0 auto on skill-acc / work-acc
- Tournament empty copy after entry (entered-meets vs “no match”)
- Jail fmtSentence + job-drop toast/journal; escape uses fmtSentence
- Healer duplicate removed from world activities
- Guild hire “pool tier” stripped from journal
- Belongings team: founding 16+ / affinity 15+ / 80g+1 act

### Bugfixes (Soccer Rpg v3)
- Journal **Adventure** flare chip → `data-tab` switch (info panel no longer steals)
- Stall Hand apron/kit bond **6g** (15% wage, min 5) shown on Join + journal
- Life journal scroll: `journal-host` min-height + overflow
- Unique NPC first names vs player/bonds
- Crime menu floor **age 12+** with lock-why; living-cost journal line
- Favicon.ico explicit link

### Autopilot / Skip (basic, free — Gary via Soccer)
- Life card + Age dock: Skip **1 / 5 / 10 / 25 / custom** (max 100)
- 1 turn = 1 cage year; safe event picks; pause on death/jail/romance/family/ownership/tournament/Stop
- Leftover acts: Rest if strained → Work → Train lowest
- Docs: `docs/AUTOPILOT.md` · module `src/autopilot.js`

### Pack / smoke / live
- Expansion **225** / own **27**
- Smoke: **PASS**
- Lifeline untouched
- Path for Soccer: `/workspace/boundwake` + https://paigegames.net/boundwake/

## Text Bot pass 2 + Soccer Rpg v3 DEPLOY — Coder Nov 5 ~5:35 PM CT

### Must-fix (TB2)
| Area | What |
|------|------|
| Baby magic | Practice magic + school choice gated age 6+ (same as Train) |
| Skills crush | Desktop skill-acc flex:0 0 auto (same family as Work) |
| False tourney gate | After entry shows entered-meets copy, not “no match” |
| Work crush | Strengthened pass2 CSS for work+skills |
| Jail copy / job drop | fmtSentence hardened; escape uses it; job-drop toast/journal kept |
| Healer dupe | World-activity healer hidden; Ailments card owns Visit healer |
| Pool tier leak | Stripped from guild hire journal |
| Belongings team | founding 16+ / affinity 15+ / 80g+1 act |

### Must-fix (Soccer v3)
| Area | What |
|------|------|
| Journal Adventure chip | Flare nav chips carry `data-tab`; click handler switches tab; info panel does not steal |
| Stall Hand 6g | Intentional apron/kit bond = max(5, 15% wage) shown on Join card + journal |
| Life journal cramped | journal-host flex min-height + scroll at desktop |
| Duplicate Dorin | Unique first names vs player + living bonds |
| Crime age gate | Menu floor age 12+; lock-why on rows; pilfer/cutpurse minAge 12 |
| Living costs | Journal line when −gold between jobs |
| Favicon | Explicit favicon.ico link |

### Retests kept PASS
Adventure@10, Stall Hand@10 copy, no term-as-null, friend lock-why, Scout@14+Travel, Restless Feet.

### Pack / smoke
- Expansion still **225** / own **27**
- Lifeline untouched

## Text Bot replay DEPLOYED — Coder Nov 5 ~5:20 PM CT (fold into depth window)

### Shipped this push
| Area | What |
|------|------|
| Work crush HIGH | Desktop `work-acc` flex:0 0 auto; workshops accordion opens if any owned |
| Notices MED | Post gated on cage + visible lock why |
| Jail MED | Job drop journal+toast; `fmtSentence` (months/years) |
| Guild MED | Last-year vs lifetime jobs; handoff age 50+ |
| Team/friend MED | Gate copy aligned; Make a friend tip always on |
| Ownership | Tease ages widened; 27 own_* still live (expansion 225) |

### Pack / smoke / live
- Smoke: **PASS** (252/350 distinct)
- Deploy commit: **218c9eec** on paige-site main
- Prior depth pack **22638063** retained
- Live: https://paigegames.net/boundwake/

### Still deferred / known lower
- Event modals ignore script clicks; thin outcome toasts; Work layout polish generally
- Elder/child/cook-weaver/death/adult floor/path@11 already shipped in 22638063

## Depth pack DEPLOYED — Coder Nov 5 ~5:20 PM CT (Gary: “i want it all”)

## 2026-11-05 Text Bot replay fold-in (Work crush + MED)
- Work tab @≥1024: `.work-acc` / cards `flex:0 0 auto` so guild hall + workshops no longer crush to ~10px bars; workshops accordion opens when any owned (Herb Stall visible after jail/unemployment).
- Notices Post: gate on **cage** (not hage) + show lock reason (Age / actions / prison).
- Jail: job drop warns in journal + sentence toast; `fmtSentence` unifies months/years (no more 0.5 years / 1 years).
- Guild hall: last-year vs lifetime jobs copy; handoff only age 50+.
- Team: Belongings + Adventure copy both say age 16+, affinity skill 15+, 80g+1 act.
- Make a friend: always-on title/aria tip + visible tip line.
- Ownership tease/founding ages widened + realm tags stripped from teasers for discoverability (own_* still live).
- Deferred depth pack (elder/child/cook-weaver, death causes, adult RNG floor, path@11) remains in this deploy window.

### Shipped
| Area | What |
|------|------|
| Childhood 0–5 (+ realm kids) | 15 new `x_child_*` events (HF + GM/TR/SW/EM) |
| Elder 50–160 / long-life | 12 `x_elder_*` (incl. elf/dwarf century tea + standing stone) |
| Cook / weaver depth | 8 cook + 8 weaver career-gated events; mid ranks **Line Cook** / **Journeyman Weaver** |
| Adult RNG floor | `drawEvents`: ages 18–79 guarantee ≥1 non-combat event if year drew none; ages 0–5 soft childhood floor |
| Death-cause variety | 21 causes in `terms.causes` + `pickDeathCause()` for old/illness/violent/odd |
| path@11 | Life/Skills path cards urgent ages 10–13; toast at 8 & 11; journal nudge at cage 11; still choosable after 16 |
| Prior polish | ownership `own_*` 27, jail, scout, court spam, cage stage, etc. kept |

### Pack / smoke / live
- Expansion **225** (was 169; +56 depth). Pool **350** (89+225+36).
- Smoke: **PASS** (`distinctEvents` 239/350; cook+weaver careers appear in runs)
- Deploy commit: **22638063** on paige-site main
- Live: https://paigegames.net/boundwake/
- Lifeline untouched

### Still thinner (not blockers)
- Beastkin-specific childhood; workshop-per-type events; promo-line uniqueness across all ladders
