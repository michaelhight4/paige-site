# Boundwake replay log — Text Bot (pass 1)
**Date:** Nov 5, 2026 ~5:13 PM CT  
**Build:** https://paigegames.net/boundwake/  
**Life:** Continued Aren Ivybank (Dwarf) ages **19→24** (~25 interactions). Fresh life not available on load (no race select). Pass 2 in progress for new life.

## Prior issues status
| Issue | Status |
|-------|--------|
| Jail unlock (act while imprisoned) | **FIXED** — Work/Adventure show locked while imprisoned |
| Occupation stuck "Child" | Not rechecked (header showed Copper Adventurer / No work) |
| Toast/copy mismatches | **STILL** — jail months/years; contextless toasts |
| Make a friend no tooltip | **STILL** (panel hint exists; no per-button tip) |
| Shop "Realm not found" | Not rechecked |
| Debug strings in Work | Not seen this pass |
| Work layout clip @18+ | **STILL / worse** — see High below |
| Stale "You died" cold open | Not seen (opened into event @19) |
| Event modals ignore script clicks | **STILL** |
| Thin tournament/bonds/adventure/guild | **STILL** |

## NEW issues

### High
1. **Work tab guild/workshop panels crushed**  
   Did: Work @1280×800 ages 19–24.  
   Got: Adventure guild hall = banner thumbnail only; roster/fees/hire ~10px bars (Hire only via script). Herb Stall section invisible despite "Workshops & stalls · 1 owned".  
   Expected: Visible usable guild + workshop controls.

### Medium
2. **Notice-board Post all disabled, no reason** — Readers 0 · posts 0, no tooltip.  
3. **Jail silently drops job** — Copper Adventurer → journal "I left my post" → "No work" through 24; no pre-crime warning.  
4. **Jail copy math** — toast "6 months" / panel "0.5 years" / next Age journal "released after 1 years" (plural). Behave → "guards noticed", no conduct gain shown.  
5. **Guild UI confusion** — "stage founding … renown 0"; Belongings lag after hire; "0 jobs done, 2 failed" then "2 done" with 1 hire; handoff auto-assigned hire as apprentice.  
6. **No yearly ownership events** — Herb Stall flat gold lines only; team founding copy mismatch (Belongings "age 16+" vs Adventure skill 15+/20 + 80g).

### Low
7. Event chip glitch: "No fire" → "No ● fire".  
8. Imprisoned panel overlaps Ailments; clips healer.  
9. Duplicate healer CTAs (Ailments + Body & Care) when no ailments.  
10. Contextless flavour/toasts with no deltas.  
11. Possible Fever Season repeat (unconfirmed).  
12. Vague Skills Pillars copy.  
13. Guild Hire → toast only; Release has no confirm.

## Not tested (pass 1)
Fresh race, death/`{heir_name}`, Adventure Set out post-jail, tournament entry, patronage, Appeal/Escape, Make a friend, realm visits, gear buy.
