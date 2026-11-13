# vendor_staging manifest

Pulled Thursday Oct 22, 2026, about 10:15 PM (America/Chicago), for **Gary's review only**. **Nothing here is wired into `src/`, `index.html`, `package.json` or the build**, and none of it touches the battle code (`vendor/battle-sim`). Wiring waits for Gary's picks. If something is rejected, delete its folder.

Each folder holds:
- the pinned npm tarball (or GitHub tarball);
- its extracted contents (`package/`, or the repo tree for tracery);
- `LICENSE.repo`, fetched from the project's GitHub repo;
- `LICENSE`, a copy of `LICENSE.repo`.

**Licence verification:** "Repo LICENSE read" means I opened the actual LICENSE file from GitHub and read its text. The npm `license` field is listed for comparison. Sizes are gzip -9 of the browser file named.

| Folder | Package @ version | Source URL | sha256 (first 16) | Licence (repo LICENSE read) | npm field | Browser file · gz size | Purpose | Notes |
|---|---|---|---|---|---|---|---|---|
| howler | howler@2.2.4 | https://registry.npmjs.org/howler/-/howler-2.2.4.tgz · github.com/goldfire/howler.js | be9d8d09345954e2 | MIT (MIT permission text, © 2013-2020 James Simpson and GoldFire Studios) | MIT | dist/howler.core.min.js · 7.9 KB | Music/SFX, loops, fades/crossfade | No deps |
| zzfx | zzfx@1.4.0 | https://registry.npmjs.org/zzfx/-/zzfx-1.4.0.tgz · github.com/KilledByAPixel/ZzFX | 2321f2de873696c0 | MIT (© 2019 Frank Force) | MIT | ZzFX.js · 3.6 KB | Generated SFX | No deps |
| easystarjs | easystarjs@0.4.4 | https://registry.npmjs.org/easystarjs/-/easystarjs-0.4.4.tgz · github.com/prettymuchbryce/easystarjs | 756342747cd89f18 | MIT (© 2012-2020 Bryce Neal) | MIT | bin/easystar-0.4.4.min.js · 3.9 KB | Grid A* (fallback to our own BFS) | Bundles dep `heap@0.2.7`: MIT per npm only, **repo LICENSE not read (UNVERIFIED)** |
| idb-keyval | idb-keyval@6.3.0 | https://registry.npmjs.org/idb-keyval/-/idb-keyval-6.3.0.tgz · github.com/jakearchibald/idb-keyval | ad954ae198923389 | Apache-2.0 (LICENCE file, © 2016 Jake Archibald; GitHub API shows NOASSERTION only because of the file spelling) | Apache-2.0 | dist/index.js · 1.6 KB | IndexedDB save store (optional) | No deps |
| inkjs | inkjs@2.4.0 | https://registry.npmjs.org/inkjs/-/inkjs-2.4.0.tgz · github.com/y-lohse/inkjs | 100cf088ef295492 | MIT (© 2017 inkle Ltd. + contributors) | MIT | dist/ink.js · 31.3 KB | Dialogue scripting (only if branching outgrows lines.js) | Tarball 6.9 MB unpacked; ship only `dist/ink.js` |
| tweenjs | @tweenjs/tween.js@25.0.0 | https://registry.npmjs.org/@tweenjs/tween.js/-/tween.js-25.0.0.tgz · github.com/tweenjs/tween.js | 3adc6badf9071b9a | MIT (© 2010-2012 Tween.js authors; GitHub API shows NOASSERTION, but the file text is MIT) | MIT | dist/tween.esm.js · 7.0 KB | UI/cutscene tweening | No deps |
| robot3 | robot3@1.4.0 | https://registry.npmjs.org/robot3/-/robot3-1.4.0.tgz · github.com/matthewp/robot | 5b739861b70d9484 | BSD-2-Clause (© 2019 Matthew Phillips) | BSD-2-Clause | machine.js · 1.8 KB | Menu/flow state machines | **The npm tarball has no LICENSE file**; the repo copy is added as LICENSE |
| obscenity | obscenity@0.4.6 | https://registry.npmjs.org/obscenity/-/obscenity-0.4.6.tgz · github.com/jo3-l/obscenity | 7b00239506036326 | MIT (© 2025 Joseph Liu) | MIT | dist/ (multi-file ESM; needs an esbuild bundle step) | Online chat profanity filter | Ships an English profanity word dataset (needed for its job) |
| nipplejs | nipplejs@1.0.4 | https://registry.npmjs.org/nipplejs/-/nipplejs-1.0.4.tgz · github.com/yoannmoinet/nipplejs | 91404e86c2dd2517 | MIT (© 2025 Yoann Moinet) | MIT | dist/index.mjs | Virtual joystick (mobile) | Low priority: `input.js` already has touch. **The tarball has no LICENSE file**; the repo copy is added |
| i18next | i18next@26.5.6 | https://registry.npmjs.org/i18next/-/i18next-26.5.6.tgz · github.com/i18next/i18next | bbe7ba33c03146b3 | MIT (© 2011-present i18next) | MIT | dist/esm/i18next.js · 19.1 KB | Localisation (only if Kilumen ships more than one language) | No deps |
| supabase-js | @supabase/supabase-js@2.118.0 | https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.118.0.tgz · github.com/supabase/supabase-js | f2d4f13a8d7a96bd | MIT (© 2020 Supabase) | MIT | dist/umd/supabase.js · 55.4 KB | Realtime chat/presence, cloud save | The UMD bundles auth/realtime/postgrest/storage/functions-js@2.118.0, all MIT per npm. The sub-packages live in the same monorepo; **their individual LICENSE files weren't read** |
| colyseus-sdk | @colyseus/sdk@0.18.6 | https://registry.npmjs.org/@colyseus/sdk/-/sdk-0.18.6.tgz · github.com/colyseus/colyseus | bb50c293f2a13990 | MIT (© 2015-2026 Endel Dreyer) | MIT | dist/colyseus.js (UMD) · 68.9 KB | Authoritative multiplayer client (needs a Node server) | Bundles @colyseus/schema, msgpackr (MIT per npm) and tslib (0BSD per npm). **Bundled deps' repo LICENSE files weren't read (UNVERIFIED)**. 0BSD is BSD-family and public-domain-like: Gary to confirm it's acceptable |
| fast-check | fast-check@4.10.2 | https://registry.npmjs.org/fast-check/-/fast-check-4.10.2.tgz · github.com/dubzzz/fast-check | da0089e325d00454 | MIT (© 2017 Nicolas Dubien) | MIT | test-only | Property tests (save migration, quest seeds) | Dev/test only; depends on pure-rand (MIT per npm). Would become a devDependency |
| tracery | galaxykate/tracery @ commit 11db07cb8e3564477de7b9d1eef0b5bb5bd6f391 | https://codeload.github.com/galaxykate/tracery/tar.gz/11db07cb8e3564477de7b9d1eef0b5bb5bd6f391 | 10b13e466635f69f | Apache-2.0 (LICENSE.MD at that commit) | n/a (the npm fork `tracery-grammar` is ISC; not pulled) | js/tracery.min.js · 5.3 KB | Optional side-quest flavour text | The repo also contains a jQuery copy under js/vendor (MIT); ignore it |

