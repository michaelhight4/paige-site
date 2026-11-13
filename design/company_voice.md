# Company voice: Revival Tech comms line (design v1, Oct 23 2026)

Status: built, **DEFAULT ON for the region 1 release** (Gary 12:45 PM CT Oct 23 2026: "Yes, ship RITA in region 1"); `?cv=0` turns it off (nothing fetched, no strip, no Options row). Release scope: `data/company_voice.json` `"maxRegion": 1` (see "Region 1 release scope" below). Code: `src/systems/company_voice.js`, data: `data/company_voice.json`, employee number: `src/systems/employee_id.js`, lines: Text Bot keys `system_company_voice.*` (brief: `data/textbot_requests_company_voice.md`), tests: `tests/company_voice.test.mjs`, shots: `tests/company_voice_shots.mjs` -> `shots/company_voice/`.

Gary, Oct 23 2026 (CT):
- 12:19 PM: "also we could refrence the way satisfactory does their employee model in game, and how the ai jumps in to talk to you when youve completed or discovered something"
- 12:20 PM: "its sarcastic and makes sure you know youre just a number, always calling you by your empoloyee id"
- 12:21 PM: "Good job 001893! New creatures help boost company asset value!"
- 12:22 PM: "the ai needs to be inheritly sarcastic and all they care about is how your discovery boost company asset values"

**Reference = structure only.** We borrow the *shape* (an employer that ranks you, unlocks tied to milestones, a company voice that cuts in when you finish or find something). No names, lines, art, voice or catchphrases from that game; no ADA / FICSIT or look-alikes. Our company is Revival Tech (RT), already in the game.

## 1. Tone (the one rule everything follows)

- **Inherently sarcastic.** Hollow upbeat corporate cheer is the base of every line.
- **Only cares about company asset value.** Creatures are assets; areas are land on the asset map; wins keep assets "looking pricey". The player's achievement is never praised for its own sake.
- **You are a number.** It always calls the player by the bare 6-digit employee number (`{employee_id}`, e.g. `001893`). Never the name.
- **PG.** Sarcastic, not mean. Gary's line is the yardstick: "Good job 001893! New creatures help boost company asset value!"

## 2. What already exists (inventory)

| Piece | Where | Notes |
|---|---|---|
| Revival Tech, the player as a new hire | intro.js (office manager -> `flg_promoted` -> lab -> `got_starter` -> test run -> `job_briefed`), Ron's morning briefing | the employer frame is already the game's premise |
| Company phone | system_phone (Team, Pack, Kilindex, Tasks, Map, Contacts, "File today's report", Options) | `task_done`: "Task done: {task}. Payment pending. Good work." |
| Company inbox | 31 `company_inbox` emails, flag-gated; read on company terminals (heal_brookhollow, heal_fernwick) and the house PC (`openInbox()`) | HR restructure, cake Fridays, the payroll phish, Director's congratulations on all badges |
| Employee ID level + Benefits Board | save `company` block {idLevel, pointsFree, board{node:rank}, respecWeek, transfers, perkClaims} | **nothing raises idLevel or buys nodes yet** (no UI, no earning) |
| ID level perks (read today) | L2 staff discount (shop.js), L3 extra archive boxes (`archiveExtraAtIdLevel`), L4 weekly Hush Spray | lines: system_shop.staff_discount, system_heal.extra_boxes, system_wild.spray_perk |
| Board consumers | shop `store_discount` rank 0-3; `crystal_grade` ranks I-III (crystal_grades.js) | |
| Kilindex company milestones | system_kilindex.milestone "Company milestone: {caught} registered. Bonus on your next payslip." + rating tiers | |
| Area signs, quests, evolution | area_sign.js, quests.js (50 quests), evolution.js | the voice listens to their log entries |

## 3. How the model maps (structure from the reference, our content)

