## Homes + mounts + events merge (Coder, Nov 5 ~3:28 PM CT)
- gear.json 44 items: Belongings sections Weapons/Armor/Trinkets/Tools/Homes/Mounts. One home (`bw` save `s.gear.home`), one mount (`equipped.mount`). Rent cot: Rent → yearly half-price rent at Age +1 (evicted if broke; paused in prison); End rent = no refund. Owned homes sell at 0.5; moving abandons a rented room. Flags has_home / has_mount / owns_hall.
- Slot header icons `assets/gear/slot_<slot>.png`; per-item `assets/gear/<id>.png` (onerror-hidden until art lands). Tournament card shows draft `assets/icons/ui/tournament_banner.png`.
- Story Bot `events_expansion.json` merged at load: **events 125 → 175** (50 x_*). Smoke PASS.
- Waiting: guild/team screens (crest, roster portraits, ui_motion CSS link go in when those screens exist).

## Pack wiring + gear shop (Coder, Nov 5 ~3:25 PM CT)
- **Gear shop live in Belongings:** reads Game Dev `data_fantasy/gear.json` (30 items; weapon/armor/trinket/tool). Buy (auto-equips empty slot), Equip/Unequip, Sell @ sellRate 0.5. Gates: cage minAge, renown(fame) minRenown, realm found (hearthfold always). Equipped bonuses add to skill-check odds. State `s.gear {owned, equipped}` in bw.* save. Icons `assets/gear/<id>.png` optional (onerror hides).
- **Prison UI (card `.pack-polish-prison`):** Behave (conduct → parole after half term), Appeal (law.rules appealCost/appealChance, once per sentence), Escape (tier odds + stealth; fail adds escapeAddYears).
- **Court campaign:** Campaign → court.json question → answer fx → filing resolves.
- **Workshop staff/upgrades:** hire/let go per staffRoles (wage/yr, +12% demand each), build upgrades (demand/ticket/cap mods) in yearly P&L.
- **Hooks:** `events_expansion.json` merged if present (dedupe by id, empty-safe); `gear.json` optional; `assets/css/pack_polish.css` linked.
- Remains: patronage apply flow; Story Bot events_expansion pending (events now 89 base + 36 passion = 125).

## Cross bonuses + art motion (Gary/Game Dev Nov 5 ~3:26–3:30 PM CT)
- `docs/CROSS_BONUSES.md` wired: guild→teamPower +2/+4/+5 (cap +6), team→hire −5/−10/−12% + success +0.02/+0.03, both ≥50 twin banners +1/+1 once/year.
- Stages founding/proven/renowned (≥50); reclaim buy-back or challenge meet; handoff heir→apprentice→captain; flags `cross.*` ON.
- UI: `guild_crest.png` / `tournament_banner.png`, roster busts `adventurer_1..4`, opt-in `assets/ui_motion/tournament_motion.css` (flutter, renown tick, 1st-place sparkle).

## Tournament teams + guild halls
- Deployed: `76074be8` on paige-site main (GitHub Pages `/boundwake/`).
 (Gary Nov 5 ~3:30 PM CT)
- Engine: `team` / `guild` save fields (migrate-safe). Numbers from `docs/TOURNAMENT_TEAMS_BALANCE.md` + `docs/GUILD_HALLS_BALANCE.md`.
- Teams: found (80g+1act, affinity skill 20+, cage 16+), hire/captain/fire, realm meets via Visit Tournament/Arena venues (World Design ids) or notice invite (max 2/yr), Grand **Teams** bracket every 3 years, drill, disband→Codex history.
- Guild halls: found in current realm (cage 18+, realm costs/gates), fee Low/Mid/High, hire tiers by renown, yearly batch jobs on Age+1 → journal + coffer/renown.
- UI: Adventure team card + Teams entry; Work accordion for guild hall; Belongings summaries.
- Venues: use World Design pins in `regions.json` (hf_ribbon_green, gm_pier_ring, … halls Mossbeam/Tidebell/Reedlodge/Quillkey/Cinderhorn, sw_grand_tiers).
- Smoke: `node tests/smoke.mjs` PASS (extended lightly).

