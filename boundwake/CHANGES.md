## Cross bonuses + team/guild art (Nov 5 ~3:30 PM CT)
- Engine: CROSS_BONUSES.md + Gary reclaim/handoff/stages; UI crests/banners/roster busts + tournament_motion.css hooks.

## Tournament teams + adventure guild halls (Gary Nov 5 ~3:30 PM CT)
- `bw_engine.js`: team + guild systems per Game Dev balance sheets; Visit hooks on Tournament/Arena/Guild hall kinds; guildYear on Age+1; notice-board team meet invites.
- `ui.js`: Adventure team panel + Grand Teams; Work guild-hall accordion; Belongings lines; handlers `tfound`/`tmeet`/`tgrand`/`gfound`/…
- `data_fantasy/regions.json`: World Design venue pins (11) — halls + meet grounds + sw_grand_tiers.
- `tests/smoke.mjs`: light team/guild exercise; PASS.
- Docs: balance sheets supersede interim defaults in `TOURNAMENT_TEAMS_AND_GUILDS.md`.

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

# Changes vs Lifeline engine (fork record)
- Kept verbatim: rng.js, core.js, fmt.js.
- Lean `src/bw_engine.js` with fantasy pack semantics; storage `bw.*`.
- Dropped Earth systems (business, studio, sports, politics, online, crime, premium…).

## Nov 5 2026 (Gary locks + UI soul)
- `turnYears` always 1; pillar pace/taper; per-menu soul CSS; flare icons; admin gate; live `/boundwake/`.

## Nov 5 2026 (UI studio standard — this pass)
- Structural: Age docked in opaque `#dock` (Lifeline nav pattern); `#stage` bottom pad; dock hidden on event sheets.
- Craft: per-menu header bars + tinted card bodies + left-accent rows; filled tab chips; portrait multi-ring; taller glossy bars + mana layout; choice buttons with cycling border colors + 3D shadow; journal year weight; empty dashed states; focus rings; safe-area.
- QA: `?race=` for local portrait proof; shots under `tests/shots/ui_standard/`.
- Identity stays Boundwake parchment/realm — not Lifeline modern-life skin or Kilumen overworld.

## Nov 5 2026 (illustrated scenery add-on)
- New `src/ambient.js` + `#bw-amb` layer: realm scenery (Hearthfold / Glassmarket / Thornreed / Spireward / Emberlight) with TOD grading; replaces bare motes-only void.
- CSS motion + particle canvas; scenery window pad on `#stage`; soft vignette. No engine/UI-structure redo.

## Nov 5 2026 (forest nudge — not Lifeline 1-for-1)
- Hearthfold cottage/house silhouette removed; woodland vale (oaks, canopy, ferns, path, glowing grove, stones).
- Orb/cloud composition nudged (sun left-of-center; mist banks) so framing ≠ Lifeline hills+house+three clouds.
- Grove heart soft pulse in CSS; other realms unchanged except no house motifs.
- Flare icons: per-`.ico-*` CSS colors + filled gold coin / dice; header icons stay white on accent bars.
- Modifier info panel (`src/info.js`): tap chips for coded affinity/trait/Echo blurbs; parchment sheet; no invented bonuses.
- Expansive PC layout (≥1024px): hub | main | side peek; Age under hub column; mobile stack unchanged.

## Nov 5 2026 (tabs wrap + everyday jobs + bond sheets + viewport fill)
- Tabs: flex-wrap + visible; no clipped Realms/Codex/Belongings.
- Everyday ordinary careers (age 6–10 entries); Work gate age 6; openings split Everyday / Guild.
- Bond cards: persisted stats + jobTitle; no gold; yearly light drift.
- Desktop: stage nearly full width; columns stretch to 100dvh; journal flex-fills.

## Nov 5 2026 (original music beds)
- `src/music.js` + `assets/music/{hub_life,adventure_travel,dusk_night}.ogg` (MP3 fallback).
- Tab/TOD selection; 1.4s crossfade; mute toggle; autoplay-safe unlock on first gesture.

## Nov 5 2026 (skill icons + bond child jobs)
- Unique `skillIco(id)` SVGs + PNG prefer path `assets/icons/skills/{id}.png`.
- Bonds under hage 12 never show real occupations (Child / Village lessons); re-clamp old saves.

## Nov 5 2026 (Passive Relationship Growth)
- `p.inParty` (cap 3); yearly +3–7 closeness instead of fade; partner gets the same under-one-roof boost.
- Bonds UI Add/Leave party; Adventure lists traveling companions.

## Nov 5 2026 (PRG: housemates, coworkers, temperaments)
- Bonds get a persisted temperament; clash table gates Passive Relationship Growth.
- Housemates + same-job coworkers qualify (one boost/year with party).

## Nov 5 2026 (Realms Visit + scroll)
- `visitLocation(s, locId)` spends act; kind-based effects; Codex + visit_bias. Pond Visit ≠ Life Rest-by-pond.
- Realms UI: Visit on current realm places; Travel here on others; scrollable play-body / realms-stack.

## Nov 5 2026 (Lifeline pack → Boundwake fantasy reskin)
- `docs/PACK_RESKIN.md`: full Lifeline→Boundwake file map.
- New `data_fantasy/` packs: ailments, law, passions, passion_events, workshops, notices, court, mentors, patronage, world_activities, world_legacy; events expanded (~42→~89 +36 passion).
- `pack.js` loads them; passion events merge into event pool.
- `bw_engine.js`: year ticks + actions for ailments/healer, law/prison, pastimes, workshops, notices, court, mentors, clubs, world activities.
- `ui.js` additive panels on Life / Work / Belongings (no revert of PRG, music, realms Visit, skill styles).
