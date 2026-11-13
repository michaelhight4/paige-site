# Game Quality Checklist (all of Gary's games)

> **Living list (Gary, Oct 22, 2026):** every small catch Gary reports gets added here and hot-checked on each new feature or UI change. When a rule is applied, tell Gary "I applied the rule for this" and name it, so he can ask for a project-specific change.


Version 2, Oct 22, 2026 (CT). One list for every game: Lifeline (life sim), Riftward, the Roblox/UE RPG, and next, **Kilumen**.
- **Tags:** each rule is tagged `[date time CT, agent/project]`. A rule with no `(inferred)` tag is in Gary's own words in that chat.
- **`(inferred)`:** the rule comes from a doc, brief, test file or an agent's write-up, not from a message Gary typed.
- **Sources:** the full sweep notes are in `/workspace/quality/_sweep_notes.md`.

## How to run it
1. Run the whole list before showing Gary a build and before every publish. For a small change, run at least the sections the change touches.
2. Tick a box only with evidence: a screenshot path, a test name with PASS, or an audit file. Mark a rule N/A (with the reason) when it doesn't apply.
3. Phone checks run at 390x844 unless the game targets something else.
4. Fix, re-run, then report: passed, still failing, and the evidence paths. Never report "done" while a failure is left unlisted.
5. **Kilumen** lines apply to creature battlers. Skip them for other genres.

---

## 1. UI/UX & layout
- [ ] Text contrast is high enough in text boxes on ALL style settings/themes. The contrast guard/test (≥4.5:1 text, ≥3:1 muted) is green. [Oct 18 6:24 PM, Coder/Lifeline: "increase the contrast in those text boxes on all style settings"; numbers (inferred) from DEVLOG batch 6]
- [ ] No overlapping numbers or text and no cramped spots at phone size. Long values wrap, shrink or use a short form. [Oct 19 1:23 AM, Coder/Lifeline: "over laying numbers"; Oct 19 1:43 AM death-screen overflow]
- [ ] HUD elements (e.g. the mini map) never cover other menu items and are sized sensibly. [Oct 11 ~7 PM, Game dev/RPG: "mini map is obstructing other menu items and way too big"]
- [ ] UI polish sweep: every main screen and sheet, looking for weak spots (inconsistent cards, empty states, missing icons, unclear buttons). Fix what's lacking. [Oct 21 2:16 AM, Coder: "fixing ui where its lacking"; sweep method (inferred) from QUEUE 11b]
- [ ] Ask "which UI panels are missing or feel incomplete?" and fill the gaps. [Oct 18, World Design/RPG]
- [ ] Layout helps players find every feature: tabs, grouping, and a More menu that hosts every option, not only leftovers. [Oct 18 3:01 AM & 3:05 AM, Coder/Lifeline]
- [ ] Controls are explained: on-screen icons show which key/button opens what, and every menu actually opens. [Oct 10 12:26 PM, Coder/RPG]
- [ ] Onboarding: small popup tutorials when the player first discovers a system, plus a place to re-read all tutorial cards. [Oct 10 10:31 AM (group) & 11:30 AM, Coder/RPG]
- [ ] Settings menu covers audio and visual options. [Oct 10 11:30 AM, Coder/RPG]
- [ ] Accessibility style tab: colours/backgrounds for light or colour sensitivity. [Oct 18 3:47 AM, Coder/Lifeline]
- [ ] The UI is easy to reach and use. A dev/test console can spawn mobs and items so models can be checked fast. [Oct 10 9:23 PM (group), Coder/RPG]
- [ ] No overlay or backdrop is left behind after a screen closes (e.g. the death overlay). [Oct 19 1:44 AM, Coder/Lifeline: "Blue overlay doesn't go away after death"]
- [ ] Navigation: back arrow top-left, X top-right that exits all the way out. [Oct 19 2:42 AM, Coder/Lifeline]
- [ ] Buttons don't shift position on repeated taps. Common actions are reachable without leaving the screen. [Oct 18 2:05 PM & 2:08 PM, Coder/Lifeline: "the age up button jumps to the left"]
- [ ] Money and numbers: commas, K/mil/bill/trill suffixes (and beyond), and inputs that show how much you're spending. [Oct 19 12:30 AM, 1:15 AM & 1:23 AM; Oct 21 1:37 AM, Coder/Lifeline]
- [ ] Button labels never repeat a value (e.g. price shown once); auto-check all action labels. [Oct 22 3:01 AM CT, Coder/Lifeline 7c6: 'Give a gift ($50) ($50)'; check = tests/build7c6.mjs (inferred)]
- [ ] Inventory/gear pages show items in grid squares with a hover/tap stats panel plus market price. Pet/creature pages show stats and an Equip spot. [Oct 18 5:20-5:22 AM, World Design/RPG]
- [ ] Boss/dungeon reward UI: guaranteed crate with its rolled rewards, plus the bonus roll. [Oct 18 5:10 AM, World Design/RPG]
- [ ] Character select shows the options side by side before choosing. [Oct 11, Character models/RPG]
- [ ] Loading screens between zones (biomes, cities). [Oct 10 12:29 PM (group), Coder/Roblox; also in the Kilumen design doc]
- [ ] Movement modes are consistent (e.g. fly mode uses the same directions as walking). [Oct 10 9:33 PM, Coder/RPG]
- [ ] Before building a nav change, check for Gary's later corrections and use the newest one. [Oct 19 2:44-2:45 AM, Coder/Lifeline, bottom-bar reversal (inferred)]

## 2. Art & assets
- [ ] Every asset image matches what it's meant to be, and every item that needs an image has one (e.g. auction items). Log mismatches/missing art in `IMAGE_AUDIT.csv`. [Oct 21 2:16 AM, Coder: "accurate asset images for our pages"; Oct 19 12:48 AM: "Auction items need images"; CSV method (inferred)]
- [ ] No asset clipping. [Oct 21 2:14 AM, Coder/Riftward]
- [ ] The clipping scan must cover characters/NPCs (mobs, vendors, guards, quest givers, generals, story/trial foes, cutscene figures), not only buildings and props. No body may stand inside or behind a building silhouette, on a prop or sign, or overlapping another body. Feet must sit on the ground, and nameplates must not collide. Run `npm run check:world`, which must report 0. [Oct 22 2026, Gary: "Some of the NPC models are clipping as well"]
- [ ] NPCs must be placed naturally, never in rows or grids. Put them in small clusters near what they relate to, with jittered positions, varied spacing and facing, and a minimum distance between bodies. Keep them out of footprints and off road centres, and seed placement so it does not reshuffle on load. The scan flags 3+ NPCs on one X or Y at even spacing (`npc-row`). Formations are allowed only when intentional. [Oct 22 2026, Gary: "NPCs are stacked in direct rows/grid lines"]
- [ ] Believable sense of scale. [Oct 21 2:14 AM, Coder/Riftward]
- [ ] Repeated objects and resource/respawn nodes vary in size and shape. [Oct 21 2:14 AM, Coder/Riftward]
- [ ] Building collisions work. Walkways and paths exist. No buildings placed where the player can't reach (e.g. on cliffs). Mobs don't fly into the sky. [Oct 11 ~7 PM, Game dev/RPG]
- [ ] Skills have visible impact: each skill shows its own animation (e.g. fireball launches and collides). [Oct 21 2:14-2:15 AM, Coder/Riftward]
- [ ] Set the quality bar with one high-quality reference asset first (a building, male, female, MC, pet), then match it. [Oct 10 7:38 PM & 7:44 PM (group), Coder/RPG]
- [ ] Quality must meet or beat the named benchmark game (RPG: "better quality than Fable 3"). [Oct 10 7:18 PM & 7:50 PM (group), Coder/RPG]
- [ ] Always use the dedicated/locked model for a character, and check details against it (no stray beard, heads up to quality). [Oct 15, Character models: "are we not using the dedicated model?", "both of the heads fall below quality"]
- [ ] Assets are cohesive. Third-party or free assets are altered to fit, and enhance rather than replace the established gameplay and look. [Oct 11 ~12 AM, Game dev/RPG]
- [ ] Use the real pack pieces, not stand-in meshes picked up by placement scripts. [Oct 11 ~10 AM, Game dev/RPG]
- [ ] Follow the map/reference Gary provides. [Oct 10, World Design/RPG: "that's wrong I gave you a map"]
- [ ] Research a style before using it (e.g. cardboard cut-out cutscenes like Battle Block Theater). [Oct 10 6:10-6:11 PM, Coder/RPG]
- [ ] Town/city layouts follow a researched blueprint of real places (e.g. medieval towns of 30-40 buildings) before assets are placed. [Oct 21 1:32 AM, Coder/RPG; Kilumen doc says the same]
- [ ] Each region is built to be distinct (diversity across regions). [Oct 11 ~12 AM, Game dev/RPG]
- [ ] Reuse by design: modular walls/floors/roofs, recolourable assets (cars, houses, jewelry, clothes), NPC clothing from a few pieces with colour/pattern swaps. [Oct 10 9:15 PM & 7:41 PM (group), Coder/RPG; Oct 18 1:12 AM, Coder/Lifeline]
- [ ] Replacing art keeps the same ids, file names and slots. [Oct 18 4:39 AM, Coder brief to Game dev (inferred)]
- [ ] Items fill their body region at true scale. Check registration on the base model. [Oct 18, QUALITY_BRIEF (inferred) from Gary: "more detailed outline on quality"]
- [ ] Sprite/pixel art: continuous outline, at least 3 tones per region, no stray pixels or anti-aliasing, exact grid, consistent anchor point. [Oct 18, QUALITY_BRIEF (inferred)]
- [ ] Variants are readable by silhouette. Ages/sizes are redrawn, not rescaled. Recolours keep their shading. [Oct 18, QUALITY_BRIEF (inferred)]
- [ ] Locked style sheet/profile: new art matches it, and each character follows their own sheet. [Oct 12-17, manga checklist rules 7 & 9 and the Sven locked sheet via Director (inferred for games)]
- [ ] Poses are built from real reference photos and checked against them. [Oct 17, Gary standing rule via Director (inferred for games)]
- [ ] Check new art against previous panels/screens for consistency. Fresh art per use, no reused crops. [Oct 12, Gary manga checklist rule 5 (inferred for games)]
- [ ] In every wide shot, check figure scale against vehicles and doors: an adult (~1.75 m) stands shorter than a van (~2 m) or a door. [Oct 22 5:38 AM, Gary catch on After Annie P23]
- [ ] Close-up inserts (hands, props) use the same stylised line-and-flat-colour look as character art, never photo-real. [Oct 22 5:59 AM, Gary catch on After Annie P45/P47/P48]
- [ ] Hardware must be physically plausible and consistent across panels (e.g. door chain: base plate on door + keeper with slot track on frame). [Oct 22 5:59 AM, Gary catch]
- [ ] Contact sheet plus self-review before reporting. [Oct 18, QUALITY_BRIEF (inferred)]
- [ ] **Kilumen:** variant modifiers show on the model, and held items don't change the battle look. Reuse tiles and props. Idle and weather animation. [Kilumen design doc, written by Gary]

