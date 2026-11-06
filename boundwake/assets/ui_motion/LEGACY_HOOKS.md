# Boundwake UI motion hooks — Legacy / Autopilot

**Folder:** `/workspace/boundwake/assets/ui_motion/`  
**CSS:** `legacy_motion.css` (self-contained; transform + opacity + width on bar fill)  
**Mood:** parchment Boundwake — lantern gold on `#F4E6C8`. See `fantasy_lifesim/world/ui_mood_layout.md` §Motion and `docs/AUTOPILOT.md`.  
**Does not** require `tournament_motion.css`. Keep tournament `HOOKS.md` separate.

Do **not** force-import into live `index.html` until Coder wires opt-in. Preferred: link from Legacy / Life panels that need it.

```html
<link rel="stylesheet" href="assets/ui_motion/legacy_motion.css" />
```

Live markup already uses: `panel-legacy`, `.legacy-row`, `.legacy-bar > span`, Claim buttons (`data-a="lgclaim"|"achclaim"|"lgclaimall"|"achclaimall"`), `.legacy-claimed`, `.auto-host`, `.auto-blurb`, `.auto-actions`, `.dock-auto`, `.auto-skip`, `.auto-stop`.  
This pack adds **additive** `bw-*` classes — do not rewrite `style.css` / `src/*` / Lifeline.

---

## Hook IDs / classes

### A. Panel open (Legacy tab)

| Selector | Role |
|----------|------|
| `.bw-legacy-panel` | Additive on Legacy cards (goals / ach / mods / lead) |
| `.bw-legacy-panel-in` or `.is-opening` | One-shot enter (~280ms fade+lift) |

**When to fire**
- Tab enter Legacy / first paint of goals, achievements, mods cards.
- Stagger is CSS nth-of-type — add class to each card in DOM order.
- Never animate the whole app chrome.

**Markup (Coder add to existing `card('legacy', …)` host)**
```html
<div class="card panel-legacy bw-legacy-panel bw-legacy-panel-in">…</div>
```

**JS pattern**
```js
function openLegacyPanels(root = document) {
  root.querySelectorAll('.panel-legacy, .card.panel-legacy').forEach((el) => {
    el.classList.add('bw-legacy-panel');
    el.classList.remove('bw-legacy-panel-in', 'is-opening');
    void el.offsetWidth;
    el.classList.add('bw-legacy-panel-in'); // or is-opening
  });
}
```

**Duration:** ~220–320ms (pack uses 280ms).  
**Reduced motion:** snap visible (no travel).

---

### B. Progress bars

| Selector | Role |
|----------|------|
| `.bw-legacy-bar` | Additive on `.legacy-bar` |
| `.bw-legacy-bar-fill` | Alias on the inner `span` |
| `is-filling` | One-shot fill + optional gold sheen (~520ms) |
| `--bw-bar-from` / `--bw-bar-to` | Optional CSS vars on the fill (`0%`–`100%`) |

Live already sets `style="width:NN%"` on the span. Prefer: keep inline width as target; set `--bw-bar-from` to previous pct (or `0%` on first reveal); toggle `is-filling`.

**Markup**
```html
<div class="legacy-bar bw-legacy-bar">
  <span class="bw-legacy-bar-fill is-filling"
        style="width:72%; --bw-bar-from:40%; --bw-bar-to:72%"></span>
</div>
```

**JS pattern**
```js
function fillLegacyBar(span, fromPct, toPct) {
  span.classList.add('bw-legacy-bar-fill');
  span.parentElement?.classList.add('bw-legacy-bar');
  span.style.setProperty('--bw-bar-from', Math.round(fromPct) + '%');
  span.style.setProperty('--bw-bar-to', Math.round(toPct) + '%');
  span.style.width = Math.round(toPct) + '%';
  span.classList.remove('is-filling');
  void span.offsetWidth;
  span.classList.add('is-filling');
  const clear = () => span.classList.remove('is-filling');
  span.addEventListener('animationend', clear, { once: true });
  setTimeout(clear, 650);
}
```

**Reduced motion:** snap to `--bw-bar-to` / inline width; no sheen travel.

---

### C. Claim pulses

| Selector | Role |
|----------|------|
| `.bw-claim` | Additive on Claim button |
| `.bw-claim-pulse` | Optional alias on button or row host |
| `is-claiming` | One-shot gold+moss pulse (~600ms) |
| `.bw-claim-spark` | Optional absolute check mote (img/svg) |
| `.bw-claim-settled` | Optional after pulse; leave `.legacy-claimed` opacity alone |

**When to fire**
- After successful `lgclaim` / `achclaim` / Claim All.
- Claim All: add `is-claiming` to up to **6** ready `.legacy-row`s (CSS stagger 0–350ms).

