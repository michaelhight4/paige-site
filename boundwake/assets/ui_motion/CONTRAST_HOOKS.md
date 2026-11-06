# Boundwake UI contrast polish — wire notes (Coder)

**Ask:** Gary Nov 5 2026 — background matched panel colors; not enough contrast. Soft dusk pass rejected ("im saying its too soft" / "SOFT"). Latest: **"i want more contrast in the ui"** + cream-on-cream Life Goals screenshot + **"maybe use more colors then fuck ass cream?"**  
**Folder:** `/workspace/boundwake/assets/ui_motion/`  
**CSS:** `contrast_polish.css` — **HARD pass v3** (pure override; load **after** `style.css`)  
**Does not** edit `style.css` / `index.html` / `src/*`. Coder wires.

## One-line link

```html
<link rel="stylesheet" href="assets/ui_motion/contrast_polish.css" />
```

Place after the main stylesheet link (e.g. after `style.css`). No JS required.

## What changed and why

### A. Desktop columns + plates (kept / strengthened from v1)

Desktop (`min-width: 1024px`) column shells `.play-hub` / `.play-main` / `.play-side` → **hard plum night** `#221a34` → `#140e1f` (NOT soft mid-dusk `#3a3148` / `#2a2238`). Nested hub / Life / side cards restore **opaque parchment** so plates lift off the dark columns.

### B. Life Goals cream-on-cream (new — Gary screenshot)

`.panel-legacy` parchment shell + nested `.legacy-row` tiles were both cream/beige with soft gold borders → edges disappeared.

This pack:

1. Keeps panel shell as parchment reading surface.
2. Tints `.panel-legacy .card-body` as a **moss / life well** (not another cream plate).
3. Colors nested goal / achievement tiles with Boundwake hue tokens — **not darker beige**:
   - default / progress → `--life-t` / `--moss` green age plates
   - `.legacy-ready` → gold / `--bel-t` claim plates
   - `.legacy-claimed` → `--mist` / `--sk-t` cool done plates
4. Strengthens nested tile borders to **2px** darker gold/brown (`#8a6a3a` mix) + inset shadow.
5. Darkens `.legacy-bar` track so empty progress isn’t invisible.
6. Applies on **mobile + desktop**.

Mood lock: parchment for reading surfaces; goal cards / wells / status carry distinct hue; ink `#241C14`; gold `#E0B14A` / `#B07D24`; plum night `#221a34`→`#140e1f`.

## Exact selectors overridden

### Desktop columns / plates (`@media (min-width: 1024px)`)

| Selector | Override |
|----------|----------|
| `.play-hub, .play-main, .play-side` | hard plum night `#221a34` → `#140e1f`; border `#e0b14a44` |
| `.play-hub > .card.hub` (+ `.card-body`) | opaque parchment `#FBF4E4` → `#F7EBD2` |
| `.play-body > .card.panel-life` | opaque parchment + life accent ring |
| `.play-body > .card.panel-life .card-body` | keep `life-t` mix |
| `.play-side.card, .card.panel-side` | opaque parchment + realm accent ring |
| `.panel-side .card-body, .play-side .card-body` | keep `realm-t` mix |
| even `.row` on hub/life/side | subtle `--parch2` well (not Legacy nest) |

### Life Goals / Achievements (mobile + desktop)

| Selector | Override |
|----------|----------|
| `.card.panel-legacy, .panel-legacy` | parchment shell + gold/`#8a6a3a` border |
| `.panel-legacy .card-body` | life/moss **well** (not cream) |
| `.panel-legacy .row.legacy-row`, `.row.legacy-row` | life-t plate, 2px border, left life rail, inset shadow |
| `.legacy-row.legacy-progress` | moss / life plate |
| `.legacy-row.legacy-ready` | gold / bel-t claim plate, louder gold border |
| `.legacy-row.legacy-claimed` | mist / sk-t cool plate (opacity restored to 1) |
| `.legacy-bar` | dark track (`parch2`×`#3a2a18`); ready track gold2-dark |
| `.legacy-bar > span` | gold → moss fill gradient |
| `body[data-tab="legacy"] .play-body > .card.panel-legacy` | desktop opaque plate against plum columns |

Key hexes: columns `#221a34`/`#140e1f`; parch `#FBF4E4`/`#F7EBD2`; life `#3F7A3A` / life-t `#EEF5E6`; moss `#2F7A48`; gold `#E0B14A` / gold2 `#B07D24`; mist `#5A82A8`; bel-t `#F6EED4`; sk-t `#E8EEF8`; ink-edge `#8a6a3a`.

## Suggested permanent merge into `style.css`

1. Keep / confirm desktop columns at **lines ~409–414** as `linear-gradient(180deg, #221a34, #140e1f)` — do **not** soften.
2. Keep opaque nested hub / Life / side plates (do not re-transparent them).
3. Add the Legacy nested-tile hue rules near the Legacy hub block (~lines 908–927): panel body well + `.legacy-row` status colors + darker `.legacy-bar` track.
4. After merge, this drop-in can be removed or left as a safety net.

## Preview

Open `contrast_preview.html` via `file://` (self-contained: hard columns + Life Goals cream-on-cream before / colored tiles after). Optional `contrast_preview.png` if rendered on the box.