## Calendar-age gates (Gary playtest Brynn dwarf, Nov 5 ~2:34 PM CT)
Player age gates use cage=floor(age): adventure 10+, jobs, travel 14+, tournaments every 3 calendar years, path/styles. hage kept for longevity/portrait/death. Work Locked shows why. Age button anim off. PRG journal throttled.

## Public alpha + icon shrink (Gary Nov 5 ~2:27 PM CT)
Commit 2303abc9 on paige-site. /boundwake/ open (no admin gate). games.js live+alpha. Skill PNGs capped ~24–32px. Shots: tests/shots/live_desktop_top_skills.png, live_homepage_games.png.

## Dense Skills + Life shortcuts (Gary Nov 5 ~2:21 PM CT)
Accordion Boundwake categories; dense icon/name/bar/Train rows; lock reasons; Life shortcut grid. Phone stacked fill. Pack-reskin untouched.

## Tournaments (Gary Nov 5 ~2:11 PM CT)
- Every 3 calendar years (age 3,6,9…): Adventure lists Blade / Spark / craft meets by bracket (hage 1–7 / 8–15 / 16+).
- Entry = 1 action. Placements pay gold + renown; 1st–3rd can invite Boundwake dojos / academies / tutors.
- Answer invites on Adventure (enroll mentor, skill boost). Life banner when lists are open.
- Kids in Village lessons can enter child bracket; child purses scaled down (not adult wages).

## Growth playable (Gary Nov 5 ~2:04 PM CT)
- Skills UI: Train shows lock WHY (too young / mana / no actions). Soft cats from hage~2 (×0.55). Martial from hage 6. Sword styles at 8.
- Mana: Attempt awakening (age 6+) or Academy Visit; spark-born at birth. Practice magic (5 mana) + school pick (Boundwake names). Mana bar when awake.
- Sword style pick + drillSword; style bonuses in raceMult + adventure weights. Route pick on Skills + Life.
- Engine: trainLockReason, seekAwakening, chooseSwordStyle/MagicSchool, practiceMagic, drillSword, visitLocation academy awaken.
- Deploy skill PNGs + this growth live.

# Boundwake — STATUS (Nov 5, 2026, CT — pack reskin pass + admin live)
**Playable shell: YES.** `/workspace/boundwake`. Run: `python3 -m http.server 8090` → http://localhost:8090/
Tests: `node tests/smoke.mjs` (120 lives, PASS), `node tests/ui_standard_shot.mjs` (headless Chrome).
Pack map: `docs/PACK_RESKIN.md`.

## Live (admin only)
- **URL:** https://paigegames.net/boundwake/
- **Gate:** owner/admin via `admin_me` (localhost open). Not in `games.js`/homepage/sitemap; robots Disallow `/boundwake/`; page `noindex`.
- Do not announce, itch, or App Store.

## Gary locks (unchanged)
- **1 turn = 1 year** (`turnYears` always 1). Age button: `Age +1`.
- **Pillars** only (`swordsmanship`, `spellcraft`, `smithing`): lifespan > 90 → flat 1.5× pace; post 100/60/25 curve taper 50%→1% by `hage`. Other skills unchanged.
- Saves `bw.*` prefixed.

