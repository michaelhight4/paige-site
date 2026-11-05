# Boundwake — Long-life (elf/dwarf) + cross team↔guild beats

**Status:** DRAFT outline for Text Bot / Coder — aligns to Gary locks already stamped in `tournament_team_and_guild_hall_story_beats.md` (Nov 5, 2026 ~3:26 PM CT: long-life **IN** v1; cross bonuses **ON** v1).  
**Do not invent extra Gary-approval wording beyond that lock table.**  
**Extends** Text Bot dialogue in `docs/events_draft/tournament_guild_scene_dialogue.md` — do not contradict those scenes; add missing beats/seeds only.  
**Mechanics source of truth for cross numbers:** `docs/CROSS_BONUSES.md` (Game Dev). This file is story/NPC flavor + flags.

---

## Race / age notes (Boundwake)

| Race | Lifespan | Growth | Notes for these beats |
|------|----------|--------|------------------------|
| human | 90 | 1.0 | Skip century / multi-heir long-life suite |
| elf | 600 | 0.75 | Full long-life suite |
| dwarf | 250 | 0.9 | Full long-life suite (shorter than elf; still hits century+) |
| beastkin | 80 | 1.0 | Skip century suite (same spirit as human) |

- Player age gates for founding stay **calendar** `cage` (team 16+, hall 18+) for every race.  
- Event pool ages also use **cage** (`bw_engine.matches`).  
- Portrait/elder feel uses **hage**; stage elder ≈ hage ≥ 60.  
- Practical exclusive window for century-scale events: ages **[100, 400]** (humans/beastkin rarely/never reach). Mid long-life can use **[45, 220]** with `tags: ["longlife"]` — Coder should add `if.race: ["elf","dwarf"]` when that key exists.

---

## A. Long-life beat outline (optional gates)

Arc add-on for elf/dwarf owners (after or beside standard founding→proven→renowned→legacy):

`Late patience → Multi-gen rivalry → Second renown crest → Century mark → Quiet late work → Second handoff`

| # | Beat id | Track | When (cage soft) | Who | Emotion | Outcomes | Flags / choice points | Text Bot scene |
|---|---------|-------|------------------|-----|---------|----------|----------------------|----------------|
| L1 | `ll_team_late_found` | Team | 35–120; not yet founded | Clerk of Meets | Patient steel | Found now / wait again / walk forever | `team.lateFound`, `cp_ll_team_late_found` | **NEW** `seed_ll_team_late_found` |
| L2 | `ll_guild_late_found` | Guild | 40–120; not yet founded | Realm clerk + landlord | Slow keys | Found / delay / walk | `guild.lateFound`, `cp_ll_guild_late_found` | **NEW** `seed_ll_guild_late_found` |
| L3 | `ll_team_multigen_rival` | Team | 50–200; rival existed | Rival heir / captain of rival line | Old spark, new face | Respect line / renew feud / retire the quarrel | `team.rivalGen`, `cp_ll_team_rival_gen` | **NEW** `seed_ll_team_multigen_rival` |
| L4 | `ll_guild_multigen_rival` | Guild | 50–200 | Rival hall-master’s successor | Cordial blade | Fair districts / undercut / walk | `guild.rivalGen`, `cp_ll_guild_rival_gen` | **NEW** `seed_ll_guild_multigen_rival` |
| L5 | `ll_team_second_crest` | Team | 55–220; renown was ≥50 once, dipped or plateaued | Chronicler / triennial herald | Second wind | Chase crest / stay quiet / hand captaincy | `team.secondCrest`, `cp_ll_team_crest` | **NEW** `seed_ll_team_second_crest` |
| L6 | `ll_guild_second_crest` | Guild | 55–220 | Broker + senior roster | Steady ambition | Push board / keep small / mentor only | `guild.secondCrest`, `cp_ll_guild_crest` | **NEW** `seed_ll_guild_second_crest` |
| L7 | `ll_team_longlife_heirs` | Team | 90–350; prior handoff or decades owned | Second/third heir or captain | Soft centuries | Name next / captain one more cycle / dissolve + tea toast | `team.handoffCount`, `cp_team_ll_heirs` | **Exists:** `seed_team_longlife_heirs` |
| L8 | `ll_guild_century_banquet` | Guild | 100–400; hall age ~100 yrs or owner cage≥100 with hall | Senior roster + optional clerk | Warm wonder | Host / quiet Codex / charity at feast | `guild.centuryMarked`, `cp_guild_century` | **Exists:** `seed_guild_century_banquet` |
| L9 | `ll_guild_quiet_late` | Guild | 80–300; renowned or proven | Everyday client | Soft dusk | Take quiet job / refuse / send junior only | `guild.quietLate`, `cp_ll_guild_quiet` | **NEW** `seed_ll_guild_quiet_late` |
| L10 | `ll_team_academy_mark` | Team | 100–400; Spireward/Emberlight link optional | Drill-hall tutor or Primer elder | Reflective pride | Guest drill / endow lesson / decline fame | `team.academyMark`, `cp_ll_team_academy` | **NEW** `seed_ll_team_academy_mark` |

