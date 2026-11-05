# Boundwake UI motion hooks — tournament / guild

**Folder:** `/workspace/boundwake/assets/ui_motion/`  
**CSS:** `tournament_motion.css` (self-contained; transform + opacity only)  
**Mood:** parchment Boundwake — not Kilumen battle FX. See `fantasy_lifesim/world/ui_mood_layout.md` §Motion and `docs/TOURNAMENT_TEAMS_AND_GUILDS.md`.

Do **not** force-import into live `index.html` until Coder wires opt-in. Preferred: link from the panels that need it.

```html
<link rel="stylesheet" href="assets/ui_motion/tournament_motion.css" />
```

---

## Hook IDs / classes

### A. Banner flutter (idle loop)

| Selector | Role |
|----------|------|
| `#bw-banner-flutter` | Optional single-id host (tourney year banner) |
| `.bw-banner` | Host wrapper (`perspective`) |
| `.bw-banner-flag` | Pennant face that flutters + sheen |
| `.bw-banner--tourney` | Tournament-year tint |
| `.bw-banner--guild` | Guild-hall tint (moss wash) |
| `.bw-banner--team` | Team-bracket tint (plum/mist wash) |
| `--bw-flutter` | Intensity `0`–`1.5` (default `1`) on host |

**When to show**
- Tournament year open / notice invites → `.bw-banner--tourney` (Life `tourneyBanner` card header or Adventure notice).
- Guild hall owned / hall panel → `.bw-banner--guild`.
- Tournament team owned / Teams bracket card → `.bw-banner--team`.

**Markup**
```html
<div class="bw-banner bw-banner--tourney" id="bw-banner-flutter">
  <div class="bw-banner-flag">
    <img src="assets/ui_motion/banner_pennant.svg" alt="" width="40" height="60" />
    Tournament year
  </div>
</div>
```

**Loop:** ~3.2s flutter + ~4s sheen. Staggered by nth-child / variant duration.  
**Pause:** set `html[data-motion="paused"]` on `visibilitychange` (see `preview.html`).  
**Reduced motion:** loops off (`prefers-reduced-motion` or `html[data-motion="reduced"]`).

---

### B. Renown tick (one-shot)

| Selector | Role |
|----------|------|
| `.bw-renown-tick` | Host (chip / bar wrap) |
| `.bw-renown-tick-up` | Floating `+N` label |
| `.bw-renown-burst` | Optional gold ring pulse on host |
| `.bar-renown` / `.flare-renown` | Existing Boundwake bar classes — also accept burst |

**State class:** `is-ticking` (add → remove on `animationend` or ~900ms timeout).

**When to fire**
- Tourney place renown (small meets 2–5; teams bracket 4–12).
- Guild job success (+1–4 renown).
- Any fame/renown chip increase you want celebrated lightly.

**JS pattern**
```js
function fireRenownTick(host, delta) {
  const up = host.querySelector('.bw-renown-tick-up');
  if (up) up.textContent = (delta >= 0 ? '+' : '') + delta;
  host.classList.remove('is-ticking');
  void host.offsetWidth;
  host.classList.add('is-ticking');
  if (up) up.classList.add('is-ticking');
  const clear = () => {
    host.classList.remove('is-ticking');
    up && up.classList.remove('is-ticking');
  };
  host.addEventListener('animationend', clear, { once: true });
  setTimeout(clear, 900); // reduced-motion / missed end
}
```

**Duration:** ~780ms tick, ~720ms ring.  
**Reduced motion:** static gold flash / held `+N` (no travel); still clear via timeout.

---

### C. Team victory sparkle (rare one-shot)

| Selector | Role |
|----------|------|
| `.bw-victory-sparkle` | Card/panel host (`overflow: hidden`) |
| `.bw-victory-burst` | Absolute layer holding flecks |
| `.bw-victory-confetti` | 6–12 (preview uses 8) CSS dots |

**State class:** `is-victorious` (~1.45s then remove).

**When to fire**
- Team **1st place** in realm meet or every-3-years Teams bracket.
- Do **not** fire on 2nd/3rd (keep rare) or on ordinary guild job completes (use renown tick).

**Markup**
```html
<div class="card bw-victory-sparkle" id="team-result">
  <div class="bw-victory-burst" aria-hidden="true">
    <span class="bw-victory-confetti"></span><!-- ×8 -->
  </div>
  …
</div>
```

```js
function fireVictory(card) {
  card.classList.remove('is-victorious');
  void card.offsetWidth;
  card.classList.add('is-victorious');
  const clear = () => card.classList.remove('is-victorious');
  card.addEventListener('animationend', clear, { once: true });
  setTimeout(clear, 1600);
}
```

**Reduced motion:** static gold outline + flecks appear without travel; no card glow animation.

---

## Assets (optional)

| File | Use |
|------|-----|
| `banner_pennant.svg` | Crest art inside `.bw-banner-flag` (~1 KB) |
| `sparkle_dot.svg` / `.png` | Optional mote if you prefer `<img>` over CSS dots |

CSS alone is enough for flutter + tick + victory. SVGs are optional polish.

---

## Constraints reminder

- Transform + opacity only.
- Never pulse the whole screen in sync — stagger banners; keep victory card-local.
- Pause loops when tab hidden.
- Honor `prefers-reduced-motion` / `data-motion="reduced"`.
- Original design; no third-party logos/IP; not Kilumen overworld FX.