## Illustrated scenery (Gary Nov 5 ~1:29–1:36 PM CT)
- Lifeline-class living backdrop: SVG sky + realm midgrounds keyed by **realm** + time-of-day (`?tod=`).
- **Hearthfold** = fantasy woodland vale (ancient oaks, ferns, winding path, glowing grove, standing stones) — **no cottage/house** (Gary: not 1-for-1 with Lifeline suburban window).
- Other realms: Glassmarket coast / Thornreed wilds / Spireward spires / Emberlight fort — no leftover house motifs.
- Soft CSS motion (clouds/mist, orb bob, birds, boats/waves, grove pulse) + canvas motes/fireflies; pause when tab hidden; `prefers-reduced-motion` / `?ambient=0`.
- Scenery window + vignette; realm cross-fade. Shots: `tests/shots/ui_backdrop/` + `tests/shots/ui_backdrop_forest/`.
- **Flare icons colored** (Gary ~1:38 PM CT): each `.ico-*` has its own fill (gold coin gold, health crimson, mana blue, …) — not flat black ink stamps. Header icons stay white on accent bars.
- **Modifier info panel** (Gary ~1:39 PM CT): tap affinity / trait / Echo / flared modifiers for a parchment sheet explaining real coded effects (`src/info.js`). Close via ×, Got it, backdrop, or Escape. Does not steal Age/choice taps.
- **Expansive PC layout** (Gary ~1:41–1:48 PM CT): ≥1024px three-column shell that **fills the viewport** (tall panels, wide stage). Tabs wrap so Realms/Codex/Belongings stay reachable. Mobile stack unchanged.
- **Everyday jobs** from age 6+ (stablehand, orchard, inn hand, mill, cook, courier, fisher, shop clerk, carpenter, weaver, farmhand…). Guild tracks stay later.
- **Bond sheets**: each living person shows Health/Spirit/Wits/Presence/Strain/Renown + job/title + closeness. **Never gold.**
- **Realms have purpose**: Visit locations (1 act) by kind — park/pond spirit+health, stalls gold/barter, academy literacy/focus, landmarks spirit, homes gossip, civic renown; discovers Codex + visit bias. Travel (14+) switches realm. Tall menus scroll.
- **Passive Relationship Growth**: party (max 3), housemates (family/partner/kids), and coworkers get +3–7/yr when temperaments match; clashes fade as usual. Temperament shown on bond cards.
- **Per-skill icons**: unique colored SVG per skill id; uses `assets/icons/skills/{id}.png` when Character Models delivers. Bond jobs: Child (<6), Village lessons (6–11), real jobs only at 12+.
- **Music beds** (`assets/music/*.ogg`): hub_life (Life/Work/Skills/Bonds), adventure_travel (Adventure/Realms), dusk_night (dusk/night TOD). Crossfade ~1.4s; mute persists `bw.music.muted`; starts after first gesture. Volume ~0.4.

## UI studio standard pass
- Docked Age +1 in opaque bottom chrome (content pad + solid dock; hidden while event sheet open). No floating CTA over lists.
- Per-menu craft: saturated header bars, tinted bodies, left-accent rows, filled tab chips (Life green / Work rust / Adv teal / Skills blue / Bonds rose / …).
- Portrait multi-ring frame; grid sprites `{race}_{age}_{m|f}.png` when present (human baby/child/adult shown in standard shots); initials only if file missing (e.g. dwarf child).
- Tall glossy bars; mana `cur/max` full-width row; Lifeline-weight choice buttons (colored borders + 3px shadow); journal year headers; empty states; focus-visible; safe-area.
- Ledger: `docs/UI_STANDARD_LEDGER.md`. Shots: `tests/shots/ui_standard/`.
- Refero MCP unavailable (subscription); craft locked from Lifeline after shots + vivid/app CSS + Kilumen theme + Boundwake mood doc.

## Works now
- Cold open → fate → hub; year turn; 29 skills / 7 cats; ordinary + guild careers; ~125 events (base+passion); bonds/PRG/party; 5 realms + Visit; death/reincarnate/heir; Codex; parchment UI + ambient + music; admin gate.
- **Pack systems wired:** ailments (healer), realm law, pastimes, workshops/stalls, notice boards, court seats, mentors, circles, world activities (Life tab).


## Stubs / gaps
- Events ~125 vs Lifeline ~203 (more prose later). Gear shop stub. Workshop staff/upgrade UI summary-level. Court campaign questions auto-resolve. Patronage grants data-ready, apply UI thin. Prison behave/appeal/escape not in UI yet.
- **Tournament teams + adventure guilds** (Gary Nov 5 ~3:18 PM CT; Game Dev balance sheets) — **SHIPPED** this pass. See CHANGES.
- Sprite grid incomplete; fonts not vendored.
- Not done on purpose: no PWA, Capacitor/iOS, public listing.

## Pack reskin (Nov 5 ~2:00–2:15 PM CT)
- Inventory + map in `docs/PACK_RESKIN.md`.
- New data: ailments, law, passions (+events), workshops, notices, court, mentors, patronage, world_activities, world_legacy.
- Engine + additive UI hooks (Life/Work/Belongings). Did not rewrite desktop/music/bonds/PRG/realms craft.
