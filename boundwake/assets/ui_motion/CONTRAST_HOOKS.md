# Boundwake UI contrast polish — wire notes (Coder)

**Ask:** Gary Nov 5 2026 — background colors matched panel colors; not enough contrast.  
**Folder:** `/workspace/boundwake/assets/ui_motion/`  
**CSS:** `contrast_polish.css` (pure override; load **after** `style.css`)  
**Does not** edit `style.css` / `index.html` / `src/*`. Coder wires.

## One-line link

```html
<link rel="stylesheet" href="assets/ui_motion/contrast_polish.css" />
```

Place after the main stylesheet link (e.g. after `style.css`). No JS required.

## What changed and why

Desktop (`min-width: 1024px`) column shells `.play-hub` / `.play-main` / `.play-side` used a cream parchment gradient (`color-mix` of `--parch3`/`--parch` with `#120c1d`). Nested hub / Life / side cards were then set to `background: transparent` so content sat on the cream columns → **no plate lift**.

This pack:

1. Paints column shells as **plum night** plates (`#221a34` → `#140e1f`), gold hairline `#e0b14a44`, soft shadow kept.
2. Restores **opaque parchment** (`#FBF4E4` → `#F7EBD2`) + normal card border / `--shadow-card` / `--r-card` on hub, Life, and side plates so they read against the dark columns again.
3. Leaves Life / realm **card-body** tint mixes intact.
4. Does **not** touch mobile dock, body ink/gold tokens, or Bit Tensie / Lifeline chrome.

Mood lock: parchment cards, ink `#241C14`, gold `#E0B14A` / `#B07D24`, plum night `#2C2140` — desktop frames with plum night; cards near-opaque; ≥4.5:1 body text.

## Exact selectors overridden

All under `@media (min-width: 1024px)`:

| Selector | Override |
|----------|----------|
| `.play-hub, .play-main, .play-side` | background → plum night gradient `#221a34` → `#140e1f`; border `#e0b14a44` |
| `.play-hub > .card.hub` | opaque parchment gradient + card border/shadow (was transparent) |
| `.play-hub > .card.hub .card-body` | parchment gradient (was transparent) |
| `.play-body > .card.panel-life` | opaque parchment + card border/shadow (was transparent) |
| `.play-body > .card.panel-life .card-body` | keep `life-t` mix against parch |
| `.play-side.card, .card.panel-side` | opaque parchment + card border/shadow (was transparent) |
| `.panel-side .card-body, .play-side .card-body` | keep `realm-t` mix against parch |
| `.play-hub/.play-body/.play-side .row:nth-child(even)` | subtle `--parch2` well deepen |

## Suggested permanent merge into `style.css`

Replace the desktop block around **lines 409–461** (the cream column gradient + transparent nested cards) with the same rules as this pack:

- Columns: `linear-gradient(180deg, #221a34, #140e1f)` (or `color-mix` of `--plum` / `#120c1d` with ≤~12% parch warmth).
- Nested `.card.hub` / `.panel-life` / `.play-side.card` / `.panel-side`: restore `linear-gradient(180deg, var(--parch3), var(--parch))` plus standard `.card` border + `var(--shadow-card)` (do not leave `background: transparent` / `border: 0` / `box-shadow: none` on those plates).
- Keep flex / overflow / dock / tabs layout rules as they are today — only swap background / border / shadow on the plates listed above.

After merge, this drop-in can be removed or left as a no-op safety net.

## Preview

Open `contrast_preview.html` via `file://` (self-contained before/after). Optional `contrast_preview.png` if rendered on the box.
