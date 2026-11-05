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
- Events ~125 vs Lifeline ~203 (more prose later). Gear shop stub. Workshop staff/upgrade UI summary-level. Court campaign questions auto-resolve. Patronage grants data-ready, apply UI thin. Prison behave/appeal/escape not in UI yet. Full troupe/studio loop not ported.
- Sprite grid incomplete; fonts not vendored.
- Not done on purpose: no PWA, Capacitor/iOS, public listing.

## Pack reskin (Nov 5 ~2:00–2:15 PM CT)
- Inventory + map in `docs/PACK_RESKIN.md`.
- New data: ailments, law, passions (+events), workshops, notices, court, mentors, patronage, world_activities, world_legacy.
- Engine + additive UI hooks (Life/Work/Belongings). Did not rewrite desktop/music/bonds/PRG/realms craft.