Soft-fail / walk-away always allowed. No forced century content.

---

## B. Cross team↔guild bonus flavor (v1 ON)

Owning **both** in one life. Numbers stay in `CROSS_BONUSES.md`. Story shows *why* the edge exists.

| # | Beat id | Flavor hook | Maps to CROSS_BONUSES | Speakers | Outcomes | Flags | Text Bot scene |
|---|---------|-------------|----------------------|----------|----------|-------|----------------|
| C1 | `cross_team_feeds_guild` | Meet banner unlocks patronage board job | Team→guild hire/jobs edge; patronage flavor | Hall broker + you | Take job / keep separate / liaison | `cross.teamFeedsGuild` | **Exists:** `seed_cross_team_feeds_guild` |
| C2 | `cross_guild_heals_team` | Hall healer contact shortens team downtime | Guild→team meet edge (support fantasy) | Healer contact + injured teammate | Call healer / tough out / pay from team purse | `cross.guildHealsTeam` | **Exists:** `seed_cross_guild_heals_team` |
| C3 | `cross_shared_scouts` | Same scouts watch boards and meet lists | Soft +1 info; suggest flag only | Scout / notice-board keeper | Share scouts / hire separate / skip | `cross.sharedScouts` | **NEW** `seed_cross_shared_scouts` |
| C4 | `cross_meetday_contracts` | Meet-day clients post hall jobs in the same Visit | Board soft-cap / same-realm +1 power fantasy | Meet judge clerk + hall runner | Open dual desk / meets only / hall only | `cross.meetdayContracts` | **NEW** `seed_cross_meetday_contracts` |
| C5 | `cross_hall_sponsors_team` | Hall coffer sponsors entry / banners | Guild renown ≥25/50 → team power table | Hall-master (you) + team captain voice | Sponsor / refuse / sponsor once | `cross.hallSponsorsTeam` | **NEW** `seed_cross_hall_sponsors_team` |
| C6 | `cross_rival_pressure_doubles` | Rival team line + rival hall squeeze together | No extra power; stress/choice pressure | Rival captain + rival hall-master | Face both / buy peace one side / walk a track | `cross.rivalDoubled` | **NEW** `seed_cross_rival_pressure` |
| C7 | `cross_twin_banners` | Both renowned ≥50 — yearly twin pulse | Both renowned: +1/+1 renown once/year | Chronicler / festival voice | Accept toast (tea/lamps) / stay quiet | `cross.twinBanners` | **NEW** `seed_cross_twin_banners` |

Suggested Coder flags (enable when `s.team && s.guild`):  
`cross.teamFeedsGuild`, `cross.guildHealsTeam`, `cross.sharedScouts`, `cross.meetdayContracts`, `cross.hallSponsorsTeam`, `cross.rivalDoubled`, `cross.twinBanners`.