| Reference structure | Kilumen |
|---|---|
| Employer that ranks you | Revival Tech; **Employee ID level** = clearance tier (L1 new hire ... L5, count/pacing = question for Gary) |
| Tier unlocks | ID level perks: L2 staff discount, L3 archive boxes, L4 weekly spray (existing); L5+ open |
| Milestones you choose / buy | **Benefits Board** nodes bought with points (`pointsFree`); ranks feed shop discount and crystal grades |
| Where progress comes from | proposal (needs Gary): ID level from Masters beaten + Kilindex company milestones; board points from ID level ups and main quests. Nothing earns them in code today |
| Company paperwork | Tasks (quests), "File today's report", company inbox |
| The AI that cuts in | **RT comms line** on the phone (this system): short pop-up on completions / discoveries, sarcastic, asset-obsessed, calls you by number |

## 4. The assistant

An in-world comms device: Revival Tech pushes a message to the work phone. 1-2 short pages (2 lines x 40 chars each). Speaker tag "RITA" (Resource Inventory and Tracking Assistant; Gary 12:27 PM CT Oct 23 2026; Text Bot key `system_company_voice.speaker`).

### Events

| Event | Fires when | Tier | Prio | Once | Own cooldown |
|---|---|---|---|---|---|
| first_catch | first wild capture | milestone | 70 | per save | - |
| kilindex_new | Kilindex count 2, 3, 4 (the first few; 1 = starter) | full | 30 | per count | 60 s |
| kilindex_milestone | region 1: count 5, 10, 15 (`counts_by_region`; 25+ kept in data for later regions). Text: `kilindex_milestone_<count>` (+ its _2.._N) when it exists, else generic `kilindex_milestone` with {count} | milestone | 60 | per count | - |
| area_new | first area sign per map | full | 20 | per map | 45 s |
| first_evolution | first evolution | milestone | 65 | per save | - |
| trainer_first_win | first trainer battle won | full | 40 | per save | - |
| rival_beaten | each `beat_rival_ron_<n>` | full | 50 | per fight | - |
| master_beaten | each `beat_master_<town>` | milestone | 90 | per Master | - |
| id_level_up | company.idLevel goes up | milestone | 100 | per level | - |
| board_node | a board node rank goes up | milestone | 80 | per node rank | - |
| quest_done | `q_<id>_done` (main quests count as milestone); region 1: only `mq_brookhollow_promotion` (`keys_by_region`), closed by `got_starter` (`done_on_flag`; the quest prototype is off by default) | full / milestone | 45 | per quest | 30 s |

All of it lives in `data/company_voice.json` (tiers, priorities, counts, cooldowns, timings); no numbers in code.

### Region 1 release scope (Oct 23 2026)

Gary 12:4x PM CT: "we could in theory add maybe 10 lines of RITA to the region one ?", then "Yes, ship RITA in region 1" (12:45 PM CT). So RITA only speaks about things a region 1 player can reach:
starter / promotion task, first catch, new Kilindex logs (2-4), Kilindex 5 / 10 / 15, arriving on Trail 1 and in Fernwick (other maps: generic `area_new`), first trainer win, beating Ron (fight 1), beating Master 1 (Fernwick). `first_evolution` stays allowed (grind-only in region 1). `id_level_up` / `board_node` stay wired but nothing raises them yet.

- `maxRegion` (number; absent / null = whole game): any Text Bot line tagged `"region": N` with N > maxRegion is never used; a specific key above the cap falls back to the generic key of the same family (e.g. a region 2 `area_new_<map>` -> generic `area_new`).
- `kilindex_milestone.counts_by_region` picks the active counts (region 1: 5, 10, 15); `quest_done.keys_by_region` limits which quests speak (region 1: the promotion task only).
- Portrait: scientist stand-in (`art/ui/company_voice/rt_comms_64.png` does not exist yet; when it lands, point `speaker.portrait` at it).

### How events are detected (no edits to other systems)