## 3. Text & copy
- [ ] Don't call the game "BitLife style". Describe it on its own terms ("a life sim game, text based"). No "pixel art" wording in player-facing or promo copy. [Oct 18 5:46 AM, Coder/Lifeline: "dont call it bit life style its a life sim game text based"; pixel-art part Oct 21 (inferred) from Coder's briefs]
- [ ] No placeholder labels in the UI (e.g. "colour 3" instead of "green"). [Oct 19 12:25 AM, Coder/Lifeline]
- [ ] Text reflects the real game state (experience after 10 years, an obituary that matches the life lived). [Oct 19 1:18 AM & 1:43 AM, Coder/Lifeline]
- [ ] Never change ids/keys when editing text, and validate against the game data. [Oct 18-21, Text Bot docs (inferred)]
- [ ] No spoilers in public builds. Spoiler strings go in a team-only file. [Oct 21, RPG README_TEXT (inferred)]
- [ ] Character limits (subtitles at most 2x42 chars at 17 cps; store short description at most 80). [Oct 21, README_TEXT and Play listing (inferred)]
- [ ] Tone: grounded, with light humour. [Coder brief, Oct 22 (inferred; Gary's original not found)]
- [ ] Use only planned in-world text, with no invented signs or labels. [Oct 17, MORNING_DECISIONS SPOT-3-01 (inferred)]
- [ ] Rating-safe: no slurs, adult content non-explicit and 18+ gated, never anything involving minors. Prices use tokens. [Oct 18-19, Text Bot/Coder docs (inferred); Oct 18 12:57 AM Gary: "adult industry jobs are fine"]
- [ ] Lore is found in-world (books, pages, journals). Journal pages look hand-written and entries stay hidden until discovered. [Oct 10, Game dev & World Design/RPG]

## 4. Audio
- [ ] Settings include audio options. [Oct 10 11:30 AM, Coder/RPG]
- [ ] Every skill/battle action has matching feedback. [Oct 21 2:14 AM, Coder/Riftward "no real impact from skills" (inferred for audio)]

## 5. Gameplay & balance
- [ ] Anything Autopilot/automation completes is greyed out and can't be done twice. [Oct 19 12:49 AM & 1:52 AM, Coder/Lifeline]
- [ ] Automation has the same impacts and risks as manual play. [Oct 18 4:21 PM, Coder/Lifeline]
- [ ] Stat curves: stats rise while trained, fall without training, and decline faster at age thresholds. [Oct 19 1:51 AM, Coder/Lifeline]
- [ ] Prices, costs and offers make real-world sense: no seed cost for cattle, team values at realistic scale, offers competitive with current income. [Oct 18 11:53 PM, 6:27 PM; Oct 19 1:07 AM, Coder/Lifeline]
- [ ] Benchmark item effects and prices against reference games' data. [Oct 10 4:23 PM & 2:15 PM, Coder/RPG]
- [ ] Explicit stat scaling for special enemies (e.g. mirror boss at 125%, mirror mobs at 75%). [Oct 10 5:01 PM (group), Coder/RPG]
- [ ] Small stat scaling per level plus assignable points. Paired stats counter each other (accuracy vs evasion). [Oct 11 ~7 PM, Game dev/RPG]
- [ ] Loot tables: explicit rarity tiers (common to divine), listed clearly. Boss drops cover weapons and every armour slot. Low drop rates with guaranteed currency. [Oct 18 5:29 AM, Character models; Oct 11 ~7 PM, Game dev/RPG]
- [ ] Systems have consequences (over-farming, market saturation, reputation from actions/prices). [Oct 10, World Design & Character models/RPG]
- [ ] Every feature works from every entry point (e.g. starting a business from the Work page AND the Assets page). [Oct 19 12:37 AM, Coder/Lifeline]
- [ ] Map design: varied, with sensible respawn-node placement. [Oct 21 2:14 AM, Coder/Riftward]
- [ ] Ordering bugs (e.g. bankruptcy before income) and duplicated entities after a turn are tested across 3 turns. [Oct 19, Coder/Lifeline QUEUE (inferred)]
- [ ] **Kilumen:** type counters/immunities, type-count balance, region locks, trainer and reward balance ("not too easy"), energy limits, low Guardian odds, movement-only encounter rolls, fixed regional prices, milestone ladders. [Kilumen design doc, written by Gary]

## 6. Monetization & store policy
- [ ] Forced ads only at natural breaks, and rarely: random every 8-15 in-game years, never before year 8 (Lifeline). Players must watch the minimum the store/ad provider requires. [Oct 18 2:26 PM & Oct 21 4:15-4:16 AM, Coder/Lifeline]
- [ ] Rewarded ads are optional and grant the reward only after the ad completes. [Oct 18 2:26 PM, Coder/Lifeline; completion rule (inferred) from DEVLOG 6B]
- [ ] Platform rules: no ads on Steam. Steam subscribers get ad-reward options once per option per real day. [Oct 18 2:26-2:28 PM, Coder/Lifeline]
- [ ] Test track: hold real ads/billing so testers can use paid passes free to debug them. [Oct 21 3:04 AM & 4:18 AM, Coder/Lifeline]
- [ ] Platform ToS compliance for content (e.g. Roblox: no romance). [Oct 10 11:40 AM (group), Coder/Roblox]
- [ ] AD_ID permission matches the ads declaration. "Contains ads" is set. Data-safety form matches the code. Test ad IDs until release. [Oct 21 4:06 AM, Play Console error Gary pasted (inferred rule); Coder listing (inferred)]
- [ ] Paid products each get a labelled icon (512x512, no text). [Oct 21 4:30 AM, Coder/Lifeline; spec (inferred) from Play]

## 7. Legal & privacy
- [ ] One-time Terms/Privacy agreement in the game, written from other games' terms. [Oct 21 1:55 AM, Coder/Lifeline: "Need a one time agreement here... terms and services based off other games to cover us"]
- [ ] Flow details: required boxes, Start disabled until they're ticked, re-asks only on a version bump, links in Settings. Privacy page matches the code. Placeholders filled by Gary. [Oct 21, Coder 7c1 (inferred)]
- [ ] User photos/custom content stay on the device unless the policy says otherwise. [Oct 21 3:54 AM, Coder/Lifeline]
- [ ] Credit the authors of third-party/free assets. [Oct 11 ~1 AM, Game dev/RPG: "credit those authors"]
- [ ] Use other games as inspiration only: don't copy their code or model; use open-source references. [Oct 10 1:28 PM (group), Coder; Oct 11 ~5 AM, Game dev/RPG]
- [ ] Don't show real people's faces in game or promo; use only their user tag next to a quoted post. [Oct 10 (group), Game dev/RPG]
- [ ] Original names and framing to avoid IP issues (e.g. Kilumen's dominance crystal). [Kilumen design doc, written by Gary]

## 8. Store listing
- [ ] Screenshots have real flare and wow: they show off the best parts, with bright bold letters that grab attention. [Oct 21 3:52 AM, Coder/Lifeline]
- [ ] Send listing/product art as labelled PNGs with a soft preview before download. [Oct 21 4:30 AM, Coder/Lifeline]
- [ ] One art style across icon, feature graphic and phone/tablet/PC shots, all meeting Play's specs. [Oct 21 4:01 AM, Gary pasted the tablet specs (inferred rule)]
- [ ] Logo/thumbnail follows Gary's concept (Lifeline: a heart with a heartbeat line and the name). [Oct 18 5:05 PM, Coder/Lifeline]
- [ ] Any post or recruiting message goes to Gary for approval first. [Oct 15-21, standing rule via Director (inferred here)]

## 9. Build, release & backup
- [ ] Upload the live version first, then back up. [Oct 18 7:53 PM, Coder/Lifeline: "upload our live version before backing up"]
- [ ] Back up to Gary's PC and keep a save log there. [Oct 18 6:58 PM & 7:53 PM, Coder/Lifeline: "i need a back up on my pc", "create a save log for back up"]
- [ ] Put backup files in chat as well, so they can be found in the logs. [Oct 18 6:58 PM, Coder; Oct 18 6:59 PM, Game dev]
- [ ] GitHub backup, reused for future projects (one orphan branch per project, never main). [Oct 21 2:05-2:06 AM, Coder: "start a back up on the git hub", "use that same page for any future projects"; orphan-branch detail (inferred) from Coder]
- [ ] Update the backups once work is done. Back up after every few fixes. [Oct 18 6:58 PM, Coder; cadence (inferred) Oct 21 memory]
- [ ] Before a known wipe, save logs, notes and files somewhere that survives. [Oct 18 6:57 PM via Director; Oct 18 6:59 PM, Game dev]
- [ ] Saves: auto-save each turn/year, only one auto-save plus one backup per slot (RPG: auto every 5 min plus manual save/load). [Oct 18 5:22 PM, Coder/Lifeline; Oct 10 3:27 PM (group), Coder/RPG]
- [ ] A fix that broke an older version is in every later version. Load-test the live build on a real device. [Oct 21 4:09 AM, Coder/Lifeline]
- [ ] Get to a good launch point, then ship further ideas as updates with patch notes. [Oct 18 3:54 AM & 7:15 AM, Coder/Lifeline]
- [ ] Keep every asset pack attached to the project version. [Oct 11 ~12 AM, Game dev/RPG]
- [ ] Performance: stream chunks around the player. Distant low-detail items don't render. [Oct 10 9:32 PM (group), Coder/RPG]
- [ ] Alpha scope: invisible walls keep spawns inside the playable area, and unfinished areas are capped as "coming soon". [Oct 11 ~1 AM, Game dev/RPG]

## 10. Process & QA evidence
- [ ] Re-read Gary's messages since the last checkpoint and confirm every ask is covered. [Oct 21 1:34 AM & 2:04 AM; Oct 22 12:48 AM, Coder]
- [ ] Every quality check is filed and reusable on any project. [Oct 22 1:01 AM, Coder]
- [ ] Smoke test: the menu works fully on Play and the starting sequence plays. [Oct 11 3:09 AM (group), Coder/RPG]
- [ ] Every feature is testable by Gary ("i want to test all of this"). Each fix has a test through the real UI. [Oct 18 2:19 PM, Coder/Lifeline; test method (inferred)]
- [ ] Before/after phone-size screenshots for UI/art changes. [Oct 21 02:16 CT, QUEUE 11b (inferred); Gary's original not found]
- [ ] Hand-offs are one-shot and right: a labelled zip saying what each asset is for, hook-up instructions and combined demos. UI hand-offs give the exact asset, where each element hooks, and which screen each button opens. [Oct 18, Character models & World Design/RPG]
- [ ] Use the credible source per area (World Design for UI, Character models for mobs/panels). [Oct 21 2:18 AM, Coder]
- [ ] Maximise free assets and build only what can't be had free. [Oct 10 10:06 PM & 7:38 PM (group), Coder/RPG; Oct 11, Game dev]
- [ ] Keep a pending-queue file of Gary's asks and his corrections. Present overnight decisions one at a time. [QUEUE_PENDING / MORNING_DECISIONS (inferred)]

---

## Suggested (not from Gary)
- [ ] Audio: separate music/SFX sliders, mute on focus loss, no clipping.
- [ ] Performance on a low-end Android phone (FPS, load time, memory).
- [ ] Localization-ready strings, with no text baked into images.
- [ ] Interrupted play never corrupts a save.
- [ ] **Kilumen:** automated type-matchup and damage simulation across all creatures.
- [ ] Reduced-motion and text-size options.

## Added 2026-10-22 (Lifeline 7c6)
- **R-7c6-1 Labels: no repeated values.** A button label never shows the same value twice (for example, the price appears once). All action labels are checked automatically by tests/build7c6.mjs §6, which scans the interaction labels and every data/*.json label/title.
- **R-7c6-2 Money sign and colour.** Sign and colour always agree, including the compact suffix ("-$1,234,567 (-1.23 mil)"). `kv()` forces red on any value that starts with a minus. Tests: bignum_ui, advisor_pnl_ui.
- **R-7c6-3 Big numbers, no sideways scroll.** Values of 1B or more use the compact form ("$172.59 sept"), and tapping one shows the full number. No screen scrolls sideways at 390px. Tests: bignum_ui, advisor_pnl_ui.

- R-7c7-1 (Gary, Oct 22, 2026): every job, career, role or membership the player can enter must have a working exit (Quit/Resign/Retire/Leave) reachable from every screen that shows it. No dead-end states. Hot-check whenever a new job or role is added.

- Any card, portrait or icon shows a single frame. Never a raw sprite sheet or animation strip. (Riftward 2026-10: dungeon cards showed whole multi-frame model sheets on phone; fix the source art to one frame per id and audit every boss/mob surface: cards, intro, bestiary, fight banner, rewards, codex.)
- Every menu reachable on desktop is reachable on phone; locked features show as locked with their unlock condition, never hidden. (Riftward 2026-10: a phone media query hid the whole Areas column, so Guild/Factions had no entry point on mobile.)
- Every screen has its own banner; no two screens share banner art.
- Battle feel: every attack has anticipation, travel and impact (and recoil); none of them teleports.
- Battle feel: HP never jumps, it drains (with a colour shift as it falls).
- Battle feel: idle motion is never static; every battler breathes, bobs or hovers.
- Battle feel: strong hits and crits flash and shake; KOs drop and fade instead of vanishing; animations are 200–600 ms, non-blocking, and have a speed option.
- Battle feel: every hit, heal, crit and miss shows a floating number/label with varied motion.
- Battle feel: Every skill has a cast animation (wind-up, travel or area, impact) matched to its element; new skills fall back to an element default.
- No two distinct monsters or bosses share the same art.
- Oct 22, 2026 (After Annie, art): When a character looks at a phone screen, the phone's back faces the camera unless the screen itself is the subject (P62 fix).
- Oct 22, 2026 (After Annie, art): An implied presence at a door is shown as shadow spots breaking the light under the door, not as visible feet or shoes (P67 fix).
- Oct 22, 2026 (After Annie, art): Foreground figures are checked for adult scale against the furniture and doors (Dave ~180 cm vs 203 cm door); foreground figures read larger than furniture behind them (P73 fix).
- Oct 22, 2026 (After Annie, art): Scale vehicles to the street first (lanes, crosswalk stripes, storeys), then scale people to the vehicle (P26 fix).
- Oct 22, 2026 (After Annie, art): Parked vehicles get no motion lines; only a moving object (e.g. a skidding phone) may carry a small motion cue (P26 fix).

- All new art follows the project's style guide and is checked on a contact sheet beside existing art before it ships. (Gary, Oct 22, 2026, Riftward)
- Loot drop rates are measured with a sim before release; gear and materials must feel earned (report per-100-kills and per-dungeon numbers). (Gary, Oct 22, 2026, Riftward)

- World objects are depth-sorted by their base, buildings and large props have solid footprints, nothing is placed on roads or overlapping, and nameplates never overlap or get cut off; run the overlap scan before release. (Gary, Oct 22, 2026, Riftward)

- No sprite contains fragments of neighbouring sprites from sheet cutting; run the fragment scan before release. (Gary, Oct 22, 2026, Riftward)

- Open-world assets (buildings, landmarks, props, decor, flora, gather nodes, field mobs, signs) are unique to their map and match its palette, lighting and theme: no reuse from UI/item/skill icons, city screens, dens, other regions or other monsters. Re-skin the map side and keep the other use as is; check by hash (`npm run check:unique` in Riftward), allowlist only intentional generic bits with a reason. (Gary, Oct 22, 2026, Riftward: "The assets in the open world that are being used somewhere else need fresh designs to match the map.")

- Base stats for the player and companions (generals) must scale with level, verified by a stat-curve sim (stats at levels 1/10/25/50/max, non-decreasing, plus a boss sanity check) before release. (Gary, Oct 22, 2026, Riftward)

## Added 2026-10-22 (Riftward Round 6, UI pop pass)
- [ ] **UI feels alive.** Every press gives feedback (eased lift/glow on hover, squash on press), screens and tabs change with an eased fade/slide, nothing pops in (images and panels fade), numbers roll instead of jumping, and `prefers-reduced-motion` turns the motion off. Shared code: `src/ui-kit/` (copy it to other projects). [Oct 22, 2026, Gary via Coder/Riftward: "enhance the UI to make it feel more alive and pop"; reduced-motion part from the brief]
- [ ] **Banners get small, occasional touches** (light sweep, end embers/rune glow, ribbon tails, trim glints, unfurl on first appear, breathing glow on important ones), staggered so they never fire together, transform/opacity only, off under reduced motion. Shared: `src/ui-kit/banner-fx.css`. [Oct 22, 2026, Gary via Coder/Riftward]
- [ ] **New/unseen content is always flagged** with the yellow "new" dot (and a golden build-up glow on the entry), the dot bubbles up to parent tabs/nav entries, the seen state is saved, and viewing it plays a sparkle burst and clears the dot. Reduced motion: static dot, no particles. Shared: `NewBadge`, `useSeen`, `sparkleBurst`. [Oct 22, 2026, Gary via Coder/Riftward]
- [ ] **Item icons are centred and scaled by their visible (non-transparent) bounds in one uniform square slot everywhere** (inventory, gear, drops, shop, market, crafting, detail window): no stretching, cropping or overflow; item level badge top-left, stack count bottom-right, class-lock X bottom-left, rarity frame on the border; items without levels show no badge. Check: `npm run check:ui` (tools/check-ui.py). [Oct 22, 2026, Gary via Coder/Riftward]
- [ ] **Every item opens a details window** with full info (icon, name in rarity colour, rarity, item level, type, every stat with sign-and-colour compare vs worn, bound status, enhance, sell value, source, flavour) and all valid actions; actions that don't apply are hidden or disabled with the reason; destructive actions confirm; Esc / tap outside closes; modal on desktop, bottom sheet on phone. [Oct 22, 2026, Gary via Coder/Riftward]
- [ ] **Class-locked items always show they can't be used and why** (red X on the icon, "Requires the X class to use" in the details window, Equip disabled), while sell/list/break down still work. The game logic blocks the equip too, and old saves move a now-locked weapon back to the bag (never deleted). Check: `tools/check-class-weapons.ts`. [Oct 22, 2026, Gary via Coder/Riftward]
- [ ] **Every screen works in phone portrait and landscape**, and rotating keeps state (open panels, scroll, game) with a quick eased crossfade (instant under reduced motion). Landscape stays close to the regular wide build. Test 2-3 phone sizes plus a tablet. [Oct 22, 2026, Gary via Coder/Riftward: "landscape should be pretty close to the regular build"]
- [ ] **Gear has real item levels and level requirements, shown everywhere.** Every piece carries a stored item level set from its source (field/boss level, dungeon level, player level for crafts/quests/bad-luck chest); required level = item level; stats scale with level (rarity changes stats, not level). The level badge sits on every item slot (red when above you), the details window says "Requires Lv X" and disables Equip with the reason, and the game logic blocks the equip too. Old saves get a level without losing or unequipping anything. [Oct 22, 2026, Gary via Coder/Riftward, approved Round 7]
- [ ] **No internal notes in player-facing text:** no competitor or other game names, "like X does", TODO/FIXME, placeholder or design-reference wording in any string the player can see; such notes live in code comments or docs. Check: `node tools/check-copy.mjs` (part of `npm run check:ui`). [Oct 22, 2026, Gary via Coder/Riftward: "the way Re:End does it" was an internal note]

## Added 2026-10-22 (Riftward Round 6, economy)
- [ ] **Market-only currencies can never be spent outside the market, and every conversion shows its fee before confirming** (amount, fee, amount received; listing taxes too, shown as red -N; fee rounded in the house's favour with a minimum of 1 so tiny transfers can't dodge it; blocked when short; no negatives). Check: `npx -y tsx scripts/market-gold-sim.ts`. [Oct 22, 2026, Gary via Coder/Riftward: "it can only be used on the market unless you transfer it back. 10% market fees for any currency transfer"]
- [ ] **Every gold source and sink is modelled in the gold sim, and buildings never out-earn active play** (passive buildings stay a modest supplement, upgrade ranks give diminishing returns, idle stays XP-only). Check: `npx -y jiti scripts/gold-sim.ts` ALL PASS. [Oct 22, 2026, Gary via Coder/Riftward: "Slow down the rate you earn gold and make sure the buildings that pump out gold are on track with that"]
- Automated art fixes are diffed against the source model packs and visually verified on a source | before | after sheet; prefer re-extracting the sprite from the source sheet over erasing pixels. (Gary, Oct 22, 2026, Riftward)
- [ ] **Premium currency can't be created from nothing or earned by grinding.** Every premium source is a (stubbed) store purchase or a trade backed by premium another player already paid; a fuzz check proves wallet + pool = bought. Bundles show base and bonus honestly, with no urgency or pay-to-win copy. Check: `npx -y tsx scripts/premium-sim.ts`. [Oct 22, 2026, Gary via Coder/Riftward]
- [ ] **Paid cosmetics give no power, enforced by a script check** (look-only data fields; no stats, XP/gold/drop boosts or gameplay effect; copy never implies one). Check: `node tools/check-cosmetics.mjs` (in `npm run check:ui`). [Oct 22, 2026, Gary via Coder/Riftward]

## Paid boosts (Rift Stones)
- [ ] Every paid boost is small (at most +5%), timed (at most 60 minutes) or limited to once per real day.
- [ ] Boosts apply to ACTIVE play only: idle/AFK/offline, properties and the Mill are never boosted.
- [ ] Boosts never stack: only one timed boost at a time; buying while one is active is refused with a visible reason.
- [ ] A gold boost must give less gold than the same stones spent on a fair-price gold stack (checked in scripts/gold-sim.ts).
- [ ] Every boost is modelled in scripts/gold-sim.ts and the sim passes; the buy button uses ConfirmButton with the price and an active timer is shown.

## Shop-only currencies (Riftward: Echo Coins, formerly "Blue Rift Stones"; and any future one)
- [ ] A game's shop-only currency is never named or coloured like the network-wide Blue Bucks (Paige Games, $1 = 1,000): no "Blue" in its name, no blue icon, and it must look different from that game's paid currency (Riftward: silver coin vs purple Rift Stones gem). A rename migrates the old save key on load.
- [ ] A shop-only currency can NEVER buy gold, gold listings or Market Gold, and can never be traded, listed, gifted or converted into a paid currency (checked in scripts/premium-sim.ts).
- [ ] It is created only by its documented sink (Echo Coins: exactly 15,000 gold destroyed -> 100), and the sink shows the gold destroyed in red (-15,000) behind a two-tap confirm.
- [ ] Ad rewards NEVER grant any currency (no Gold, Rift Stones, Echo Coins or Blue Bucks). A rewarded ad only gives a short, clearly labelled boost (Riftward: "Ad reward: +5% XP", 10 min active play, 5/day, no stacking with the paid Tonic). Checked in scripts/premium-sim.ts.
- [ ] Every store item is in the single store price table (src/game/rift/store.ts) and accepts every store currency at the same price; the player picks the currency at purchase (checked in check:ui).

## Ads
- [ ] Ads never cover nav/controls, never interrupt combat or dialogue, and interstitials are frequency-capped (at most 1 per 4 min, none in the first 5 min of a session; checked by riftward tools/ads-shots.mjs). Release web builds show no ads.

## Paige network: ads, billing, accounts, admin (added 2026-10-22)
- **Ad scope:** a game's "No Ads" removes ads in that game only, never on the website. Only the network **Ad-Free for Life** ($35, `ad_free_life`, game = null) removes ads in every game **and** on paigegames.net. The website honours only that network entitlement.
- **Ads never cover controls:** banners sit in-flow (under the top bar), never over the bottom nav or the action buttons. Interstitials are frequency-capped (min gap) and only at natural breaks. Test ads are clearly labelled. Real ad IDs ship only from config, never hardcoded.
- **Blue Bucks are server-authoritative:** $1 = 1,000. The balance comes from the append-only ledger via RPC, never from a local number. Redeems are idempotent (key per attempt). Local entitlement flags are only an offline cache, refreshed from the server.
- **Guests play fully; buying requires a linked account; linking never loses progress.** First launch = anonymous guest. "Create account" upgrades the SAME user (linkIdentity / updateUser). Signing into an existing account from a guest offers a merge (keep account / use guest / cancel), never a silent overwrite. RLS and RPCs reject `is_anonymous` JWTs for purchase and redeem, and edge functions treat guests as signed out.
- **Admin powers are server-checked:** the admin menu renders only after `admin_me()` confirms a role, and every admin RPC re-checks `is_admin(min_role)` (SECURITY DEFINER, false for guests). Client-side flags unlock nothing. The admin menu is separate from the dev TEST menu, which stays stripped from release.
- **All admin grants are audited:** every admin RPC writes `admin_audit_log` (append-only; no update/delete).
- **The admin tag can't be self-assigned:** `admins` rows (role, tag text) are written only by SQL / migration / service role. Clients can only read their own row and the public `player_tags()`. The CREATOR tag is gold with a subtle shimmer, distinct from currency colours, and the shimmer stops under reduced motion.
- **Keys:** only the public anon key in clients. `PaigeNet` refuses a service-role JWT. Secrets live only in edge-function env.
- [ ] **Auth screens are complete:** every sign-in surface (site or game) always includes Sign in, Sign up, Forgot password + a reset-password view (Supabase `type=recovery` redirect), and the guest-link path (a signed-in anonymous guest who signs up gets email/Google linked to the SAME user via `updateUser`/`linkIdentity`, never a new account). [Oct 22 2026 3:30 PM CT, Grok Bot/paigegames.net sign-in, from Gary's brief (inferred)]
- Floating/docked media players (e.g. the Music mini player) must be collapsible and closeable with labeled, keyboard-operable buttons; on phone they must never cover the navigation (header/burger/drawer) and must sit as a compact bar at the page edge; they must persist across in-page tab switches without reloading the iframe; collapsed state is remembered; Escape is not hijacked; only official embeds (youtube-nocookie), no tracking.

- [ ] Nav/menu hover & active glows are soft and diffuse (blurred, low-opacity halo, ~200ms fade, slow or no motion under prefers-reduced-motion) with no hard/double borders, boxy outlines, or clipped glow at container edges; keyboard :focus-visible ring stays clearly visible on every nav item, button, and drawer link.
- [ ] **Analytics are first-party only:** site/game analytics write to our own Supabase (`public.site_events`) — no third-party trackers, pixels or cookies. Public roles may only INSERT (RLS, length/format checks); reading is admin-only through a SECURITY DEFINER RPC (`admin_site_stats`) that re-checks `public.admins` on every call. Do Not Track / Global Privacy Control => log nothing. Store no PII: a random localStorage visitor id, source, path, device class only (no IP, email, full UA or full referrer URL). Tracking params (`src`, `utm_*`) are stripped from the address bar after reading. [Oct 22 2026, Grok Bot/paigegames.net analytics]
- [ ] **Ad slots are well-behaved:** every ad slot reserves its height up front (min-height, no layout shift); ads are inline only, never fixed/overlaying and never in the header/nav, sign-in, admin/stats pages or over media players/content; slots stay hidden/collapsed until real ads (approved AdSense client + slot IDs) exist (labeled "Advertisement" placeholders only behind `?adpreview=1`); the ad script loads once and NOT at all when the user's no-ads pass applies (network Ad-Free for Life or a per-game no_ads via `public.ads_removed`). [Oct 22 2026, Grok Bot/paigegames.net ads]

## Currency discounts
- [ ] Any currency discount (e.g. 10% off passes bought with Blue Bucks) is defined ONCE in shared code (paige-shared `BB_PASS_DISCOUNT` / `priceInBB` / `bbPayChoice`), never re-implemented in a game, and the server charge uses the same rule (`paige_private.bb_charge`).
- [ ] The price shown equals the price charged, and a test proves it for every discounted item in every game (lifesim `tests/bb_discount.mjs`, riftward `src/game/rift/bb-passes.test.ts`, paige-shared `supabase/tests/network.test.mjs`).
- [ ] Rounding is documented (BB: nearest 10, half up) and the discount only applies where intended (passes, not currency packs or in-game currency).

- **Site ads placement (Gary, Oct 22, 2026):** no ads on the paigegames.net home page; other pages get horizontal banner ads only (no pop-ups/interstitials on the site).
- **Site ad notice (Gary, Oct 22, 2026):** a "We use ads to keep things free" notice shows only where ads show (never on home), closes with "Got it", and has a "Don't show me this again" box saved on the device. It's keyboard-focusable and Esc closes it.
- **Site ad notice (Gary, Oct 22, 2026):** pages with ads show a "We use ads to keep things free" notice (never on the home page) with a highlighted "Go ad-free for life · $35" option, a "Got it" button and a "Don't show me this again" box that's remembered; without the box ticked it shows once per visit.
- **Update (Gary, Oct 22, 2026, 4:14 PM CT):** home-page banner ad restored ("we need the revenue"): one labeled banner between the hero and the 4 random project picks. All site ads stay banner-only; the ad notice still doesn't pop up on the home page.
- **Ad notice update (Gary, Oct 22, 2026, 4:15 PM CT):** the notice shows on the home page too, with "I understand" (closes it for this visit) and "Don't show again" (remembered) buttons, and the bottom line reads "Want to support the website? Go ad-free with the Ad-Free for Life pack · $35".

## Currency packs
- [ ] Currency (Blue Bucks) is sold ONLY in fixed SKU packs from ONE shared catalogue (paige-shared `BB_PACKS`: bb_5000 $5, bb_10000 $10, bb_20000 $20, bb_50000 $50 — flat $1 = 1,000 BB, no bonuses, no "Best value" tags). No custom/exact amounts.
- [ ] When the balance is short, the BB button offers the smallest covering pack in one tap (`smallestCoveringPack`): "Get N Blue Bucks ($Y) & buy"; if no pack covers it, offer the biggest and say more is needed.
- [ ] The pack store shows the bright, contrast-safe tag line "Save 10% on every pass with Blue Bucks" (`BB_PACK_BANNER`).
- [ ] Pack analytics (`packEvent`) record the pack SKU only — never free-form amounts.
- [ ] Real-money pack checkout stays "Coming soon" / TEST-wallet only until billing is approved and wired.
- **Ad-Free for Life launch sale (Gary, Oct 22, 2026):** $15 (was $35) for everyone until Jan 1, 2027; the notice shows the struck-out $35 and switches back to $35 automatically. Checkout must charge the sale price when Stripe goes live.

## Daily gift, Dollar Bucks, streak cosmetics, referrals, play time (added 2026-10-22, final spec from Gary)
- [ ] **Two network currencies:** Blue Bucks are PURCHASED only; Dollar Bucks are EARNED only (daily gift, referrals): never sold, no packs, no Stripe/Play product credits them. 1 Dollar Buck = 1 Blue Buck. Separate server balance + append-only ledger (`db_wallets` / `db_ledger`); `wallet_status()` shows both. The wallet shows "Dollar Bucks" in green with its own "$" icon and "Blue Bucks" in blue, both contrast-clean.
- [ ] **Combined payment** (`bb_redeem` → `paige_private.redeem`): one charge at the same price as `priceInBB()` (passes 10% off), Dollar Bucks spent FIRST, then Blue Bucks, all-or-nothing, same idempotency key. Client mirror: `splitPayment()` / `combinedShortfallPack()`.
- [ ] **Ad removal is Blue Bucks only:** any `removes_ads` product (Ad-Free for Life, No Ads, All Access) never takes Dollar Bucks (`AD_FREE_ALLOWS_DOLLAR_BUCKS = false`, final). The Ad-Free card says "Dollar Bucks can't be used for Ad-Free for Life."
- [ ] **Shortfall pack** covers only what is left after BOTH balances (for ad removal only Blue Bucks count). Never offer to sell Dollar Bucks.
- [ ] **Daily gift is server-authoritative and pays Dollar Bucks:** the client only calls `claim_daily_gift()`, and it credits the Dollar Bucks ledger (key `daily:<CT date>`). One claim per user per America/Chicago day; missing a day resets to day 1; after day 7 back to day 1. Table in ONE constant (`daily_gift_table()`: 25×day = 700/week); keep the 55-day "cheapest pass" math in its comment.
- [ ] Gift popup: once per CT day, reachable from the header gift button, never open together with the ad notice (gift first), focus-trapped, closes on Escape, reduced-motion safe, axe-clean.
- [ ] **Streak cosmetics:** 8 per game (`streak_rewards.slot` 1..8), granted on every OTHER completed week (weeks 2, 4 … 16 → slots 1..8); weeks after 16 grant nothing. The day-7 bonus is a cosmetic only (no extra currency). The day-7 "+ bonus" tag shows only on reward weeks; other weeks show "Next reward in X weeks". Lifeline = `car` (the account owns it in every life), Riftward = `title`. Look-only, idempotent, Gary seeds the real ones.
- [ ] **Referrals:** the new player always gets 100 Dollar Bucks. The referrer ladder (150, 200, 250 … +50, capped at 500 from the 8th friend) is computed server-side from the count of PAID referrals while the referrer's wallet is locked. Payout only when BOTH players have 4 h of server play time, a non-guest account AND a confirmed email (Google counts as confirmed), and exactly once per pair. No self or circular referrals; only accounts up to 72 h old can attach. The invite panel shows "Your next friend earns you N" and "Confirm your email to earn invite rewards" when unconfirmed; it never exposes friend ids or emails.
- [ ] **Play time is counted only by the server heartbeat** (`play_heartbeat`): at most 60 s per beat, beats under 50 s apart ignored, idle gaps over 120 s credit nothing, one stream per user, 6 h daily cap; games only send it while the tab is visible and the player is active.

- **Analytics (Gary, Oct 22, 2026):** visitors count once per CT day; interactions logged separately; bots, headless test runs and admins excluded.
- Popups/overlays are self-styled and checked on every page that loads them, not only home.
- Admin tools: every admin RPC checks admin server-side, gifts are capped, confirmed and audit-logged.
- Payments: no secret keys client-side; webhook-verified, idempotent grants; checkout flag off until a test purchase passes.
- Music links: every platform link verified to resolve; play counts public-source only with source+date, blank otherwise.

- Player/character sprites must never be clipped by UI containers; check at desktop and phone sizes. Fit the whole sprite (head, helm/hat tip, weapon, feet) with a little padding, anchored at the feet, pixel-crisp; source art must not be cut at its own canvas edge. Hot-check every sprite UI: top-bar avatar, character panel, character creation, gear paper doll, stats card, wardrobe/skin tiles. Check: `node tools/sprite-fix-shots.mjs after <testBuildDir>` (Riftward) reports no `clippedBy`. (Gary, Oct 22, 2026, Riftward: "fix player sprites in the game where they cut off in ui")

- Ads never cover decorative or functional UI (e.g. the circuit line); verify at 4 viewport sizes. (2560x1080, 1920x1080, 1440x900, 390x844; site-ads.js `__siteAdsReport()` must show overlaps 0, min line distance >= 16px.)

- [ ] **Anchor ads (AdSense Auto ads overlay):** use Google's own anchor with its built-in collapse arrow only: no custom close/hide button, nothing covers, dims or hides the anchor (modal dialogs/backdrops/sheets are inset by `--anchor-top-h`/`--anchor-bottom-h`), no refresh logic. Every page/game layout must reflow around the anchor in all three states (open, collapsed, absent, top or bottom): app shells shrink, fixed/sticky UI (nav, bottom tabs, banners, toasts, buttons) rides clear of it, nothing is clipped (e.g. hotbars at short desktop heights), and document pages keep the end of content clear. No anchor for no-ads pass owners. This is the one allowed exception to the "never fixed/overlaying" ad rule above. Check: `python3 /workspace/domain_hub/shots/anchor_ads/shoot_anchor.py` reports overlaps=0, anchorOnTop=True (except under a modal), scrollEnd=True and axe [] at 1920x1080 and 390x844. [Oct 22 2026, Grok Bot/anchor ads]

- Encounter or interactive terrain (tall grass etc.) must be clearly distinguishable from plain terrain at a glance: different value or saturation, outline, height, and a walk-through animation (Gary, Oct 22, 2026).

## Pixel-art overworld / tile maps (added 2026-10-22, Kilumen overworld v1)
- [ ] **Crisp scaling only:** integer zoom (x2 at 1080p, x3 at 1440p, x4 at 2160p), nearest-neighbour everywhere: `ctx.imageSmoothingEnabled = false` AND CSS `image-rendering: pixelated`. Setting `canvas.width/height` RESETS the context (smoothing turns back on), so re-apply it after every resize. Prefer the pre-scaled 2x/3x sheet so tiles blit 1:1. Check: every zoom x zoom block of a screenshot is one flat colour (`tests/shots.mjs` blockCheck reports 0 non-flat blocks). [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **No sub-pixel jitter:** sprite and camera positions are whole NATIVE pixels (round once, then multiply by zoom); the camera follows the rounded player position, so the player never shimmers against the map. Fixed-tick simulation (60 Hz) with a capped catch-up, not dt-scaled float movement. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Draw order follows the kit:** ground -> decoration -> characters + `ysort` overlay tiles (tall-grass fronts/tips) sorted by row, character first on a tie -> remaining overlay (canopies, roofs). Screenshot a player standing IN tall grass (legs hidden, head visible) and one row BELOW grass (head not covered). [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Grid movement feel:** tap = turn in place, hold = walk; walking into a wall bumps in place (repeat while held); ledges only one-way; turning while already walking has no pause; input locked during fades. Test these with real key events in a headless browser, not just unit tests. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Every warp/exit is data-checked:** each door/edge lands on a walkable, in-bounds tile of a map that exists, not on another warp (no loops), and each edge exit has a way back that returns to the same tile. Unbuilt (`TO COME`) links show a "path ahead is closed" message and never load a missing map. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Art in progress stays local:** unapproved art is wired on a local dev branch only (no push, no deploy) until Gary approves it. Re-run data tests when the art kit changes; World Design regenerates maps and tilesets in place. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Screenshots at 1920x1080 and 2560x1440:** player on map, debug overlay (collision + warps), and right after a warp; look at them at full size before reporting. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Animation frames follow distance, not time:** when speeds differ (walk / run / bike), advance frames per pixels moved and reset only on stop, so mode swaps and fractional tick rates (e.g. run 7.5 ticks/tile via an alternating 8/7 accumulator) never pop or skip frames. Unit-test that each run/bike step pair sums to the right ticks. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Story gates are data-tested in both states:** for each gate flag, test the blocked tile is solid and the cleared tile is walkable, apply gates on a per-instance copy of the map (never mutate shared JSON), and screenshot blocked + cleared with the guard text. [Oct 22 2026, Grok Bot/Kilumen]

- [Oct 22 2026, Gary/Kilumen] No visible tile seams ("panel lines"): ground tiles must be seamless, with wrapping edges, variants and transition autotiles. Check a zoomed screenshot of open grass and paths for square edges before showing Gary anything.
- [ ] **No visible tile seams ("panel lines"):** ground tiles (grass, dirt, path, water, snow, sand) must tile seamlessly: wrap edges, keep dither or noise continuous across borders, use 3 or more variants per ground type scattered at random, and use transition autotiles between terrains. Check a 1:1 crop of open ground at 3x around props, fences and signs before showing anything. [Oct 22 2026, Gary/Kilumen]
- [ ] **Depth cues survive the palette and the grade:** one light (top-left) for every object. Each object needs: a cast shadow on the ground, an eave line, wall-base darkening and a darker shaded side; cliffs need a lip, a face gradient and a base shadow; every actor needs a foot shadow that is always on, not only while hopping. Bake shading as palette ramp steps (an OKLab step, never into a glow colour, and keep the darkest outline colours as they are). Make translucent shadows ONLY with the kit SHADOW colour (alpha 96), so the time-of-day `shadow.dst` grades them. Check the result AFTER palette snapping and in all 4 phases: generator shading that the snap flattens does not count. Give canopies and roofs at least one walkable row behind them, or nothing ever occludes the player. Camera tilt or squash is optional and per platform profile; it conflicts with **No sub-pixel jitter** when scrolling. Mockup: `overworld/qa/depth_3d/`. [Oct 22 2026, Gary/Grok Bot/Kilumen]
- [ ] **Layout fixes re-check every control row at short desktop heights:** after any layout or CSS fix, check at 1280x720, 1366x768, 1920x1080 and 2560x1440 (plus with the anchor ad open and collapsed). Every control row must be fully visible and clickable: hotbar, AFK/Patron row, FortuneStrip, HUD buttons and the left-column thumbnail. Fixing one row must never hide another, especially paid buttons (AFK pack, Patron). Measure clipping against every overflow ancestor and use elementFromPoint, not just the row you changed. Only the map/scene viewport may shrink, down to a set minimum; past that the column scrolls, it never clips. [Oct 22 2026, Gary/Grok Bot]

- [2026-10-22, Gary, paigegames.net] Thumbnails and cover cards must show the whole cover art. Fill the card edge to edge, cropping top or bottom if needed, as long as the title and faces stay fully visible (Gary's preference, Oct 22). Use the blurred, darkened fill only when a crop would cut the title or faces.

- (Oct 22, 2026, site) No placeholder text ships on a live page. Before every site push, search the changed pages for "PLACEHOLDER" and either fill it with approved wording or flag it to Gary. Webtoon synopses on the site come from the live Webtoon series page, not invented copy.

## Time of day, recolours and interior reuse (added 2026-10-22, Kilumen)
- [ ] **One time-of-day grade for everything:** dawn, day, dusk and night come only from `overworld/time_of_day/grades.json` and the `lut_*.png` files (day changes nothing). Never hand-tint a map, sprite or interior for night. New art gets checked in all 4 phases before it's shown to Gary, and `tools/run.py` (which runs `time_of_day.py`) must still pass. [Oct 22 2026, Gary/Kilumen]
- [ ] **Draw order for colour:** palette swaps first (house recolours, Crystal Warmth), then the time-of-day grade on top. Every swap colour must come from `palette.hex` so the grades handle it. [Oct 22 2026, Coder/Kilumen]
- [ ] **House recolours are exact swap tables:** `interiors_new/home_recolours.json`, with lowercase hex, every shade of a shifted ramp mapped light to dark (no stray original shade), an `identity` scheme, and masks only where a tile mixes fixed detail in (8-bit greyscale at 1x, 255 means recolour). Windows, NPCs, props, doors and lights are never recoloured. Every door's `recolour` scheme must exist. [Oct 22 2026, Gary/Coder/Kilumen]
- [ ] **Interior reuse:** only story-necessary buildings get unique interiors. Other homes use the 4 shared designs, rotated so each serves 1 in 4 houses in an area and changes colour per door. There's one shared heal branch, mart and station. Every unique interior is listed with its story reason. [Oct 22 2026, Gary/Kilumen]
- [ ] **Recolours never add night glow:** the night grade keeps warm lights and the violet crystal accent bright (`fcd668 e8ce92 ecdec4 f8eabe 603096 8a4ace b076ec d6acff`). A swap may never map a non-glowing colour onto one of these, or walls and floors light up at night. No violet house scheme, because violet is the crystal accent. Recolour ramps keep every shade distinct, so stripes and wood grain stay readable. `interiors_merge.check_recolours` checks this, and you look at the night rows of `previews/home_recolour_grid.png`. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **New interior name prefixes are registered:** any new interior map prefix (`home_`, `heal_`, `lab_`, `rt_`, `mart_`, `station_`, `hall_` and so on) must be added to `progression.INDOOR_OR_CAVE` and to the indoor rule in `time_of_day.py`. Otherwise an interior gets graded like the outdoors or is skipped by the progression checks. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Keep the rules current:** each new catch from Gary goes on this list the same day, and whoever applies a rule tells Gary "I applied the rule for this" and names it. [Oct 22 2026, Gary]

- (Oct 22, 2026, Kilumen, time of day) Light-keeping rules in a colour grade apply to TILES only. Sprites (NPCs, player, creatures) use the no-lights sprite grade (grades.<g>.sprite + lut_<g>_sprite.png), so pale skin and blond/yellow hair never glow like lamps at night. A sprite part that must glow is flagged with a per-sprite emissive mask, never picked out by colour. Check: run /workspace/tod/check_sprite.py and look at the night column.

## Living world: cloud shadows and ambient life (added 2026-10-22, Kilumen)
- [ ] **Unseen clouds are shadows only:** never draw the cloud itself. Draw a low-res mask blitted at whole native pixels (zoom-sized blocks) with stepped or dithered rims (solid / 50% checker / 25% dots), no smooth gradient. Colour = the current phase's `grade.shadowDst` (day = SHADOW 26,18,38), so the shadow stays inside the grade with no hand tint. Check: the blockCheck (every zoom×zoom block is one flat colour) passes with clouds on. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Stepped alpha that follows the grade:** cloud alpha changes in 1/8 steps and only at times that line up with grade changes (full at day, lighter at dawn and dusk, off at night). Never fade by the frame, because a slow fade breaks the "≤8 steps" grade rule and shimmers. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Shadows go over sprites, under fog and UI:** order = tiles → actors → overlays/roofs → ground-level life → cloud shadows → fog → sky-level life (birds, firefly glow) → debug → fade. Sprites must darken when a cloud passes. Emissive things (firefly glow) stay ungraded, as the lights rule says. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **One indoor rule for every outdoor-only effect:** clouds, birds, smoke and motes use the full `progression.INDOOR_OR_CAVE` rule, never a shorter regex. Catch: `clock.isIndoor` (`_int$|^house_|^greystone`) misses `heal_`, `home_`, `lab_`, `rt_`, `mart_`, `station_` and `hall_`, so those interiors get the outdoor phase grade. Fix it in the time-of-day code, not with a workaround. Check: screenshot one interior of each prefix with effects on. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Ambient effects are deterministic, cheap and switchable:** they're seeded from map id + day, with drift from game time (so frozen time = frozen clouds and the same frame every run). Build them on an offscreen canvas once, then keep draws per frame to a few blits. They respect prefers-reduced-motion and have a player toggle (K clouds, L life) plus URL overrides. Measure frame time headless before and after (`tests/life_perf.mjs`), using a flushed readback because plain render timing hides GPU work. [Oct 22 2026, Grok Bot/Kilumen]
- [ ] **Effect previews are rendered by stepping, not screen capture:** stop the rAF loop and step the scene at a fixed rate per video frame, so the MP4 is pixel-exact and the same each run. Recorded browser video blurs pixel art. [Oct 22 2026, Grok Bot/Kilumen]

## paigegames.net music + dev menu (added 2026-10-22, Gary/Grok Bot)
- [ ] **Albums are one grid, not stacked sections:** every release with `album:` renders in ONE shared `.songs` grid under "Albums" (same 4-across/wrapping grid as Pre-release and Singles), newest first, and each distributor note (`.alb-tot`) stays inside its card. Never one heading + grid per album. Check: 1440 and 390 full-page shots, with Albums grids=1. [Oct 22 2026, Gary: "girl world is an album and why are they stacked vertically"]
- [ ] **Type label matches the section:** a release in Albums must not say "Single" (Girl World is now "Album"; 2019 Redux still says "Single" and needs Gary's call). [Oct 22 2026, Gary/Grok Bot]
- [ ] **Strip unapproved lines from the local music CSS before shipping:** the local home.css music block also contains `.buy-row` (checkout) and `.toast .cico` (toast). Neither ships. Build MUSIC_EDITS from a fresh fetch of live home.css and ship only the approved lines. [Oct 22 2026, Grok Bot]
- [ ] **Check whole-file ships against live first:** before shipping a JS/data file whole, diff it against a fresh, cache-busted fetch of live. If live is an older version (as songs.js was), say what else rides along. [Oct 22 2026, Grok Bot]
- [ ] **Supabase migrations: dependency check before apply and advisors after:** confirm every referenced function/table/column exists live, apply the exact file contents, verify with SELECTs, and compare get_advisors against a baseline. New `authenticated_security_definer_function_executable` WARNs are OK only when every body checks `need('admin')`/uid. [Oct 22 2026, Grok Bot]
- [ ] **Furniture never shares colour codes with the floor or walls:** in every interior and recolour scheme, furniture and props (beds, tables, chairs, shelves, rugs, counters, appliances) use different hex codes from the floor and wall ramps they sit on, including after a recolour is applied. This keeps furniture readable and stops a house recolour or the night grade from bleeding into it. Check: a script compares each furniture tile's colours with the floor/wall colours of every map and scheme it appears in, and reports 0 overlaps. [Oct 22 2026, Gary/Kilumen]
- [ ] **Kilumen runs on PC and on mobile in landscape:** every map, interior, camera rule and UI screen is checked on PC (1280x720, 1920x1080, 2560x1440, keyboard/mouse/controller) AND on phone landscape screens (844x390 CSS, 2340x1080, 2400x1080) plus a 4:3 tablet. Exits, NPCs, signs and interact spots stay clear of the on-screen touch controls (a d-pad on the left, buttons on the right). Rooms smaller than the screen are centred on black with no scrolling. Text and buttons are readable and tappable at phone size; on PC the touch controls are hidden and keyboard prompts show instead. [Oct 22 2026, Gary/Kilumen]
- [Kilumen] Landscape-only play (Gary, Oct 22, 2026): on touch devices held upright the game is covered by a "turn sideways" screen, inputs are cleared, and the manifest asks for landscape. Check every UI/feature in phone landscape (844x390 CSS, 2340x1080, 2400x1080) and never design a portrait layout.
- [ ] **PC and mobile are set up independently:** each platform has its own profile (zoom table, camera, HUD/dialogue layout, controls and prompts, safe areas) in its own config, chosen once at start-up. Tuning one platform never changes the other; test both after any change. [Oct 22 2026, Gary/Kilumen]
- [ ] **Kilumen PC and mobile are independent platform profiles; any layout/zoom/camera/control tuning goes in the platform's own profile file, and both are tested at the checklist sizes.** Files: `src/platform/pc.json`, `src/platform/mobile.json` (picked once by `src/platform.js`; `?platform=pc|mobile`, `?touch=1` = mobile). Checks: `node --test tests/platform.test.mjs`, then `node tests/platform_shots.mjs` + `python3 tests/platform_contact_sheet.py` (PC 1280x720, 1920x1080, 2560x1440, 1440x900; mobile landscape 844x390, 932x430, 780x360, 1024x768 at dpr 2, plus 2340x1080/2400x1080 panels; portrait 390x844 must show the rotate screen; 0 dialogue/touch-button overlaps, 0 console errors). PC 1440p zoom is one named value (`zoom.zoom1440p`, 3x, undecided). [Oct 22, 2026, Gary/Kilumen: "make coder have a mobile and pc set up independtly"; DRAFT]
- [Kilumen] Tiles glow at night only from an emissive mask or list (time_of_day.py EMISSIVE -> time_of_day/emissive/*.png), never because they share a colour with a lamp; interiors are listed once (clock.js INDOOR_OR_CAVE) and never get outdoor time-of-day. [Oct 22, 2026]
- [Kilumen] Text that is written but not yet wired (`text_pending` in a map's lines) is checked every batch: each NPC/sign is loaded into its map, stands on a floor tile that is not a warp, door, exit mat, chair or sign, has its sprite and its line, and appears once. Interact spots still marked pending wait for Gary's call. Check: `node --test tests/batch3.test.mjs` (spawn count per map). [Oct 22, 2026]
- [Kilumen] Button names in dialogue come from the platform profile's `controls.prompts` for the device last used (keyboard/controller on PC, touch on mobile), with `CONFIG.buttonNames` only as a fallback. A line never says a key the player doesn't have. Check the fill output per profile in tests. [Oct 22, 2026]
- [Kilumen] Large dialogue images (battle 64x128 art) are checked for cropping at phone landscape (844x390, 780x330, 2340x1080) as well as PC. The image is sized by scene zoom in CSS px, so on phones it is about 2/3 of the screen height and runs off the top or hides behind the box. The portrait must not cover the d-pad. Toast/battle offsets sit above the touch controls in the mobile profile only. [Oct 22, 2026]
- [Kilumen] "Pin short maps" (camera.pinShortMaps in each profile): an interior up to 1.6 tiles taller than the view pins to its bottom (exit row) and stays still. Rooms smaller than the view stay centred. Check camera y in shots on both profiles. [Oct 22, 2026]
- [Kilumen] A toast shown while a dialogue is open must be visible, above the box and in front of it (the toast was z 3 under the z 4 dialogue on both platforms, so "path closed" style toasts were invisible mid-talk). Per-profile `hud.toastDuringDialog`; toasts with no dialogue stay where they were. On phones, the dialogue portrait and battle image are sized from the space above the box (`dialogPortrait*`, `battleImage` in mobile.json, whole-device-pixel scale) and are checked against the d-pad, A/B and SEL/DBG. Check: `PORT=<port> node tests/batch3_layout_check.mjs` (0 mobile failures) + `python3 tests/batch3_layout_sheet.py`. [Oct 22, 2026]

- **No drinking, drugs or smoking (Gary, Oct 22, 2026, his words: "no hints at drinknig or drugs or smoking at all").** Kilumen (all projects unless Gary says otherwise): hangouts/clubs serve juices, teas, milkshakes and snacks only; no alcohol-style wording or jokes, no liquor-looking bottles, no smoke/haze/fog, no ashtrays, no pill or drug references. Check art, props and lines.
- [Kilumen] Phones hide the d-pad/SEL/DBG during dialogue; A/B stay; lists are tappable (Gary, Oct 22, 2026: "Hide the d-pad during conversations so the box and portrait can be full size"). mobile.json `controls.hideDuringDialog` / `showDpadForLists` / `tapDialog` / `dialogFadeMs` (fade off under reduced motion) and `hud.dialogFull`: the box runs along the bottom from the safe-area margin to just left of B (or full width above A/B if that is under 560px), the portrait is full size on the box's left, and d-pad up/down come back only while a list is open, without overlapping it. Tapping the box acts like A, and tapping a row picks it. PC sets none of these keys. Check: `PORT=<port> node tests/dialog_v3_check.mjs` (0 failures, covering hidden in say, up/down in lists, all back after close) and `python3 tests/dialog_v3_sheet.py`. [Oct 22, 2026]
- [Kilumen] Depth and contact shadows come from the ENGINE depth pass (src/overworld/depth.js + depth.json), drawn over the floor and under characters in the time-of-day grade's shadow colour (grade.shadowDst, the same as cloud shadows). This covers soft shadows under solid furniture, decoration and characters, plus the indoor wall-base strip and inner corners. Art must NOT bake floor drop shadows under furniture or props, and furniture art shows its top plus its front/side faces. Toggle: ?depth=0|1 or key J. Check: `npm test` (tests/depth.test.mjs) and the before/after pairs in _previews/depth_pass/. [Oct 22, 2026]
- [ ] **paigegames.net live counters/animated numbers: animate a hidden copy, announce once.** A count-up inside an `aria-live` region makes screen readers read every step. Keep the counting digits `aria-hidden`, put the final sentence once in a separate visually-hidden `role="status" aria-live="polite"` span, reserve the final width (an invisible copy of the final text in the same grid cell) so the line doesn't reflow, and skip the count-up when the user prefers reduced motion. In browser checks, route ALL `*.supabase.co` requests (mock or block them) so a test can never write live analytics rows. Also note that Python Playwright calls route handlers as `(route, request)`, so a `def h(route, mode=mode)` default-arg capture gets silently overwritten by the request (use keyword-only `*, mode=mode`). [Oct 22, 2026, Grok Bot/visitor banner]
