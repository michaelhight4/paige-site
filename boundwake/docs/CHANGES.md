## Ads + gamepasses scaffolding — Nov 5 ~7:45 PM CT (Gary)

- Catalog: `data_fantasy/premium.json` (14 passes + Realm Pass) + `ads.json`
- Modules: premium / premium_fx / ads / adapter_ads / payments / native_bridge
- UI: **Passes** tab + Life shortcut; Buy stub (dev grant localhost/`?devpass=1` only; live = coming soon)
- Autopilot gated by pass; **web alpha still free** (`alpha.webFreePasses`)
- No Ads suppresses forced ads (android/ios platform); web forced off
- Docs: PASS_MAP.md, ITCH_DLC.md, STORE_PUSH checklist; Lifeline untouched
- Cache: `?v=passes1`
- Stub: Play/Apple/itch product IDs + AdMob — Gary console create next

## Live — **PENDING** passes scaffolding · https://paigegames.net/boundwake/

## Live — **a48e449e** all-tabs scroll fix · https://paigegames.net/boundwake/

## 2026-11-05 ~6:53 PM CT — All tall tabs scroll
- Gary: Belongings, Work, Skills, Realms unusable without scroll
- Shared flex-shrink + overflow:hidden clip; play-body now scrolls

## Live — **f6edd14f** Legacy accordion + row info · https://paigegames.net/boundwake/

## 2026-11-05 ~6:35 PM CT — Legacy collapsible + Life Goal/Achievement info
- Collapsible Life Goals + Achievements (default collapsed; Achievements above fold)
- Row click/hover shows desc / progress / reward via info panel + hover tip
- info.js: stop matching `body[data-tab]` in chip/legacy exclusions
- Cache-bust legacyacc2

## Live — **f1bdc0c1** Legacy accordion · https://paigegames.net/boundwake/

## 2026-11-05 ~6:27 PM CT — Legacy Life Goals / Achievements collapsible
- Gary: Life Goals not collapsible → had to scroll past all 48 to find Achievements
- `<details class="legacy-acc card panel-legacy">` for Life Goals + Achievements; chevron affordance; header counts + ready
- Default both collapsed (Achievements above fold); `sessionStorage bw.ui.legacyAcc` persists open state
- Contrast polish targets `.legacy-acc-body` / `[data-kind=ach]`; plum columns untouched
- Smoke: expand/collapse, Claim All visible when open, Age +1 → 2, state restores across tab switch

## Live — **0289a75e** contrast HARD v3 · https://paigegames.net/boundwake/

## 2026-11-05 ~6:25 PM CT — Contrast HARD v3 (Life Goals colors)
- Drop-in contrast_polish.css HARD v3: colored Legacy tiles (not cream-on-cream)
- Hard plum columns kept `#221a34`→`#140e1f`

## Live — **3b421b00** desktop contrast polish · https://paigegames.net/boundwake/

## 2026-11-05 ~6:20 PM CT — Desktop contrast polish
- Merge plum night columns + opaque parchment plates into style.css; link contrast_polish.css
- No Age/Skip regression

## Live — **f69b7ac1** P1 body[data-tab] click steal hotfix · https://paigegames.net/boundwake/

## HOTFIX P1 — Age/Skip/Rest clicks stolen by body[data-tab] — Coder Nov 5 ~6:12 PM CT
- Root cause: `closest('[data-tab]')` matched `body[data-tab]` from setChrome; every Age/Skip/Rest re-rendered Life and returned before `data-a`
- Fix: tab delegation only `button[data-tab], a[data-tab], .flare[data-tab]`
- Engine ageUp was fine; UI path blocked

## Live — **532c1717** WD Legacy merge + motion · https://paigegames.net/boundwake/

## 2026-11-05 ~6:10 PM CT — WD Legacy merge + Animator motion
- legacy.json 48 goals / 28 achs (additive WD); progress wiring; market heralds ×16; Codex shelves
- legacy_motion.css + hooks; Autopilot age smoke still PASS

## Live — **bb825ef5** Legacy motion · https://paigegames.net/boundwake/

## 2026-11-05 ~6:05 PM CT — Animator Legacy motion
- Wire `legacy_motion.css` + LEGACY_HOOKS.md classes in ui.js / index.html
- Smoke PASS (cage 0→2 + claim); deploy paige-site

## Live — **f56882ee** Legacy + Autopilot hotfix · https://paigegames.net/boundwake/

## 2026-11-05 ~5:55 PM CT — Legacy Goals/Achievements + Autopilot P1/P3
- Fix: Age +1 / Skip no-op at age 0 (missing Legacy helpers mid-ageUp)
- Fix: Autopilot / Skip card body blank on desktop (flex collapse)
- Add: Legacy tab — 34 Life Goals, 20 Achievements, Claim/Claim All, permanent mods panel
- Add: `legacy.json` OPTIONAL pack; `meta.legacy` persistence
- Codex: category filters + ??? locked + completion ratios
- Smoke PASS (dwarf cage 0→1→2; claims)

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

## Text Bot 75-event merge (Nov 5 ~4:38 PM CT)

## 2026-11-05 Text Bot replay fold-in (Work crush + MED)
- Work tab @≥1024: `.work-acc` / cards `flex:0 0 auto` so guild hall + workshops no longer crush to ~10px bars; workshops accordion opens when any owned (Herb Stall visible after jail/unemployment).
- Notices Post: gate on **cage** (not hage) + show lock reason (Age / actions / prison).
- Jail: job drop warns in journal + sentence toast; `fmtSentence` unifies months/years (no more 0.5 years / 1 years).
- Guild hall: last-year vs lifetime jobs copy; handoff only age 50+.
- Team: Belongings + Adventure copy both say age 16+, affinity skill 15+, 80g+1 act.
- Make a friend: always-on title/aria tip + visible tip line.
- Ownership tease/founding ages widened + realm tags stripped from teasers for discoverability (own_* still live).
- Deferred depth pack (elder/child/cook-weaver, death causes, adult RNG floor, path@11) remains in this deploy window.
- Appended 75 draft events into `data_fantasy/events_expansion.json` (67→142). Pack pool 192→267. Smoke PASS.

## Patronage grants apply (Nov 5 ~4:00 PM CT)
- list/apply/year APIs + Work tab grants section; pack_polish.css linked.
## Playtest polish (local, no push) Nov 5 ~4:55 PM CT
- Ownership beats own_a*/own_b* (27) merged from docs/events_draft/ownership_beats_ab.json → events_expansion.json (169).
- Engine/UI blockers: heir_name, stage/cage, jail locks, ailments/hage, realm tags, guild claim copy, talents UI, disabled choices, team skill 15, favicon, death New life CTA.
- Smoke PASS. Waiting Soccer Rpg v2 before paige-site push.

## Playtest polish deploy (Nov 5 ~5:05 PM CT)
- Soccer v2: court term spam, Stall Hand age copy, Adventure tab shortcut, friend lock-why, realm Scout, Restless Feet exploration weight, favicon.
- Includes ownership beats + prior Story/Text blockers. Smoke PASS. Deployed to paige-site Boundwake.

## Depth pack “want it all” (Nov 5 ~5:20 PM CT)
- +56 events (child/elder/cook/weaver/adult floor fillers) → expansion 225, pool 350.
- Death causes 21 + pickDeathCause; adult/child draw floors; path@11 UI+toast; cook/weaver mid ranks.
- Smoke PASS. Deployed paige-site Boundwake.
