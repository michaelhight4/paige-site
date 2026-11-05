# Boundwake UI standard pass — decision ledger (Nov 5, 2026 CT)

Designing Boundwake hub/menus/sheets for Paige Games admin play on phone-first web.
Goal: shippable craft matching Lifeline + Kilumen *craft* (not their skins).
Tone: fantasy life sim — parchment plates on plum night, lantern gold CTA.
Main risk: another timid cream restyle that still reads as a first draft.
Must remember: Age +1 never covers content; per-menu identity is bold but one product; sprites when files exist.
Constraints: no gameplay changes; Boundwake identity (not Lifeline modern-life / Kilumen overworld / BitLife clones); no new art inventing.
Research: Refero MCP expired (NO_SUBSCRIPTION) → bundled anti-slop + Lifeline after shots (`lifeline/shots/ui_review/after`) + Lifeline `ui/css/{app,vivid}.css` + Kilumen `src/ui/theme.css` + Boundwake `fantasy_lifesim/world/ui_mood_layout.md` + current `tests/shots/ui_alive/`.
Path: direct build against locked direction.

## Reference lock
Primary: Lifeline vivid+app craft (per-area hue, 3D buttons, Age in dock, journal year weight, sheet choice weight, portrait ring).
Preserve for Boundwake: parchment plate + lantern gold CTA + plum night chrome; 192² sprite portraits; fantasy menu names.
Borrow: Lifeline docked Age (content pad); per-area saturated header bar + tinted body + left-accent rows; glossy tall bars; choice buttons with colored border + drop shadow; Kilumen thick outline + plate-on-pattern rule (text on solid plate).
Reject: safe cream-everything; timid gold-only tabs; floating Age over lists; decorative italic keyword flares as the polish; copying Kilumen creature HUD or Lifeline hills skin.
Media: real `assets/sprites_192/grid/{race}_{age}_{m|f}.png` only; initials fallback when missing (dwarf child absent = initials OK).

| Decision | Source | Role | Why |
|----------|--------|------|-----|
| Dock Age +1 in bottom chrome; pad stage | Lifeline `.nav`/`.agebtn` + ui_alive Skills collision | CTA never covers content | Known issue; Lifeline solved it |
| Saturated per-menu accent + header bar + body tint | Lifeline vivid.css + Kilumen `[data-scr]` | Identity without new skin | Soul pass was too timid |
| Tall glossy bars; mana label/value row | Lifeline `.bar` | Readability | Mana 10/0 glitch / cramped Work |
| Choice opts min 48px, border+3px shadow | Lifeline sheet `.opt` | Weight | Event sheet felt flat |
| Portrait multi-ring frame + pixelated img | Lifeline avatar ring + mood doc 192² | Finished character presentation | Initials well looked unfinished |
| Journal year as accent underline header | Lifeline `.j-age` | Hierarchy | Plain text in a box |
| Keep parchment/gold/plum | Boundwake mood doc | Brand | Not AI cream-default — product lock |
| No decorative italic word-swap polish | anti-ai-slop #4 | Avoid slop | Lead lines stay quiet, not italic-as-taste |
