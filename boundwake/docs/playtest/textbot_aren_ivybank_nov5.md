# Boundwake playtest log — Text Bot
**Date:** Nov 5, 2026 (~4:45 PM CT)  
**Build:** live https://paigegames.net/boundwake/  
**Character:** Aren Ivybank — Dwarf, earth affinity, Silver Tongue  
**Ages played:** 0 → 19 (~60 interactions; every reachable system used; no skips)

## What was exercised
- Life: Journal, Rest, Ailments/healer, Pastimes (Song & Lute → Hearth Choir), Choose Your Path (sword @10), Realm Law (Shadow), Pilfer → Youth Hold
- Work: 25 openings; Farmhand → Copper Adventurer; Workshops (Herb Stall); Adventure guild hall; Court & moot; Mentors (Sword Path); Circles & patronage (Hearth Choir)
- Adventure: Set out (odds on choices); party (Fen); Trail Meet tournament @12; Tournament Team panel @17 (skill 20 + 80g gate)
- Skills / Bonds / Realms / Belongings (gear shop buy+equip Hearthkeeper Charm; Relics empty; Notice boards; Guild/Workshop/Tournament team panels)

### Events sampled (~14)
First Word; Stick and Dignity; broken cup; Fever Season; Broken Watch; Eyes in the Dark; Which Way the Blade; Lantern Quay Song-Circle; Missing Trail Stakes; Pressed to See a Healer; A Friend's Empty Purse; The House Divides; Ask for Better Pay; Too-Perfect Offer; Letters Merit exam @19 (left open: Sit practical 36% / Offer letter / Walk away)

## Bugs / broken flows (repro → result → expected)

1. **Jail does not lock actions**  
   Did: Jailed Youth Hold @10 → Adventure Set out, Work, Realms still usable.  
   Got: Full adventure event while jailed ("Eyes in the Dark").  
   Expected: Adventure/Work/Realms blocked or jail-specific actions only.

2. **Occupation label wrong**  
   Did: Age to 16–17 with sibling Kaela (16) and self after Student years.  
   Got: Kaela occupation "Child"; self "Child" @17 with no job (was Student).  
   Expected: Age-appropriate occupation (Student / sibling role).

3. **Stray toast**  
   Did: Clicks around Join after an event closed @17.  
   Got: "I was too young for that job. I tried anyway." with unclear trigger.  
   Expected: Toast only when Join is actually pressed, or no false fire.

4. **Copy mismatch**  
   Did: Event "Pressed to See a Healer" → Promise later.  
   Got: Toast "Later became a hobby."  
   Expected: Toast matching the choice (promise later / illness follow-up).

5. **Tournament panel stale copy**  
   Did: Open Tournament @15–17.  
   Got: @15 still "Tournament year · bracket 8–15" then "Train a competing skill" with no entry; @17 "Lists open next year".  
   Expected: Clear current bracket eligibility and next open year.

6. **Unexplained gates**  
   Did: Bonds "Make a friend"; shop items needing realm.  
   Got: Friend button disabled, no tooltip; shop "Realm not found" instead of realm name.  
   Expected: Tooltip / named realm requirement.

7. **Raw design / debug strings in Work**  
   Did: Open Work panels.  
   Got: Visible text like `flag \`mana_awakened\`; academy at 10` and "Needs noble birth or a mentor sponsor".  
   Expected: Player-facing copy only.

8. **Work tab layout clip @18+**  
   Did: Open Work with Copper Adventurer + Workshops + Herb Stall.  
   Got: Header cut off; panels cramped/overlapping.  
   Expected: Readable stacked layout.

9. **Stale death save on load**  
   Did: Open URL fresh.  
   Got: "You died. Continue / Skip" from prior save before new life.  
   Expected: Clean start or clear continue prompt.

10. **Event modal ignores synthetic clicks**  
    Did: Playwright / mouse.click on event choices.  
    Got: Hang / no response; only real Computer mouse clicks worked.  
    Expected: Normal click handlers (hurts automated smoke tests).

## Thin / missing polish (friction)

- Event & tournament outcomes = one line ("Place: 5. Purse: 2 gold, renown +1") — no rounds, rivals, named NPCs, no shown stat/bond deltas.
- Bonds = bare closeness; hits 100 ~age 12 then idle; parents have no dialogue/memory; "Make a friend" disabled while events say "a friend".
- Adventure = one popup/click; no travel map, combat view, loot, delves/graves despite Relics copy.
- Guild hall / workshop / court / mentors / circles: toast + bare panel (Roster 0/6, Hire 30g); Campaign / Mentor drill no visible effect; jobs resolve only on Age +1 with no report.
- Codex = titles only ("Broken Watch"), no lore body; some years (e.g. Age 2) empty journal.
- Trait (Silver Tongue) never surfaced in events; "A Friend's Empty Purse" with no friends.
- Ailments (Whistle Cough) sat 2 years with no tooltip/effect/cure choice.
- Youth Hold: only Behave / Appeal / Escape — no cell events, cellmates, school consequence.
- Gear: skill bonuses only; no compare, no adventure feedback.
- Notice boards: Readers 0 · posts 0; Post mostly disabled.
- Pastimes = meter number, no payoff; Realm visits = flat list; age-0 only Rest; music = toggle only.

## Not tested
Adult Realms travel, other races, Iron Adventurer promo, Age +1 hall/workshop income after open.

## Screenshots (box)
Under agent assets store (fate card, age 0, realms @7, path/law, prison, Eyes in the Dark while jailed, Trail Meet entry+result, Tournament Team gates, Work @18 cramped, hall/court/circles).
