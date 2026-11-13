# Kilumen UI tools: gaps in src/ui, open-source picks, and what got wired in

*Thursday Oct 22, 2026 (America/Chicago), branch `dev/overworld-v1`. Local only: nothing was committed, pushed or deployed. `src/battle/*` and `vendor/battle-sim` were not touched.*

**Licence rule.** Code must be MIT, Apache-2.0, BSD, ISC or zlib; art must be CC0. No GPL/AGPL, nothing non-commercial or unclear, and no Pokémon assets. Every licence below was read from the actual LICENSE file (the repo copy where the npm tarball has none). Anything I couldn't verify says **UNVERIFIED**. Staged copies, hashes and sources are in `vendor_staging/ui/` and `vendor_staging/MANIFEST.md`.

Gary's steer: *"its not cutting corners its assisting"*. So this ranks **everything that saves real time**, not a cautious top 3. Then *"use them and log them for later use"* (10:17 PM CT): the top four are now wired in.

## Recommendations (ranked by time saved)

1. **lrud-spatial 0.0.18** (Apache-2.0, 4.0 KB gz). **WIRED.** D-pad, arrow and stick navigation by on-screen geometry, so mixed layouts (Team 2-col cards, Archive grid + tabs, phone apps) no longer need per-screen index maths. Saves ~2 days now, plus ~0.5 day for every new screen.
2. **SortableJS 1.15.7** (MIT, 13.0 KB gz for our core + Swap + AutoScroll build). **WIRED.** Mouse and touch drag-to-reorder on Team, and drag-to-swap in the Field Archive, with a hold delay on touch so lists still scroll. Saves ~3 days of pointer, touch, auto-scroll and ghost code.
3. **lil-gui 0.21.0** (MIT, 7.7 KB + 3 KB CSS gz). **WIRED, dev only.** With `?dev=1`, a live panel edits the active profile's `ui` vars and flags and the shared depth shadows, then exports JSON. It turns hours of "edit JSON, reload" into minutes per tuning pass.
4. **Kenney Input Prompts + Game Icons** (CC0). **WIRED as placeholders.** Keyboard and Xbox glyphs in PC and controller hints (they swap when the device changes) and icons in empty states. Saves ~1 day of placeholder art. They are marked `data-placeholder="kenney"` and stored in `art/ui/kenney_placeholder/`, to be replaced by themed art later.
5. **@formkit/auto-animate 0.10.0** (MIT, 6.8 KB). One line makes list add, remove and move animate (bag, Team after reorder, inbox). ~0.5 day saved.
6. **floating-ui dom 1.8.0** (MIT, ~8.5 KB with core). Tooltips and popovers that flip and shift to stay on a 932×430 phone screen (item and skill descriptions, chips). ~1 day saved.
7. **pixelarticons 2.4.2** (MIT, 1036 SVGs). A pixel-style icon set that fits the 24 px chip and tab glyphs better than Kenney's. ~1 day saved.
8. **Kenney UI Pack / UI Pack – Pixel Adventure** (CC0). Slider, checkbox and bar art for the Options screen and HP/XP bars, as reference or placeholders. ~0.5–1 day.
9. **animejs 4.5.0** (MIT, 39.9 KB). Timelines for level-up, evolution and "new lead" moments. Worth it only when those sequences grow (CSS keyframes cover today's). ~1–2 days saved later.
10. **tweakpane 4.0.5** (MIT, 30.1 KB). A richer alternative to lil-gui (graphs, tabs, colour pickers), if the dev panel grows to tune battle or audio.
11. **focus-trap 8.2.3 + tabbable 6.5.0** (MIT, 14 KB). Needed only if the UI ever relies on real DOM focus (screen-reader mode). ui.js already traps input in modals.
12. **preact 11.0.1** (MIT, 4.8 KB). Components, if the string-template screens get hard to maintain. 11.x is a new major: **stability not checked**; 10.x is the safe line.

**Design references.** The **Mobbin** and **Refero** MCP connectors (available in this workspace) can pull real-app screens and flows (inventory grids, drag-reorder lists, settings panels, empty states) to compare layouts. Use them for reference only: no assets are copied.

## Gaps found in src/ui (before this pass)

| Gap | Where | Status |
|---|---|---|
| Navigation was index maths (`sel ± cols`), so mixed layouts jumped oddly and every new screen needed tuning | `ui.js _nav` | **Fixed:** lrud-spatial first, old maths as fallback (`?spatial=0` turns it off) |
| No visible keyboard/controller focus beyond the selected colour, and no ARIA state | `ui.css`, `_markSel` | **Fixed:** white + outline double ring (white vs `--outline` #1a1226 is 17:1, and one of the two is ≥3:1 on any background), `aria-selected`, `tabIndex` |
| Team order could only change via "set lead" (swap with #1); duplicate species could be dropped | `scr_team`, `setLead` | **Fixed:** drag-to-reorder keeps the same creature objects; a lead change re-places the follower and autosaves |
| Archive had no move or swap at all | `scr_archive` | **Fixed:** drag-to-swap plus A pick-up / A swap (works across boxes), B cancels. **Demo data only: not saved** |
| Archive slots were 40 px on iPhone 14/15 landscape (below the 44 px touch minimum) | `ui.css .ui-slot` | **Fixed:** 44 px minimum; the grid reflows to 5 (or 4) columns via a container query, and nav reads the live column count |
| Hints were text only ("Z / Enter") on PC and with a pad | `hintText` | **Fixed:** Kenney placeholder glyphs (keyboard or Xbox, live swap); text kept for screen readers |
| Empty states were bare text | team, bag, shop, tasks, contacts | **Fixed:** placeholder icons |
| No live tuning; every px change meant edit + reload, per profile | — | **Fixed:** `?dev=1` lil-gui panel (exports `<pc|mobile>.ui.json`, and `depth.json` marked SHARED) |
| Tooltips/popovers for item and skill text | bag, battle skills | Open: floating-ui (#6) |
| List animations | bag, Team, inbox | Open: auto-animate (#5) |
| Keyboard input drops a key press and release within one frame (no tap queue like touch has) | `src/overworld/input.js` (not UI-owned) | **Noted, not changed:** only synthetic test presses hit it; the e2e holds keys for 70 ms |

## Full table

| Tool | What it speeds up | Licence (verified from file) | Size (gz) | Fit | Effort (days) |
|---|---|---|---|---|---|
| lrud-spatial 0.0.18 | Spatial d-pad/arrow nav for every screen | Apache-2.0 ✔ (repo; tarball has none) | 4.0 KB | Excellent: plain DOM, no deps | 0.5 (done) |
| SortableJS 1.15.7 | Drag reorder/swap, touch, auto-scroll | MIT ✔ (repo; tarball has none) | 13.0 KB | Excellent | 1 (done) |
| lil-gui 0.21.0 | Live tuning of profile ui/depth values | MIT ✔ | 10.7 KB (dev only) | Excellent (dev only) | 0.5 (done) |
| Kenney Input Prompts 1.5A | Key/button glyphs | CC0 ✔ | 12 PNGs, ~4 KB | Good placeholder; console glyphs are trademarks | 0.25 (done) |
| Kenney Game Icons | Empty-state/UI icons | CC0 ✔ | 5 PNGs, ~8 KB | Placeholder only (not pixel-themed) | 0.25 (done) |
| @formkit/auto-animate 0.10.0 | List animations | MIT ✔ | 6.8 KB | Good | 0.25 |
| floating-ui dom 1.8.0 | Tooltips/popovers that stay on screen | MIT ✔ | 8.5 KB | Good | 0.5–1 |
| pixelarticons 2.4.2 | Pixel icon set | MIT ✔ | per-icon SVG | Good (matches pixel style) | 0.5 |
| Kenney UI Pack (+ Pixel Adventure) 2.0 | Sliders, toggles, bars | CC0 ✔ | PNG | Reference/placeholder; must not replace themed patterns | 0.5 |
| animejs 4.5.0 | Timeline animation | MIT ✔ | 39.9 KB | Later (level-up/evolution) | 1 |
| tweakpane 4.0.5 | Richer dev panel | MIT ✔ (repo; tarball has none) | 30.1 KB | Alternative to lil-gui | 0.5 |
| focus-trap 8.2.3 + tabbable 6.5.0 | DOM focus trapping | MIT ✔ | 14.0 KB | Low (ui.js traps input already) | 0.5 |
| preact 11.0.1 | Components | MIT ✔ (11.x stability not checked) | 4.8 KB | Only if the UI is rewritten | 3+ |
| lit, motion, lucide-static, @tabler/icons, overlayscrollbars | — | BSD-3 / MIT / ISC / MIT / MIT (npm fields only, **UNVERIFIED**, not staged) | — | Overlap or poor fit | — |
| js-spatial-navigation | — | **MPL-2.0: rejected** | — | — | — |
| spatial-navigation-polyfill | — | **W3C licence, unclear: rejected** | — | — | — |
| game-icons.net | — | **CC BY 3.0: attribution required; flagged, not used** | — | — | — |

## What was wired in, and how to use it

- **Spatial nav.** This is automatic on every screen, through `_spatial()` in `src/ui/ui.js`. Add `?spatial=0` to compare against the old maths.
- **Focus ring.** Selected items get a pulsing double ring (white inside, dark outline outside). Touch is unchanged: taps still act on touchstart.
- **Drag to reorder.**
  - **Team** (only when 2 or more creatures): drag a card. On touch, hold ~0.16 s first so a quick swipe still scrolls. A tap without a drag still opens the card menu.
  - **Field Archive:** drag a slot onto another to swap them, or use A to pick up, move, then A to swap.
- **Dev panel.**
  - Open it with `index.html?dev=1`, or with `?dev=1`/`?debug=1` → Phone → Previews → "Tuning panel (dev)".
  - It edits a copy of the **active** profile only. The PC and mobile files stay independent.
  - "Export <id>.ui.json" downloads the result and copies it to the clipboard.
  - Depth edits are **shared by PC and mobile** because depth.json is one file, and the panel says so.
  - Without `?dev=1` it is never loaded; this is tested.
- **Placeholders.** The art lives in `art/ui/kenney_placeholder/`. Its README has the usage table and marks it as placeholder. Every image carries `data-placeholder="kenney"`.

Tests: `node --test tests/ui_tools.test.mjs` (static) and `PORT=<port> node tests/ui_tools_e2e.mjs` (browser + clips in `shots/ui_tools/`).