---

## C. Text Bot — scene seeds (missing only)

Format: `id | speakers | beat | tone | choices`  
Full lines for covered seeds live in `tournament_guild_scene_dialogue.md`.

### Long-life (new)
1. `seed_ll_team_late_found` | **Clerk of Meets** | L1 | Dry patience | Register after all these years / Come back another decade / Never — ink stays blank  
2. `seed_ll_guild_late_found` | **Realm clerk** + **landlord** | L2 | Keys aged with dust | Take the hall now / Delay again / Walk away for good  
3. `seed_ll_team_multigen_rival` | **Rival heir/captain** | L3 | Familiar crest, younger eyes | Respect the line / Renew the feud / End it with a fair meet  
4. `seed_ll_guild_multigen_rival` | **Successor hall-master** | L4 | Map and manners | Keep fair districts / Undercut / Leave town boards  
5. `seed_ll_team_second_crest` | **Chronicler** or **triennial herald** | L5 | Second wind | Chase the crest / Stay quiet / Hand the captain a cycle  
6. `seed_ll_guild_second_crest` | **Broker** + **senior roster** | L6 | Steady ambition | Push the board / Keep the hall small / Mentor juniors only  
7. `seed_ll_guild_quiet_late` | **Everyday client** (herb / watch / caravan) | L9 | Soft dusk | Take the quiet job / Refuse / Send a junior  
8. `seed_ll_team_academy_mark` | **Drill-hall tutor** or **Primer elder** | L10 | Reflective | Guest a drill / Endow a lesson / Decline the fuss  

*(Already drafted by Text Bot — do not rewrite: `seed_team_longlife_heirs`, `seed_guild_century_banquet`.)*

### Cross-bonus (new)
9. `seed_cross_shared_scouts` | **Scout** / board-keeper | C3 | Practical | Share scouts across both doors / Hire separate eyes / Skip  
10. `seed_cross_meetday_contracts` | **Meet clerk** + **hall runner** | C4 | Busy festival day | Run dual desk / Meets only / Hall board only  
11. `seed_cross_hall_sponsors_team` | **You-as-hall** + **team voice** | C5 | Banner pride | Sponsor entry from coffer / Refuse / One meet only  
12. `seed_cross_rival_pressure` | **Rival captain** + **rival hall-master** | C6 | Twin squeeze | Face both / Buy peace on one side / Drop a track  
13. `seed_cross_twin_banners` | **Chronicler** | C7 | Warm lamps, tea toast | Accept twin-banner year / Stay quiet in the Codex  

*(Already drafted: `seed_cross_team_feeds_guild`, `seed_cross_guild_heals_team`.)*

### Drafting rules
- Light fantasy 13+; no alcohol/drugs/tobacco (tea, lamps, bread, forge-glow).  
- Original Boundwake only; hall not gym; healer not nurse.  
- Match existing Text Bot voice: short journals, concrete, BitLife-simple labels.

---

## D. Patch note for story beats doc

`tournament_team_and_guild_hall_story_beats.md` still has a **Cross-track** paragraph that says bonuses OFF — that contradicts its own Gary-lock table (ON). Treat the lock table + this file + `CROSS_BONUSES.md` as correct; Coder/Story should flip that paragraph when editing the parent doc.

---

## Ambiguities (for Gary / Coder / Game Dev)

1. Event `if` has no `race` / `team` / `guild` keys yet — expansion events use ages + tags + optional flags; Coder should gate properly when wiring.  
2. “Hall age 100 years” vs “owner cage ≥100” for century banquet — either OK; prefer hall `foundedYear` span when state exists.  
3. Twin banners toast copy: CROSS_BONUSES says UI toast “Twin banners”; Text Bot may rename.  
4. Whether late-found beats replace A1/B1 or only fire if player refused earlier — recommend: fire if not founded and cage in window.

---

*Story Bot · Nov 5, 2026 CT*
