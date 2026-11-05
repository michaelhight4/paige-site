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
