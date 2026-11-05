# Boundwake — `assets/ui_motion/`

Light **tournament / guild** UI motion for Coder to hook. Parchment life-sim mood (lantern gold on `#F4E6C8`), not Kilumen battle FX.

| File | What |
|------|------|
| `tournament_motion.css` | Self-contained pack: banner flutter, renown tick, victory sparkle |
| `banner_pennant.svg` | Tiny original pennant crest (optional) |
| `sparkle_dot.svg` / `.png` | Optional gold mote |
| `preview.html` | Open in a browser — no build |
| `HOOKS.md` | Class/id list, when to fire, markup + JS snippets |

## Quick preview

```bash
# from repo / any static server, or just:
xdg-open /workspace/boundwake/assets/ui_motion/preview.html
# or open the file path in Chrome/Firefox
```

## Wire later (Coder)

Link `tournament_motion.css` from Life tournament banner / Adventure team cards / future guild hall UI. See **HOOKS.md** for exact selectors (`#bw-banner-flutter`, `.bw-renown-tick` + `is-ticking`, `.bw-victory-sparkle` + `is-victorious`).

Live `style.css` / `ui.js` are intentionally untouched.