The module observes: `scene.log` entries (`areaSign`, `evolve`, `battle`, `flag`), a wrap of `systems.applyBattleResult` (capture), and a per-tick diff of Kilindex count / company idLevel / board ranks (first look = baseline, so loading a save never fires a backlog). Nothing fires before `got_starter` (the opening owns that stretch).

## 5. Rate limiting

- **Burst**: events within 1.5 s are one burst; **max 1 message per burst**, highest priority wins, the rest are dropped (a catch that is also Kilindex #2 = one message).
- **Global cooldown**: 20 s from the last hide to the next show.
- **Queue**: max 3 (lowest priority dropped); items older than 90 s are dropped.
- **Once-keys** are written to `scene.seen` (saved) when the event is accepted, so nothing repeats after a reload; Off mode does not burn them.
- **Never during** scripts (battles, trainer talk, cutscenes), dialogue, fades, the intro picker, evolution, the phone/battle UI, or any save lock (trainer walk-up etc.). If one starts while a message is up, it hides at once.

## 6. Saving

`scene.checkpoint('company_voice')` runs right before a message shows (so the once-marker is saved). While it is up a save guard `company_voice` refuses saves (autosave, pagehide, checkpoints); `_dirty` stays set and the normal autosave runs the moment it hides. No save ever lands mid-message.

## 7. Settings

Options > **Company voice: Full / Milestones only / Off** (localStorage `kilumen.companyVoice.v1`, default Full once the feature is on). Milestones only = milestone-tier events. Off clears the queue and hides any message. The row exists unless the feature is turned off with `?cv=0` (on by default since Oct 23 2026, region 1 release).

## 8. Layout

Small strip top-right under the clock/Menu: 56 px portrait (40 px on phone) + speaker tag + one page of text, max min(44vw, 560 px), 52vw on phone. It never blocks movement (the player keeps walking; verified in the shots run), does not cover the area sign (top-left), toast (bottom-centre) or touchpad (bottom). Dismiss: A / F (eaten, so it never also starts a talk), or tap/click the strip. Auto-hides: ~3.2 s + 30 ms/char per page. Slides in (.22 s), no motion with reduced-motion. `role=status`, `aria-live=polite`.

Portrait: placeholder `art/characters/pixel/npcs/tr_scientist_m/portraits/tr_scientist_m_neutral.png`. Art request below.

## 9. Employee number

- 6 digits, zero-padded, no prefix (e.g. `001893`), never `000000`.
- Stored in the save: `company.employeeId`. New game: derived from the per-save `saveId` (FNV-1a). Old saves without one get the same derived number on load (`normalise`), so it is stable across save/load and re-loads.
- Text var `{employee_id}` is global (overworld `textVars`), so emails and other lines can use it too.

## 10. Art request (Character models / Animator)

RT comms portrait: 64x64 pixel icon, Kilumen palette, dark-brown outline, readable at 40 px. A company comms device/screen face (a phone screen with a simple corporate "face" or the RT logo), **not a person**, nothing that resembles the reference game's assistant. Optional 2-frame "talking" blink. Deliver to `art/ui/company_voice/rt_comms_64.png`; then change `speaker.portrait` in data/company_voice.json.

## 11. Open questions for Gary

1. ~~Name~~ answered: RITA (Resource Inventory and Tracking Assistant).
2. Employee number: random-per-save (current) or a fixed number for everyone (e.g. his 001893)?
3. How many ID levels (L1-L5?) and their pacing; what raises the ID level (Masters? Kilindex milestones? days worked?).
4. Where Benefits Board points come from (ID level ups, main quests, Kilindex milestones?).
5. With the voice on, should it replace the existing `system_kilindex.new_entry` / `milestone` toasts, or play alongside?
6. ~~Ship or keep behind a flag~~ answered 12:45 PM CT Oct 23 2026: ship in region 1, default ON (Full), ~10 region 1 moments. Still open: whether Milestones only should become the default later.
7. Should company inbox emails also use `{employee_id}` (HR addressing you by number)?