**Markup**
```html
<button type="button" class="primary bw-claim bw-claim-ready"
        data-a="lgclaim" data-v="goal_id">
  Claim
  <span class="bw-claim-spark" aria-hidden="true">
    <img src="assets/ui_motion/claim_spark.svg" alt="" width="22" height="22" />
  </span>
</button>
```

**JS pattern**
```js
function fireClaim(btnOrRow) {
  const host = btnOrRow.closest?.('.legacy-row') || btnOrRow;
  const btn = host.querySelector?.('.bw-claim, [data-a="lgclaim"], [data-a="achclaim"]') || btnOrRow;
  btn.classList.add('bw-claim');
  host.classList.remove('is-claiming');
  btn.classList.remove('is-claiming');
  void host.offsetWidth;
  host.classList.add('is-claiming');
  btn.classList.add('is-claiming');
  const clear = () => {
    host.classList.remove('is-claiming');
    btn.classList.remove('is-claiming', 'bw-claim-ready');
  };
  btn.addEventListener('animationend', clear, { once: true });
  setTimeout(clear, 750);
}

function fireClaimAll(rows) {
  [...rows].filter((r) => r.classList.contains('legacy-ready') || r.querySelector('.bw-claim-ready'))
    .slice(0, 6)
    .forEach((r) => fireClaim(r));
}
```

**Duration:** ~500–700ms (pack 600ms). Then settle into `.legacy-claimed` (existing `opacity: .78` in `style.css` — do not override).

---

### D. Ready-to-claim idle

| Selector | Role |
|----------|------|
| `.bw-claim-ready` | On Claim button when status is `ready` (complete, unclaimed) |

**When to show**
- While goal/achievement is ready to claim.
- Remove on claim start / after claim.

**Loop:** ~2.5s soft gold breathe.  
**Pause:** `html[data-motion="paused"]`.  
**Reduced motion:** static thin gold outline; no breathe.

---

### E. Autopilot / Skip visibility polish

| Selector | Role |
|----------|------|
| `.bw-auto-host` | Additive on `.auto-host` — min-height, ink contrast, no collapse |
| `.bw-auto-skip-flash` | Optional host for flash (card or dock) |
| `is-skipping` | One-shot lantern-gold edge (~350ms) on year advance |
| `.bw-auto-dock` | Additive on `.dock-auto` — pressed / disabled / Stop ember |

**Critical for Coder:** after `ageUp` / skip re-render, keep **`auto-host` + `bw-auto-host`** on the Autopilot Life card so the body never goes blank again. Live already passes `'auto-host'` as the card class arg (`ui.js` ~212–218).

**Markup**
```html
<!-- Life card -->
<div class="card panel-life auto-host bw-auto-host bw-auto-skip-flash">…</div>

<!-- Age dock -->
<div class="dock dock-auto bw-auto-dock bw-auto-skip-flash">
  <div class="auto-row">… <button class="auto-skip" data-a="skip" data-v="5">+5</button> …</div>
</div>
```

**JS pattern (each skipped year)**
```js
function flashSkip(el) {
  if (!el) return;
  el.classList.add('bw-auto-skip-flash');
  el.classList.remove('is-skipping');
  void el.offsetWidth;
  el.classList.add('is-skipping');
  const clear = () => el.classList.remove('is-skipping');
  el.addEventListener('animationend', clear, { once: true });
  setTimeout(clear, 400);
}
// Prefer flashing .auto-host card; dock is fine as secondary.
```

**Reduced motion:** static gold outline; no flash animation. Pressed dock state still OK without motion.

---

## Assets (optional)

| File | Use | ~Size |
|------|-----|-------|
| `claim_spark.svg` | Check mote inside `.bw-claim-spark` | ~0.7 KB |
| `bar_sheen.svg` | Optional sheen `<img>` if you prefer not to use CSS `::after` | ~0.5 KB |

CSS alone is enough for panel / bar / claim / autopilot. SVGs are optional polish.

---

## File paths for Coder

| Path | Purpose |
|------|---------|
| `assets/ui_motion/legacy_motion.css` | Link this stylesheet |
| `assets/ui_motion/LEGACY_HOOKS.md` | This doc |
| `assets/ui_motion/legacy_preview.html` | Local demo (no build) |
| `assets/ui_motion/claim_spark.svg` | Optional claim mote |
| `assets/ui_motion/bar_sheen.svg` | Optional bar sheen art |
| `assets/ui_motion/README.md` | Folder index (tournament + legacy) |

---

## Constraints reminder

- Transform + opacity (+ **width** on bar fill only).
- Never pulse the whole screen — stagger panels / Claim All rows (max 6).
- Pause breathe loops when tab hidden (`html[data-motion="paused"]`).
- Honor `prefers-reduced-motion` / `html[data-motion="reduced"]`.
- Original Boundwake parchment design; no Bit Tensie / BitLife logos or chrome IP.
- Do not modify `style.css`, `src/*`, `index.html`, or Lifeline; do not break tournament pack files.
