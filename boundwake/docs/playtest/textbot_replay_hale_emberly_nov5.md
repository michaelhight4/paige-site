# Boundwake replay log — Text Bot (pass 2, fresh life)
**Date:** Nov 5, 2026 ~5:25 PM CT  
**Build:** https://paigegames.net/boundwake/ (Coder noted 218c9eec expansion 225 mid-run — some prior fixes may land after ages 0–19)  
**Life:** Hale Emberly — Human boy, wind, Spark-born · ages **0→21** · no event skips  
**Founded:** Emberly Circle @16 (Spellcraft 19), 4 hires, realm meet entered · guild hall @18 + 1 adventurer hire

Viewport note: ages 0–19 at browser default ~1920×1113; ages 20–21 forced **1280×800** for layout checks.

## NEW issues

### Medium
1. **Baby magic bypass (age 0)**  
   Did: Age 0 → Gale Script → Practice magic.  
   Got: Spellcraft 0→4, Mana Control 0→2, Elementalism 0→3 while individual Train buttons said “Too young to force the spark (age 6+).”  
   Expected: Same age gate on Practice magic as Train.  
   Shot: `/workspace/boundwake-replay/age0-magic-gate.png`

2. **Skills tab crushed @1280×800**  
   Did: Skills @20 at 1280×800.  
   Got: Intro sections = thin strips; categories show header/sliver only; training controls hidden.  
   Expected: Readable scrollable skill UI (same class of bug as Work crush).  
   Shot: `/workspace/boundwake-replay/age20-skills-1280x800.png`

3. **False tournament eligibility copy after entry**  
   Did: Entered Spark Meet @3 and @21 (Spellcraft 31 @21).  
   Got: Panel still “no meet matches your trained skills yet” + train advice.  
   Expected: Already entered / no remaining meets — not an eligibility miss.  
   Shot: `/workspace/boundwake-replay/age21-false-tournament-gate-1280x800.png`

### Still seen on this run (may predate 218c9eec)
- Work workshops/guild hall still crushed @1280 (`age20-work-crushed.png`) — Coder claimed fixed live; please re-verify on 218c9eec hard refresh.
- Jail still dropped Farmhand @10; journal “sentenced to 1 years” / “released after 1 years.”
- Duplicate healer controls; journal debug “pool tier 0.”
- Belongings team copy still “age 16+” only (omit skill/cost); founding worked @16 with Spellcraft 19 / others need 15+.

### Fixed / working this run
- Notice-board **Post enabled and worked** (+11 readers).
- Adventure locked in jail @10, unlocked after release @11.
- Human occupation path: Student → Pupil → Initiate (no stuck Child).

### Not rechecked
Elf lifespan, “No ● fire” chip, 6-month sentence fmt, death `{heir_name}` (did not die).