## Considered and not pulled
- **Tiled loaders:** Kilumen uses its own map JSON and Python tools. No need.
- **Particles/weather:** `living.js` already does rain, birds and motes. tsParticles (MIT) is too heavy for the gain.
- **Gamepad/remap:** `input.js` and `ui.js` already poll `getGamepads()`. Remapping is ~1 day of our own code. gamepad.js has no repository field on npm, so it's unverifiable.
- **Seeded RNG:** `npcs.js` mulberry32 + `hash` is enough.
- **PWA:** `manifest.webmanifest` exists. A ~60-line hand-written service worker beats Workbox (MIT), which needs a build step.
- **Accessibility:** nothing worth pulling for a canvas game. Our own aria-live region + reduced-motion (already partly present).
- **Testing:** Playwright (Apache-2.0) and `node --test` are already in use.
- **Rejected:** yarn-bound and tracery-grammar (ISC; allowed by Gary's newer list, but not needed). GSAP: its "Standard License" is not OSI-approved, so it's unclear and rejected. Anything containing Pokémon data: none found (a grep of the staged files for Pokémon names is clean).

## UI tools (vendor_staging/ui/), pulled Thursday Oct 22, 2026, before ~10:15 PM CT (America/Chicago); wired ~10:20–10:30 PM CT

Same layout as above: the pinned tarball or zip, the extracted `package/` (or `extracted/`), `LICENSE.repo` from the project's GitHub repo, and `LICENSE`. For Kenney, `LICENSE` is the pack's own License.txt. "Repo LICENSE read" means I opened the file and read the text. Sizes are gzip -9.

**Wired in after Gary's go-ahead ("use them and log them for later use", 10:17 PM CT), local only:** lil-gui (dev panel, `?dev=1` only), lrud-spatial (menu spatial nav), SortableJS (drag-to-reorder) and the Kenney CC0 placeholders. Copies are in `src/vendor/` and `art/ui/kenney_placeholder/`. Everything else is staged only.

**UI tools 2, wired Thu Oct 22, 2026 ~10:31 PM–midnight CT (Gary: "Add the 5 ready UI tools"), local only:** auto-animate, floating-ui, pixelarticons, anime.js 4.5.0 and the two Kenney UI packs (placeholders). Licences re-read from each LICENSE file before wiring (all MIT; Kenney packs CC0 per their License.txt). Glue: `src/ui/ui_tools2.js` + `src/ui/ui_tools2.css`. Boot cost +11.1 KB gz (icons, glue JS/CSS, ui.js edits); the three libs load lazily (aa 3.4, fui 7.6, anime 16.6 KB gz) and the motion libs never load when motion is reduced.

| Folder | Package @ version | Source URL | sha256 (first 16) | Licence (repo LICENSE read) | npm field | Browser file · gz size | Purpose | Status / notes |
|---|---|---|---|---|---|---|---|---|
| lil-gui | lil-gui@0.21.0 | registry.npmjs.org/lil-gui/-/lil-gui-0.21.0.tgz · github.com/georgealways/lil-gui | 2d8f16679aedd36a | MIT (© 2019 George Michael Brower) | MIT | dist/lil-gui.esm.min.js · 7.7 KB (+3.0 KB CSS, injected) | Live tuning panel | **WIRED** in src/ui/devpanel.js, `?dev=1` only |
| tweakpane | tweakpane@4.0.5 | registry.npmjs.org/tweakpane/-/tweakpane-4.0.5.tgz · github.com/cocopon/tweakpane | 8cf819860e51128e | MIT (© 2016 cocopon) | MIT | dist/tweakpane.min.js · 30.1 KB | Richer tuning panel (graphs, folders, tabs) | Staged alternative to lil-gui. **The tarball has no LICENSE file**; the repo copy is added |
| lrud-spatial | @bbc/tv-lrud-spatial@0.0.18 | registry.npmjs.org/@bbc/tv-lrud-spatial/-/tv-lrud-spatial-0.0.18.tgz · github.com/bbc/lrud-spatial | 39461c9122cc2b30 | Apache-2.0 (full text, master branch; author BBC) | Apache-2.0 | lib/lrud.js · 4.0 KB (min 3.0 KB) | D-pad / arrow spatial focus | **WIRED** in src/ui/ui.js `_spatial()`. The tarball has no LICENSE; the repo copy is used. No NOTICE file upstream |
| tabbable | tabbable@6.5.0 | registry.npmjs.org/tabbable/-/tabbable-6.5.0.tgz · github.com/focus-trap/tabbable | 4f017b2a4cf63955 | MIT (© 2015 David Clark) | MIT | dist/index.esm.js · 8.2 KB | Find focusable nodes | Staged (dep of focus-trap) |
| focus-trap | focus-trap@8.2.3 | registry.npmjs.org/focus-trap/-/focus-trap-8.2.3.tgz · github.com/focus-trap/focus-trap | 5257e74257d4e79f | MIT (© 2015-2016 David Clark) | MIT | dist/focus-trap.esm.js · 14.0 KB (with tabbable) | Keep focus in modals | Staged; ui.js modals already trap input themselves |
| floating-ui | @floating-ui/dom@1.8.0, core@1.8.0, utils@0.2.12 | registry.npmjs.org/@floating-ui/* · github.com/floating-ui/floating-ui | dom b9511cc8fd8898c7 · core c86371bdb19948a7 · utils fe0800a3de3d9c81 | MIT (© 2021 Floating UI contributors) | MIT | dom 3.9 KB + core 4.6 KB | Tooltips / popovers that stay on screen | **WIRED** (UI tools 2, Oct 22 2026): esbuild bundle of dom+core+utils → src/vendor/floating-ui/floating-ui.dom.bundle.min.mjs (18.6 KB · 7.6 KB gz), lazy on first tooltip |
| sortablejs | sortablejs@1.15.7 | registry.npmjs.org/sortablejs/-/sortablejs-1.15.7.tgz · github.com/SortableJS/Sortable | 66cbfc8fa1886078 | MIT (© 2019 All contributors to Sortable) | MIT | Sortable.min.js · 14.7 KB; our core+Swap+AutoScroll ESM build · 13.0 KB | Drag to reorder / swap | **WIRED** (Team and Field Archive). **The tarball has no LICENSE file**; the repo copy is added |
| auto-animate | @formkit/auto-animate@0.10.0 | registry.npmjs.org/@formkit/auto-animate/-/auto-animate-0.10.0.tgz · github.com/formkit/auto-animate | 363d71ca5ec0c8ed | MIT (© 2022 FormKit Inc.) | MIT | index.mjs · 6.8 KB | One-line list add/remove/move animation | **WIRED** (UI tools 2): package/index.min.js unmodified (+ banner) → src/vendor/auto-animate/auto-animate.min.js (8.6 KB · 3.4 KB gz), lazy on menu open, skipped when motion is reduced |
| animejs | animejs@4.5.0 | registry.npmjs.org/animejs/-/animejs-4.5.0.tgz · github.com/juliangarnier/anime | f1bf4be22ae739bb | MIT (© 2025 Julian Garnier) | MIT | dist/bundles/anime.esm.min.js · 39.9 KB | Timeline UI animation (level-up, evolution) | **WIRED** (UI tools 2): 4.5.0 stable (5.0.0-beta.2 skipped). Tree-shaken esbuild bundle (animate, createTimeline, stagger, utils) → src/vendor/animejs/anime.ui.min.mjs (40.5 KB · 16.6 KB gz; full build 40.8 KB gz), lazy in the default battle shell only, skipped when motion is reduced |
| preact | preact@11.0.1 | registry.npmjs.org/preact/-/preact-11.0.1.tgz · github.com/preactjs/preact | a48a17ebaa5ccae3 | MIT (© 2015-present Jason Miller) | MIT | dist/preact.mjs · 4.8 KB | Component rendering, if the string-template UI grows | Staged. **11.x is a new major; its stability is not checked** (10.x is the long-standing line) |
| pixelarticons | pixelarticons@2.4.2 | registry.npmjs.org/pixelarticons/-/pixelarticons-2.4.2.tgz · github.com/halfmage/pixelarticons | 1c12c5d08b837bf5 | MIT (© 2019 Gerrit Halfmann) | MIT | 1036 SVGs, 24 px grid | Pixel UI icons | **WIRED** (UI tools 2): 32-icon subset via ui/pixelarticons/make_subset.mjs (banned-name check for alcohol / smoking / drugs) → src/vendor/pixelarticons/icons.js (6.3 KB · 2.4 KB gz) |
| kenney-ui-pack | Kenney UI Pack 2.0 | kenney.nl/assets/ui-pack | a8a14a234911eb64 | CC0 1.0 (pack License.txt) | n/a | PNG/SVG | Panels, buttons, sliders | **WIRED as placeholders** (UI tools 2): 5 PNGs (slider track/fill/handle, checkbox on/off) in art/ui/kenney_ui_placeholder/, Options rows only |
| kenney-ui-pack-pixel-adventure | Kenney UI Pack – Pixel Adventure 2.0 | kenney.nl/assets/ui-pack-pixel-adventure | 0b0ed4802ebcfff5 | CC0 1.0 (pack License.txt) | n/a | PNG | Pixel-style panels / bars | **WIRED as placeholder** (UI tools 2): 1 PNG (cream 9-slice panel) for the tooltip border-image, art/ui/kenney_ui_placeholder/ |
| kenney-input-prompts | Kenney Input Prompts 1.5A | kenney.nl/assets/input-prompts | ac2fcf599080b0f3 | CC0 1.0 (pack License.txt) | n/a | PNG/SVG | Keyboard / pad button glyphs | **WIRED as placeholders** (12 PNGs in art/ui/kenney_placeholder). The art is CC0, but console glyphs show platform trademarks (Xbox, PlayStation, Nintendo): check the platform rules before release |
| kenney-game-icons | Kenney Game Icons | kenney.nl/assets/game-icons | 7a86d8d58e0b851e | CC0 1.0 (pack license.txt) | n/a | PNG | Generic UI icons | **WIRED as placeholders** (5 empty-state icons). Not game-icons.net |

**Considered and not staged (UI):**
- lit (BSD-3-Clause): fine licence, but overlaps preact.
- motion (MIT): heavy for the gain.
- lucide-static (ISC) and @tabler/icons (MIT): not pixel style.
- overlayscrollbars (MIT): native scrolling is enough.

**Rejected:**
- js-spatial-navigation (MPL-2.0): not on the allowed list.
- spatial-navigation-polyfill (W3C Software licence): unclear for our use.
- game-icons.net: **CC BY 3.0, attribution required**. It is flagged, not used.
- No Pokémon assets anywhere.

**Design references (not code):** the Mobbin and Refero MCP connectors can pull real-app screens and flows (inventory grids, drag-reorder lists, settings panels) as layout references only. No assets are copied from them.

## Map editor (vendor_staging/ldtk/), pulled Thursday Oct 22, 2026, ~10:33–10:34 PM CT (America/Chicago)

For box-side testing and reference only. **Never shipped**: nothing here is loaded by `src/`, `index.html` or the build. Gary installs the Windows app himself (see `quality/toolkit/MAP_EDITOR_PIPELINE.md`). **Don't commit the 113 MB zip.** If this folder ever goes into git, add `vendor_staging/ldtk/*.zip` to .gitignore.

| File | What @ version | Source URL | sha256 (first 16) | Licence (repo LICENSE read) | Purpose | Notes |
|---|---|---|---|---|---|---|
| LICENSE | LDtk v1.5.3 | raw.githubusercontent.com/deepnight/ldtk/v1.5.3/LICENSE | f409a37a40e823ef | MIT ("Copyright (c) 2020, Sébastien Benard - Deepnight Games") | Licence evidence | |
| JSON_SCHEMA_v1.5.3.json | LDtk JSON schema 1.5.3 | raw.githubusercontent.com/deepnight/ldtk/v1.5.3/docs/JSON_SCHEMA.json | b96ca8a106d12c5b | MIT (same repo) | `map_bridge.py validate` | |
| sample_Typical_TopDown_example.ldtk, sample_Test_file_for_API_showing_all_features.ldtk | LDtk 1.5.3 official samples | github.com/deepnight/ldtk (tag v1.5.3, app/extraFiles/samples) | 31bdf9ae3edbc0b0 / 8570b23f4ea12891 | MIT (same repo) | Format reference for the bridge | |
| ldtk-1.5.3-ubuntu-distribution.zip | LDtk 1.5.3 Linux build (AppImage inside) | github.com/deepnight/ldtk/releases/tag/v1.5.3 | 8bb1c870ab35d2ca (full hash in the .sha256 file, computed on the box) | MIT | Run the real editor on the box (`--appimage-extract`, then `ldtk --no-sandbox` under Xvfb) to prove exported files open and that LDtk-saved files re-import | 113 MB. Electron app: an editor binary, **never ship it** |

**Not pulled:**
- Tiled 1.12.2: the editor app is GPL (only libtiled/tmxviewer/tmxrasterizer are BSD-2).
- LDtk runtime loaders (any language): the bridge converts LDtk to Kilumen JSON, so the game never reads .ldtk.

## Online play groundwork: two staged libs wired in (Thursday Oct 22, 2026, ~10:50 PM CT, America/Chicago)

Gary approved "online play groundwork" at 10:31 PM CT. Two libraries from this folder are now copied into `src/vendor/`.
They load **only with `?online=1`** (`src/main.js` → `src/online/`). Local only: nothing committed or deployed, and no real Supabase project touched.

| Lib | From here | Copied to | sha256 (first 16) of shipped file | Licence | How |
|---|---|---|---|---|---|
| obscenity 0.4.6 | `vendor_staging/obscenity/package/dist/` | `src/vendor/obscenity/obscenity.mjs` + `LICENSE` | e3c4b90ab7e5f60a | MIT (repo LICENSE read) | esbuild bundle to a single ES module (includes the English dataset) |
| @supabase/supabase-js 2.118.0 | `vendor_staging/supabase-js/package/dist/umd/supabase.js` | `src/vendor/supabase-js/supabase.js` + `LICENSE` | ee3be8de192b97cb (same as staged) | MIT (sub-package LICENSE files still unread) | verbatim UMD, loaded lazily by `src/online/supabase_transport.js` |

Evaluated, **not pulled**: colyseus 0.18.10 (MIT) and boardgame.io 0.50.2 (MIT). Either one needs a server we'd have to pay for and run (see `docs/online_play_plan.md`).

## Audio tools: staged for the tool pipeline only (Thursday Oct 22, 2026, ~10:56 PM CT, America/Chicago)

Used by `tools/audio/*.mjs` (see `/workspace/quality/toolkit/MUSIC_SFX_PIPELINE.md`). **Never copied into `src/` and never shipped.**
`tests/audio_draft.test.mjs` fails if anything under `src/` imports beepbox or jsfxr.

| Package | Staged at | sha256 (first 16) of tgz | Licence (file read) | Use |
|---|---|---|---|---|
| beepbox 4.2.0 (npm) | `vendor_staging/audio/beepbox/beepbox-4.2.0.tgz` + `package/` | e0848d3682b4d853 | MIT: `package/LICENSE.md`, "(c) 2012-2024 John Nesky and contributing authors"; matches GitHub main | `render_beepbox.mjs` imports `package/esm/synth/index.js` (Song, Synth) |
| jsfxr 1.4.1 (npm) | `vendor_staging/audio/jsfxr/jsfxr-1.4.1.tgz` + `package/` | bae7f2afe8e13d5e | **Unlicense** (public domain): `package/UNLICENSE`. FLAGGED: not on the permissive list; tool only | `make_sfx.mjs` imports `package/sfxr.mjs` (Params, SoundEffect) |
