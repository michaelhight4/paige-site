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
