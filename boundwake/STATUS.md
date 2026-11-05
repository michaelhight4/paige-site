# Boundwake — STATUS (Nov 5, 2026, CT — UI studio standard + admin live)
**Playable shell: YES.** `/workspace/boundwake`. Run: `python3 -m http.server 8090` → http://localhost:8090/
Tests: `node tests/smoke.mjs` (120 lives, PASS), `node tests/ui_standard_shot.mjs` (headless Chrome).

## Live (admin only)
- **URL:** https://paigegames.net/boundwake/
- **Gate:** owner/admin via `admin_me` (localhost open). Not in `games.js`/homepage/sitemap; robots Disallow `/boundwake/`; page `noindex`.
- Do not announce, itch, or App Store.

## Gary locks (unchanged)
- **1 turn = 1 year** (`turnYears` always 1). Age button: `Age +1`.
- **Pillars** only (`swordsmanship`, `spellcraft`, `smithing`): lifespan > 90 → flat 1.5× pace; post 100/60/25 curve taper 50%→1% by `hage`. Other skills unchanged.
- Saves `bw.*` prefixed.

## Illustrated scenery (Gary Nov 5 ~1:29 PM CT)
- Lifeline-class living backdrop: SVG hills/sky/cottages/coasts/wilds/spires/forts keyed by **realm** + device time-of-day (dawn/day/dusk/night; `?tod=`).
- Soft CSS motion (clouds, orb bob, birds, boats/waves) + canvas motes/fireflies; pauses when tab hidden; off for `prefers-reduced-motion` and `?ambient=0`.
- Scenery window above hub cards; vignette keeps parchment readable. Cross-fade on realm travel.
- Shots: `tests/shots/ui_backdrop/` (stills — motion noted in README).

## UI studio standard pass
- Docked Age +1 in opaque bottom chrome (content pad + solid dock; hidden while event sheet open). No floating CTA over lists.
- Per-menu craft: saturated header bars, tinted bodies, left-accent rows, filled tab chips (Life green / Work rust / Adv teal / Skills blue / Bonds rose / …).
- Portrait multi-ring frame; grid sprites `{race}_{age}_{m|f}.png` when present (human baby/child/adult shown in standard shots); initials only if file missing (e.g. dwarf child).
- Tall glossy bars; mana `cur/max` full-width row; Lifeline-weight choice buttons (colored borders + 3px shadow); journal year headers; empty states; focus-visible; safe-area.
- Ledger: `docs/UI_STANDARD_LEDGER.md`. Shots: `tests/shots/ui_standard/`.
- Refero MCP unavailable (subscription); craft locked from Lifeline after shots + vivid/app CSS + Kilumen theme + Boundwake mood doc.

## Works now
- Cold open → fate → hub; year turn; 29 skills / 7 cats; 15 careers; 42 events; bonds; 5 realms; death/reincarnate/heir; Codex; parchment UI + motes; admin gate.

## Stubs / gaps
- Events ~42/80; sprite grid incomplete (no dwarf child/teen etc.); shop stub; combat skill-weighted roll; fonts not vendored.
- Not done on purpose: no PWA, Capacitor/iOS, public listing.
