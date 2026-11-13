# Open-source toolkit registry (Kilumen · Riftward · Lifeline · paigegames.net)

This is the shared list of free and open-source tools the web projects use or have staged, so the next project can reuse them instead of searching again. It was created Thursday Oct 22, 2026, about 10:30 PM CT, by the Kilumen UI tools pass. **Add to it; don't rewrite it.** Put each new tool under its category, and use the newest status.

**Licence rule (Gary).**
- Code: MIT, Apache-2.0, BSD, ISC or zlib.
- Art: CC0.
- Never: GPL/AGPL, non-commercial, unclear licences, or anything containing Pokémon assets.
- CC-BY is allowed only with attribution, and must be flagged.

**How licences are marked.**
- **Verified** means someone read the actual LICENSE file text: the repo copy where the npm tarball has none.
- **npm field only (UNVERIFIED)** means the LICENSE file wasn't read.

The Unity-side list for the next game is separate: `quality/toolkit/NEXT_GAME_UNITY_TOOLKIT.md`.

Staged paths are relative to the project:
- `vendor_staging/…` is pulled for review only.
- `src/vendor/…` is shipped in the game.
- `art/…` is art in use.

## Audio
| Tool | Purpose | Licence | Version | Source | Staged / used path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| howler.js | Music + SFX, loops, fades, crossfade | MIT, verified | 2.2.4 | github.com/goldfire/howler.js | kilumen `src/vendor/howler/` (staged copy: `vendor_staging/howler`) | Kilumen (shipped) | 7.9 KB gz, no deps |
| ZzFX | Generated placeholder SFX | MIT, verified | 1.4.0 | github.com/KilledByAPixel/ZzFX | kilumen `src/vendor/zzfx/` | Kilumen (shipped) | 3.6 KB gz |

## Saves / storage
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| idb-keyval | IndexedDB key/value behind SaveStore | Apache-2.0, verified (file is named LICENCE) | 6.3.0 | github.com/jakearchibald/idb-keyval | kilumen `src/vendor/idb-keyval/` | Kilumen (shipped) | 1.6 KB gz |
| supabase-js | Cloud save, realtime chat/presence | MIT, verified (sub-package LICENSE files not read) | 2.118.0 | github.com/supabase/supabase-js | kilumen `vendor_staging/supabase-js` | Staged; paige-shared talks to Supabase via its own REST code | 55 KB gz UMD |

## UI
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| lil-gui | Live dev tuning panel | MIT, verified | 0.21.0 | github.com/georgealways/lil-gui | kilumen `src/vendor/lil-gui/`, `vendor_staging/ui/lil-gui` | Kilumen (dev only, `?dev=1`) | Never loaded in normal play; edits a copy of the active profile |
| tweakpane | Richer dev panel | MIT, verified (repo; tarball has none) | 4.0.5 | github.com/cocopon/tweakpane | kilumen `vendor_staging/ui/tweakpane` | Staged | 30 KB gz |
| SortableJS | Drag to reorder / swap (mouse + touch) | MIT, verified (repo; tarball has none) | 1.15.7 | github.com/SortableJS/Sortable | kilumen `src/vendor/sortablejs/` (core + Swap + AutoScroll build) | Kilumen (Team, Field Archive) | Use `forceFallback`, a `delay` on touch only, and `touch-action: pan-y` so lists still scroll |
| auto-animate | One-line list animations | MIT, verified | 0.10.0 | github.com/formkit/auto-animate | kilumen `vendor_staging/ui/auto-animate` | Staged | 6.8 KB |
| floating-ui (dom/core/utils) | Tooltips/popovers that stay on screen | MIT, verified | 1.8.0 / 1.8.0 / 0.2.12 | github.com/floating-ui/floating-ui | kilumen `vendor_staging/ui/floating-ui` | Staged | ~8.5 KB |
| focus-trap + tabbable | DOM focus trapping | MIT, verified | 8.2.3 / 6.5.0 | github.com/focus-trap | kilumen `vendor_staging/ui/focus-trap`, `tabbable` | Staged | Only if the UI uses real DOM focus |
| animejs | Timeline animation | MIT, verified | 4.5.0 | github.com/juliangarnier/anime | kilumen `vendor_staging/ui/animejs` | Staged | 40 KB |
| preact | Components | MIT, verified | 11.0.1 | github.com/preactjs/preact | kilumen `vendor_staging/ui/preact` | Staged | 11.x is a new major, stability unchecked; 10.x is the safe line |
| tween.js | Tweening | MIT, verified | 25.0.0 | github.com/tweenjs/tween.js | kilumen `vendor_staging/tweenjs` | Staged | 7 KB |
| robot3 | Menu/flow state machines | BSD-2-Clause, verified (repo; tarball has none) | 1.4.0 | github.com/matthewp/robot | kilumen `vendor_staging/robot3` | Staged | 1.8 KB |
| i18next | Localisation | MIT, verified | 26.5.6 | github.com/i18next/i18next | kilumen `vendor_staging/i18next` | Staged | Only if more than one language ships |
| **Rejected:** js-spatial-navigation (MPL-2.0); spatial-navigation-polyfill (W3C licence, unclear); GSAP (non-OSI "Standard License") | | | | | | | |

## Input
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| lrud-spatial (@bbc/tv-lrud-spatial) | Arrow/d-pad spatial focus by geometry | Apache-2.0, verified (repo master; tarball has none) | 0.0.18 | github.com/bbc/lrud-spatial | kilumen `src/vendor/lrud-spatial/` | Kilumen (all menu screens) | Scope it to the screen container; ignore non-item buttons with `.lrud-ignore` |
| nipplejs | Virtual joystick | MIT, verified (repo; tarball has none) | 1.0.4 | github.com/yoannmoinet/nipplejs | kilumen `vendor_staging/nipplejs` | Staged | Low priority: Kilumen has its own d-pad |

## Pathfinding
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| easystar.js | Grid A* | MIT, verified; bundled `heap@0.2.7` is npm field only (UNVERIFIED) | 0.4.4 | github.com/prettymuchbryce/easystarjs | kilumen `src/vendor/easystar/` | Kilumen (shipped) | 3.9 KB gz |

## Testing
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Playwright | Browser e2e, screenshots, clips (Chromium + WebKit iPhone) | Apache-2.0, verified (node_modules LICENSE) | 1.64.1 | github.com/microsoft/playwright | devDependency | Kilumen tests, Lifeline `tests/` (playwright-core) | WebKit has no touch down/move API: use CDP touch on Chromium, and in-page touch pointer events on WebKit (label them synthetic) |
| fast-check (+ pure-rand) | Property tests | MIT, verified | 4.10.2 (+ 8.4.2) | github.com/dubzzz/fast-check | Kilumen devDependency | Kilumen `tests/save_props.test.mjs`, `tests/systems_gd.test.mjs` | Test only |
| node:test | Unit tests | Node.js built-in | Node 20 | nodejs.org | — | All web projects | — |
| TypeScript | Type-check/build | Apache-2.0, verified (LICENSE.txt) | 5.9.3 | github.com/microsoft/TypeScript | paige-shared devDependency | paigegames.net shared layer | Build-time only |

## Multiplayer / online
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Colyseus SDK | Authoritative multiplayer client | MIT, verified (bundled deps: npm field only) | 0.18.6 | github.com/colyseus/colyseus | kilumen `vendor_staging/colyseus-sdk` | Staged | Needs a Node server |
| obscenity | Chat profanity filter | MIT, verified | 0.4.6 | github.com/jo3-l/obscenity | kilumen `vendor_staging/obscenity` | Staged | Needs an esbuild bundle |

## Story / content
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| inkjs | Branching dialogue | MIT, verified | 2.4.0 | github.com/y-lohse/inkjs | kilumen `vendor_staging/inkjs` | Staged | `.ink` also works in Unity |
| tracery | Flavour text grammar | Apache-2.0, verified (commit 11db07c) | commit 11db07c | github.com/galaxykate/tracery | kilumen `vendor_staging/tracery` | Staged | Repo also bundles jQuery: ship only `tracery.min.js` |

## Battle / game logic
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| @pkmn/sim fork (battle engine) | Turn-based battle simulation | MIT (both notices), per kilumen THIRD_PARTY_LICENSES | 0.10.11 (pkmn/ps 4fec887) | github.com/pkmn/ps | kilumen `vendor/battle-sim/` → `src/battle/engine.js` | Kilumen (`?battle=sd`) | Owned by the battle worker. All species/move/item data, names, text and sprites were removed (no Pokémon assets) |

## Art packs
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Kenney Input Prompts | Keyboard / pad glyphs | CC0, verified (License.txt) | 1.5A | kenney.nl/assets/input-prompts | kilumen `art/ui/kenney_placeholder/` (12 PNGs), full pack in `vendor_staging/ui/kenney-input-prompts` | Kilumen (placeholders) | Console glyphs show platform trademarks: check the platform rules before release |
| Kenney Game Icons | Generic icons | CC0, verified | — | kenney.nl/assets/game-icons | kilumen `art/ui/kenney_placeholder/` (5 PNGs) | Kilumen (empty-state placeholders) | Not game-icons.net |
| Kenney UI Pack / UI Pack – Pixel Adventure | Panels, sliders, bars | CC0, verified | 2.0 / 2.0 | kenney.nl | kilumen `vendor_staging/ui/kenney-ui-pack*` | Staged | Don't replace themed patterns |
| pixelarticons | Pixel icon set (SVG) | MIT, verified | 2.4.2 | github.com/halfmage/pixelarticons | kilumen `vendor_staging/ui/pixelarticons` | Staged | 1036 icons |
| **Flagged:** game-icons.net (CC BY 3.0, attribution required); not used | | | | | | | |

## Art pipeline (Aseprite)
Pipeline docs: [toolkit/ASEPRITE_PIPELINE.md](toolkit/ASEPRITE_PIPELINE.md); Unity side (Aseprite Importer): [toolkit/NEXT_GAME_UNITY_TOOLKIT.md](toolkit/NEXT_GAME_UNITY_TOOLKIT.md).

| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| aseprite-py (`aseprite`) | Read **and write** .aseprite on the box (layers, frames, tags, palettes) | Apache-2.0, verified (per toolkit/ASEPRITE_PIPELINE.md) | 0.1.0 | github.com/mattt/aseprite-py | `quality/toolkit/ase_tools/`; venv on the box | Kilumen art pipeline; test assets in `toolkit/ase_lua/tests/` | Chosen writer |
| ase-parser | Read-only .aseprite parser (independent check) | MIT, verified (per toolkit/ASEPRITE_PIPELINE.md) | 0.0.19 | github.com/TheCyberRonin/ase-parser | `quality/toolkit/ase_tools/verify_with_ase_parser.js` | Kilumen art pipeline (verification) | Read only, no writer |
| kil.lua (our own Aseprite Lua toolkit) | Runs Gary's real Aseprite in batch mode: new / walk4 / battle / recolor / tag / export / info / batch | Our own code; uses only the documented Aseprite Lua API; no third-party code | 1.0.0 (2026-10-22) | — | `quality/toolkit/ase_lua/` → Gary's PC `C:\Users\seeth\kilumen_aseprite\ase_lua\` | Kilumen (Gary's PC, via machine Shell with his approval) | Passed 29/29 against the box mock; not yet run in real Aseprite. Aseprite itself is proprietary (Gary's Steam copy); never copied or shipped |
| **Rejected:** aseprite-reader (kennedy0, Python): AGPL-3.0, do not use | | | | | | | |

## Map editor (LDtk)
Pipeline doc: [toolkit/MAP_EDITOR_PIPELINE.md](toolkit/MAP_EDITOR_PIPELINE.md). Added 2026-10-22 (CT), Kilumen map-editor pass.

| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| LDtk (Level Designer Toolkit) | Visual map editor: tiles, IntGrid collision/encounter, typed entities, town and interiors in one project | MIT, verified (LICENSE at tag v1.5.3: "Copyright (c) 2020, Sébastien Benard - Deepnight Games") | 1.5.3 (released 2024-01-15; no release since) | github.com/deepnight/ldtk | kilumen `vendor_staging/ldtk/` (Linux build zip for box tests, JSON schema, LICENSE, 2 official samples). Gary installs `LDtk-1.5.3-installer.exe` himself | Kilumen (dev tool only; nothing ships in the game) | Opened our export in the real app (Linux build under Xvfb). Its save re-imports byte-identical |
| kilumen map_bridge (our own code) | LDtk <-> Kilumen map JSON converter and bot CLI (export, import, diff, roundtrip, render, validate) | Our own code; no third-party code | 2026-10-22 | — | kilumen `tools/map_bridge/` | Kilumen | Roundtrip 32/32 byte-identical; `tests/map_bridge.test.mjs` |
| jsonschema (Python) | Validates .ldtk files against LDtk's JSON schema | MIT per PyPI metadata (UNVERIFIED: LICENSE file not read) | 4.26.0 | github.com/python-jsonschema/jsonschema | box Python (pip) | `map_bridge.py validate` only | Dev tool, not shipped |
| **Considered, not chosen:** Tiled 1.12.2 (mapeditor.org). The editor app is GPL (src/tiled, plugins); only libtiled/tmxviewer/tmxrasterizer are BSD-2 (COPYING). Active and has a CLI, so it is the fallback if LDtk stalls, but it needs Gary's OK as GPL software. Runtime loaders for either format are not needed, because the bridge converts to Kilumen JSON | | | | | | | |

## Design references (not code, nothing copied)
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Mobbin (MCP connector) | Real-app screens and flows for layout reference | Service terms; reference only | — | mobbin.com | — | Any project | Don't copy assets or screenshots into games |
| Refero (MCP connector) | Screen, flow and style references | Service terms; reference only | — | refero.design | — | Any project | Same as above |

## Riftward, Lifeline, paigegames.net: current state (Oct 22, 2026)
- **Riftward** (`/workspace/isekai_ui`): no third-party runtime libraries were found (no vendor folder or package.json). Good candidates from this list: lrud-spatial, SortableJS, lil-gui, floating-ui.
- **Lifeline** (`/workspace/lifesim`): uses `vendor/paige-shared` (our own code) and playwright-core for tests.
- **paigegames.net** (`/workspace/paige_src`, `/workspace/paige-shared`): its own code plus TypeScript (dev only). `paige_src/play/src/vendor/` holds `fame_fx.js` and `replay.js`. Their headers say "LifeSim Fame FX" / "LifeSim Replay", no dependencies: our own studio code, not third party.

## Online play / multiplayer (added Oct 22, 2026, ~10:55 PM CT, Kilumen online groundwork)
These are newer statuses for two rows above (supabase-js, obscenity), plus the options weighed for online play. Plan and costs: `/workspace/kilumen/docs/online_play_plan.md`.
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| supabase-js | Realtime presence/broadcast for zone channels (stage 1), RPCs later | MIT, verified (sub-package LICENSE files not read) | 2.118.0 | github.com/supabase/supabase-js | kilumen `src/vendor/supabase-js/supabase.js` | Kilumen DRAFT, only with `?online=1`, lazy-loaded | Free tier: 200 connections, 100 msg/s, 2M msgs/month; a broadcast counts 1 + 1 per receiver |
| obscenity | Chat profanity filter (handles leet speak; Kilumen adds spaced-letter joining) | MIT, verified | 0.4.6 | github.com/jo3-l/obscenity | kilumen `src/vendor/obscenity/obscenity.mjs` (esbuild single-file bundle) | Kilumen DRAFT (`src/online/filter.js`) | Bundle 50 KB raw; add your own checks for links, phone numbers and contact apps |
| Colyseus | Authoritative room server (positions, battles) | MIT (npm field; repo LICENSE not read) | 0.18.10 | github.com/colyseus/colyseus | — (not pulled) | Evaluated | Free software, but needs a server (about €6/month VPS) or Colyseus Cloud (from $15/month, no free tier). The scale-up path if Supabase fan-out costs get too high |
| boardgame.io | Turn-based multiplayer framework | MIT (npm field; repo LICENSE not read) | 0.50.2 | github.com/boardgameio/boardgame.io | — (not pulled) | Evaluated, rejected | Turn-based only; no fit for a free-walking overworld. Kilumen already has its own battle engine |
| PGlite | Postgres in WASM for testing RLS/RPC migrations offline | Apache-2.0 / PostgreSQL (npm field) | as in riftward/app | github.com/electric-sql/pglite | `riftward/app/node_modules` (reused, not vendored) | Kilumen `supabase/migrations_proposed/tests/`, paige-shared tests | Pair with a small Supabase shim (auth.uid, roles, realtime.messages/topic/send) |

## Effects, music and tileset tools Gary installed from Steam (added Oct 22, 2026, ~11:10 PM CT, research only)
Bridge plan: [toolkit/TOOL_BRIDGES_PLAN.md](toolkit/TOOL_BRIDGES_PLAN.md). Nothing has been run on Gary's PC. Install folders come from the Steam app config (`installdir`, via api.steamcmd.net) and sit under `C:\Program Files (x86)\Steam\steamapps\common\`. That his Steam library is in the default location is UNVERIFIED.
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Pixel Composer (MakhamDev); Gary has the **DEMO** (Steam 2299600). Full version: 2299510, $14.99 | Node-based pixel-art VFX compositor: particles, loops, transparent effect animations; reads .aseprite | Source MIT, verified (GitHub API + repo LICENSE). Licence terms of the Steam binary not checked | GitHub release 1.21.0 (2026-04-28). Steam full build updated 2026-10-17 (CT); demo build 2025-09-21 (CT). Version numbers of the Steam builds are UNVERIFIED | github.com/Ttanasart-pt/Pixel-Composer, docs.pixel-composer.com | `...\common\Pixel Composer Demo\PixelComposer.exe` (full version: `...\common\Pixel Composer\`) | Kilumen hit-effects redraw (proposed) | **Bots can drive it by command only in the full version:** `PixelComposer.exe <proj.pxc> -h` (headless; Export nodes fire automatically) plus `-t`, `-sl`, `-<globalVar> value`. The `PXC.exe` wrapper (downloaded separately; whether Steam ships it is UNVERIFIED) adds `-v`, `-p`, `-s <port>`. Minimum 1.16.6. Export: PNG/JPG/WebP still or image sequence (PNG32 with alpha, or INDEX4/INDEX8), GIF/APNG/MP4/WebM animation, Render Spritesheet node (grid/horizontal/vertical plus atlas data). **Demo gotcha: it can't save or load projects, can't use Export nodes and has no Workshop. Only right-click "save image" works, so headless mode is useless on the demo.** No watermark or time limit is mentioned (UNVERIFIED). .pxc = `PXCX` header + zlib-compressed JSON (read from save_function.gml; not documented) |
| Bosca Ceoil: The Blue Album (Yuri Sizov), Steam 3570850, free | Beginner step-sequencer music and SFX tool (GDSiON synth, 300+ instruments) | MIT, verified (LICENSE; GitHub's detector says "Other"). GDSiON MIT. Original Bosca Ceoil BSD-2-Clause-Views | 3.1.2-stable (GitHub 2025-03-12). Steam build 2025-03-29 (CT); its exact version is UNVERIFIED. main = 3.2-dev | github.com/YuriSizov/boscaceoil-blue, docs: humnom.net/apps/boscaceoil/docs/ | `...\common\Bosca Ceoil The Blue Album\boscaceoil-blue.exe` | Kilumen music/SFX (proposed) | **No command-line export.** The only argument is a `.ceol` path, which opens it in the GUI. Export: WAV, MIDI, XM, MML (**no OGG**; convert the WAV ourselves). `.ceol` is plain-text comma-separated integers, format v3, field order in io/SongSaver.gd. Not formally documented, but easy to script. Bridge: a `.ceol` writer now; later an MIT fork with `--export` (WAV in Godot `--headless` is UNVERIFIED because export renders through live playback) |
| Tilesetter (Led); Gary has the **DEMO** (Steam 1133690, = "Tilesetter Lite"). Full version: 1105890, $12.99 | Builds blob/wang tilesets (edges, corners) from a few base tiles; map editor in the full version | **Proprietary EULA:** personal licence for commercial and non-commercial use; no copying or distributing the software; **no reverse engineering, disassembling or modifying**. Exported tiles aren't mentioned (our reading: our own art is ours to ship) | 2.1.0 (stable 2021-12-18; Steam builds also updated 2021-12-18). Looks dormant | tilesetter.org/docs, led.itch.io/tilesetter, Steam EULA 1105890_eula_0 | `...\common\Tilesetter Lite\Tilesetter Lite.exe` (full version: `...\common\Tilesetter\Tilesetter.exe`) | Kilumen 64 px terrain (proposed; Gary 11:55 PM CT Oct 22: "tile setter is in", edition unverified) | **No CLI or scripting.** Tile size 8–128 px (64 is fine). Exports: Image PNG, JSON (PNG + .txt), Godot, Unity, GMS2, Defold, custom .tsfo. **No TMX or LDtk export**: import the PNG into LDtk/Tiled and set up autotiling again. Lite lacks mixed borders, isometric, map export, engine/custom exports and Sync Regions (itch table). Demo watermark, size caps and project saving are UNVERIFIED. Bridge: Gary exports by hand, bots post-process; or our own generator |

## Pixel FX generation and validation (added Oct 22, 2026, 10:55 PM CT, Animator)
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Pillow | PNG/GIF read/write, nearest-neighbour 2x previews, GIF assembly | MIT-CMU (from installed package metadata; repo LICENSE not read) | 12.3.0 | github.com/python-pillow/Pillow | box Python (pip) | Kilumen `art/characters/pixel/fx_extra/_tools/` (generators + validator) | Pillow merges identical consecutive GIF frames (adds their durations). Save GIFs with a fixed palette (`quantize` against the 64-colour palette) or saving is very slow |
| NumPy | Pixel arrays: palette checks, ToD grading through colour maps, luma readability metric, Bayer dithers | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 (from installed package metadata) | 2.5.4 | github.com/numpy/numpy | box Python (pip) | Kilumen fx_extra tools | Pack RGB into one int (r<<16, g<<8, b) and use `np.searchsorted` against the sorted palette for fast palette lookups |

## Music and SFX generation (added Oct 22, 2026, ~10:56 PM CT, Kilumen wave 2 audio). Tools only; the output is our own audio
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| BeepBox | Chiptune synth + song format. Renders text scores to loop-clean WAV in Node; the beepbox.co URL round trip allows tuning by ear | MIT, verified (LICENSE.md, "(c) 2012-2024 John Nesky and contributing authors"; npm metadata MIT) | 4.2.0 (npm) | github.com/johnnesky/beepbox | kilumen `vendor_staging/audio/beepbox/` (tgz + unpacked) | Kilumen `tools/audio/render_beepbox.mjs` (**tool only, not shipped**) | `Synth` + `loopRepeatCount=-1`. Render 3 passes, keep pass 2, crossfade the first 20 ms from the pass 3 start. Pitch = MIDI-12. See `toolkit/MUSIC_SFX_PIPELINE.md` |
| jsfxr | sfxr-style SFX from parameter blocks | **Unlicense / public domain, FLAGGED:** not on the permissive list (UNLICENSE file; package.json has no licence field) | 1.4.1 (npm) | github.com/chr15m/jsfxr | kilumen `vendor_staging/audio/jsfxr/` | Kilumen `tools/audio/make_sfx.mjs` (**tool only, not shipped**; only our generated sprite ships) | Always pass a FULL param block (a partial one gives NaN and an out-of-memory crash). Envelope = p^2*100000 samples. Seed Math.random |
| ffmpeg | WAV to Ogg Vorbis + AAC M4A, plus demo mp4/webm | LGPL/GPL build (system binary) | box apt | ffmpeg.org | system | `tools/audio/encode.sh`, `make_demos.sh` (tool only) | The AAC edit list is honoured by WebKit and Chromium decodeAudioData (0 ms priming gap measured), so M4A loops are gapless |

### UI tools 2 (Kilumen, Oct 22, 2026 ~11:05 PM CT; local only, uncommitted)

| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| AutoAnimate | Zero-config FLIP for list add/remove/move (menus, ask() rows, Team, Kilindex) | MIT, verified (package LICENSE, "Copyright 2022 FormKit Inc.") | 0.10.0 (npm) | github.com/formkit/auto-animate | kilumen `src/vendor/auto-animate/` | `src/ui/ui_tools2.js` (lazy, skipped under reduced motion) | 3.4 KB gz. Needs a **keyed** reconcile (data-k) or it only sees a full replace. dialog.js rebuilds its list every move, so it is not wired there |
| Floating UI (dom + core + utils) | Tooltip placement that flips/shifts to stay in the viewport (PC + phone landscape) | MIT, verified (LICENSE, "Copyright (c) 2021 Floating UI contributors") | dom/core 1.8.0, utils 0.2.12 | github.com/floating-ui/floating-ui | kilumen `src/vendor/floating-ui/floating-ui.dom.bundle.min.mjs` | `ui_tools2.js` tips (lazy on first tip) | Package files use bare imports, so for zero-build it was **bundled with esbuild** into one ESM file (7.6 KB gz) |
| anime.js | UI and battle-menu transitions (cmd panel in, HP drain ghost, level-up timeline) | MIT, verified (npm LICENSE.md, "Copyright (c) 2025 Julian Garnier") | 4.5.0 stable (5.0.0-beta.2 staged, not used) | github.com/juliangarnier/anime | kilumen `src/vendor/animejs/anime.ui.min.mjs` | default `scr_battle` in `ui.js` via `ui.fx` (lazy) | Subset build 16.6 KB gz (full 40.8). v4 runs on JS/rAF, not WAAPI. Hook for `ui_sd.js`: `await ui.fx.battleWarm(); ui.fx.drainBar(bar,f,{num,from,to,max}); ui.fx.cmdsIn(panel); ui.fx.levelUpPop(box)` |
| pixelarticons | 24px pixel icons for menu, pocket tabs, empty states, options | MIT, verified (LICENSE, "Copyright (c) 2019 Gerrit Halfmann") | 2.4.2 (subset) | github.com/halfmage/pixelarticons | kilumen `src/vendor/pixelarticons/` + `src/ui/icons.js` | `ui.js`, `systems_screens.js` | Inlined subset of ~40 paths (6.3 KB raw); replaces Kenney placeholders only where it fits better |
| Kenney UI Pack 2.0 / Pixel Adventure 2.0 | Slider and check placeholders in Options | CC0 (License.txt in each pack) | UI Pack 2.0 (12-06-2024), Pixel Adventure 2.0 (04/09/2024) | kenney.nl | kilumen `art/ui/kenney_ui_placeholder/` | Options screen | **Placeholders only** (data-placeholder="kenney"), recoloured by theme.css; 2 KB of PNGs |

## Bosca Ceoil Blue script bridge (added Oct 22, 2026, ~11:01 PM CT, box only)
Newer status for the Bosca Ceoil Blue row above: **headless WAV export is now VERIFIED on the box** (it was UNVERIFIED). Usage: [toolkit/bosca/README.md](toolkit/bosca/README.md). Nothing was run on Gary's PC, nothing was pushed, and no repo was created.
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Bosca Ceoil: The Blue Album (local fork) | Real-app load check + headless export of bot-written songs | MIT, verified (upstream LICENSE kept unchanged in fork/) | 3.1.2-stable, commit 531eb571 | github.com/YuriSizov/boscaceoil-blue | `toolkit/bosca/fork/` (+ pristine `src_ref/`) | `toolkit/bosca/ceol.py` | Only change: one autoload, `cli/BoscaCli.gd` (`--check`, `--export`, `--dump-voices`, `--make-fixtures`), listed in fork/KILUMEN_CHANGES.md. Headless MIDI/XM/MML/**WAV** all work with Godot's dummy audio driver. WAV renders in real time (about 2x the song length) and was byte-identical across two runs |
| GDSiON | Synth GDExtension used by Bosca | MIT, verified (LICENSE, includes the SiON by keim MIT notice) | 0.7-beta8 | github.com/YuriSizov/gdsion | `toolkit/bosca/fork/bin/` (Linux .so + GDSION_LICENSE.txt) | fork | Upstream CI downloads it at build time. On a fresh copy, run `--import` twice (the first run registers the extension) |
| Godot Engine | Runs the fork headless | MIT (not shipped) | 4.3-stable (4.3.stable.official.77dcf97d8) | godotengine.org | `toolkit/bosca/_deps/Godot_v4.3-stable_linux.x86_64` | ceol.py | The version comes from the project's `config/features` "4.3" and the CI GODOT_VERSION 4.3.0-stable |
| ceol.py (ours) | JSON spec → .ceol, lossless .ceol read/write, CLI around the fork, seamless .loop.ogg | MIT (Kilumen toolkit) | Oct 22, 2026 | — | `toolkit/bosca/ceol.py` | Kilumen music (proposed) | Byte-exact on 31 app-saved files + v1/v2. Our files load in the app, and the app re-saves them byte-identically. C5 = 60 (Bosca octave = value//12) |
| mido | MIDI parse check in tests | MIT (PyPI metadata; LICENSE not read) | latest from pip | github.com/mido/mido | /tmp venv only (not kept) | test only | Used once to confirm the exported MIDI parses |

## Pixel Composer command-line bridge (added Oct 22, 2026, ~11:07 PM CT, box only)
Usage and the list of unverified points: [toolkit/pxc/README.md](toolkit/pxc/README.md). Nothing has been run on Gary's PC. Headless render is **UNVERIFIED** until Gary runs `toolkit/pxc/run_on_gary.ps1.txt`.
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Pixel Composer (source reference) | Node-based pixel FX app. Gary owns FULL 1.22.0.5 (Steam); source used to derive the .pxc format and the CLI | MIT, verified (repo LICENSE, "Copyright (c) 2023 Tanasart") | source main e8f2c002f = 1.22.0.206 / SAVE_VERSION 122002 (mapping to Steam 1.22.0.5 UNVERIFIED) | github.com/Ttanasart-pt/Pixel-Composer | `toolkit/pxc/src_ref/` | `toolkit/pxc/pxc_make.py` | `PixelComposer.exe file.pxc -h` renders, runs all Export nodes, then quits. Sequence/Animation export probably hangs headless, so draw frames as an array and use Single PNG32 export |
| pxc_make.py / pxc_io.py (ours) | JSON spec → .pxc, and any .pxc → JSON | MIT (Kilumen toolkit) | Oct 22, 2026 | — | `toolkit/pxc/` | Kilumen FX (proposed) | Reader parsed 61/61 repo .pxc files. Writer output has not been loaded in the real app yet |
| ImageMagick (bundled with PXC) | Assembles the GIF from the exported PNGs in Gary's command | Apache-2.0-style ImageMagick licence (not re-read) | whatever ships with PXC | imagemagick.org | PXC install (location UNVERIFIED) | `run_on_gary.ps1.txt` | Runs outside the PXC graph |

## PixelOver (paid tool, bought by Gary Oct 22, 2026 ~11:34 PM CT)
| Tool | Purpose | Licence | Version | Source | Staged path | Projects | Gotchas |
|---|---|---|---|---|---|---|---|
| PixelOver (Deakcor, Steam app 1762550, Early Access, $19.99) | Pixel-perfect bone/IK/mesh rigging and animation of creatures; palette indexing and dithering; 3D-to-pixel renders | Commercial (Gary's licence); outputs are ours | latest Steam (0.19.x as of Sep 2026) | https://pixelover.io, manual https://docs.pixelover.io | Gary's PC (Steam) | Kilumen (creature idle/attack/hurt) | **No CLI/headless mode** (dev: "noted for a future update", itch.io thread 2024), so GUI-only. Imports .aseprite (layers + tags as animations, 0.19.2+), PNG, GIF, OBJ/VOX/glTF/FBX. Exports PNG/sprite sheet + JSON (frames x/y/w/h/duration; meta.frameAnimations name/fps/from/to), GIF, .aseprite. Bridge: `toolkit/pixelover/po_import.py` (Oct 22, 2026): PixelOver sheet + JSON (single or merged) → `<name>_<side>_<anim>_battle_2x` sheet/GIF/JSON (rects, ms, total_ms, feet anchor), nearest 2x, palette check, --dry-run. Gary guide: `toolkit/pixelover/GARY_FIRST_CREATURE.md`. Chosen over Crocotile 3D, which waits for Unity. |

**PixelOver project format and hand-built rig (added Oct 22, 2026, ~11:45 PM CT, Grok Bot, box only).** `.pixelover` is a **text** file (Godot ConfigFile syntax) with PNGs embedded raw after `[resource_data key=... size=N]`. It can be generated by script; format notes are in `toolkit/pixelover/PIXELOVER_FORMAT_NOTES.md`. Generator (generic: parts PNGs + spec JSON → .pixelover; also a `capture` adapter for `capture_poses/rig_parts/<char_id>/`): `toolkit/pixelover/make_po_rig.py`. First output: `trial/cindrip_rig.pixelover` (Cindrip, 7 parts, 8 bones, idle/attack/hurt at 6 fps, feet planted), with a self-check and an approximate preview GIF. Export settings must match po_import: PNG + JSON with the same stem, scale 1, no trim. Gotchas: no CLI or headless mode, so exporting needs Gary's GUI (paid version); 0.15/0.16 files use Godot-3 syntax, 0.18+ uses Godot-4 syntax (`&"key"`, PackedByteArray); always skip blobs by `size=`, never by searching for the next `[`; object_scale is a percent; child positions are relative to the canvas centre; the refs' `[export]` only holds export_path/anim_folder, so set sheet/JSON/scale in the Export dialog; layer shader effects (indexed palette, dithering, outline, denoise) will change pixels unless switched off. **Not yet opened in PixelOver**, so treat the file as unproven until Gary loads it.

## Terrain transition sets: free replacement for Tilesetter (added Oct 22, 2026, 11:35 PM CT, box only)
Gary's ask (11:21 PM CT): "couldnt you just make tile setter? code our own tool or find one on git hub for free". Gary's decision (11:23 PM CT): **"use auto and blob"**: use Autotiler and Blobator, drop TilePipe2, and build nothing of our own unless both leave a gap. Tilesetter itself was not opened, read or imitated (EULA). All licences below were read from each repo's own LICENSE file. Pipeline, CLI and limits: [toolkit/tilegen/README.md](toolkit/tilegen/README.md).
| Tool | Purpose | Licence | Version | Source | Path | Used by | Notes |
|---|---|---|---|---|---|---|---|
| Autotiler (Javi Aguilar) | 13-tile template → 47-tile blob set and 16-tile dual grid, plus neighbour JSON, a Tiled .tsx Wang set and a test map | MIT, verified (LICENSE, 2020) | v2.0.1, HEAD bc573b8e (Sep 25, 2026, 8:44 PM CT) | github.com/itsjavi/autotiler (web: itsjavi.com/autotiler) | `toolkit/tilegen/vendor/autotiler_core/` (src/core, unchanged, LICENSE alongside) + our CLI `toolkit/tilegen/autotiler_cli/` | Kilumen tilegen | Runs headless in Node. Upstream wants Node 24; our esbuild bundle runs on Node 20. Blob bits N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128 |
| Blobator (Emma Maassen / Enichan) | CLI: blank 47-blob templates (colour + index JSON) and blob-47 assembly from a microblob or subblob sheet | MIT, verified (LICENSE, "Copyright (c) 2016 Emma Maassen") | HEAD 2d02bd16 (2017-10-28) | github.com/Enichan/blobator | built at `toolkit/tilegen/blobator_build/Blobator.exe` (mono 6.12, mcs) | Kilumen tilegen (cross-check + templates) | Windows: use the repo's Blobator.zip (.NET Framework 4.5). Use the **subblob** layout at 64px (128x192); microblob breaks the 64px texture phase. Bits differ from Autotiler's (TL=1 T=2 TR=4 R=8 BR=16 B=32 BL=64 L=128). Its output was pixel-identical to Autotiler's on 47/47 tiles in all 5 sets |
| Newtonsoft.Json | Blobator's JSON dependency | MIT (NuGet licence) | 8.0.3 | nuget.org/packages/Newtonsoft.Json | `toolkit/tilegen/blobator_build/` | Blobator build | Same version as Blobator's packages.config |
| fast-png (+ fflate, iobuffer) | PNG decode/encode for the Autotiler CLI | MIT (fast-png, Michaël Zasso); fflate MIT; iobuffer MIT | fast-png 8.0.0 | npm | `toolkit/tilegen/autotiler_cli/node_modules` (bundled into autotiler_cli.mjs) | Autotiler CLI | Exact pixels, no colour management |
| mono 6.12 (runtime + mcs) | Builds and runs Blobator on Linux | MIT / LGPL runtime (separate tool, not vendored) | 6.12 (Ubuntu apt) | mono-project.com | box only | Blobator build | Needs libgdiplus and libmono-system-web-extensions4.0-cil |
| TilePipe2 (aleksandrbazhin) | Godot app: generates tilesets from parts | MIT, verified (LICENSE) | last commit 2023-02-17 (alpha) | github.com/aleksandrbazhin/TilePipe | `toolkit/tilegen/_research/` (reference clone only) | — | **Dropped** on Gary's call, 11:23 PM CT |
| tilegen (ours) | Draws the 13-tile template from two base tiles (the one gap neither tool fills). Also seamcheck, LDtk rules + test map via the map bridge, contact sheet, in-game shots | ours (Kilumen toolkit) | Oct 22, 2026 | — | `toolkit/tilegen/` | Kilumen (proposal; WD decides) | Outputs path/water/sand on grass: 47 + 16 tiles each, 0 seams (out/seamcheck.json). Live game tiles and WD maps untouched |
Other repos found, read and **not used**: HeartoLazor/autotile_generator (MIT, 2019), wareya/autotyler (Apache-2.0, 2021), toku-sa-n/blob-tileset-generator (BSD-3, 2022). Found by search only, licences not verified: tlhunter/node-autotile (no licence, so unusable), r3eckon/AutoTilesetGenerator (Unlicense), ticial/AutotileGenerator (CC0).

## Free web-quality tools for Kilumen (added Oct 22, 2026, 11:37 PM CT, box only, nothing committed or pushed)
Gary (11:24 PM CT): *"why havent we been using all of these the whole time?"* After this, a free-tool scan comes before any new system (GAME_QUALITY_CHECKLIST.md, "Free-tool scan first"). Every licence was read from the package's own LICENSE file unless noted. Dev tools live in `kilumen/tools/free_tools/` (its own package.json, so the game's package.json is untouched; node_modules is 261 MB and git-ignored). None of these ship to players except the generated service worker (Workbox runtime, MIT), and only when the PWA is switched on.
| Tool | Purpose | Licence | Version | Source | Staged path | Projects | Gotchas |
|---|---|---|---|---|---|---|---|
| Lighthouse | Performance, accessibility and best-practices audits (mobile throttled + desktop) | Apache-2.0, verified (node_modules/lighthouse/LICENSE) | 12.8.2 | npm `lighthouse` / github.com/GoogleChrome/lighthouse | `kilumen/tools/free_tools` + `kilumen/tools/lighthouse_check.mjs` → `shots/lighthouse/` | Kilumen | Uses Playwright's Chromium through chrome-launcher. Launch a fresh profile per preset, or IndexedDB from the previous run skews the next one. **Perf scores are noisy on the shared box** (load avg 27 on 8 cores: desktop 67 → 43 between runs). Trust byte weight and opportunities more than the score. python http.server has no gzip, so "text compression" is partly a local artefact. npm audit: 27 dev-only vulns (puppeteer-core, extract-zip chain) |
| workbox-build (+ workbox-sw/precaching runtime inlined into the SW) | Generates the optional PWA service worker: precached shell, runtime-cached art/audio, versioned caches | MIT, verified (LICENSE in workbox-build, workbox-sw, workbox-precaching: "Copyright 2018 Google LLC") | 7.4.1 | npm `workbox-build` / github.com/GoogleChrome/workbox | `kilumen/tools/pwa_build.mjs` → `kilumen-sw.js`, `pwa/` (README there) | Kilumen (off by default, `?pwa=1`) | A stale SW serves stale code, so rebuild before every deploy. Opt-in sticks until `?pwa=0`. Offline only covers art already seen online. Playwright `setOffline` didn't reliably reach the SW, so the test stops the web server instead. The upgrade right after a server restart activated the new SW without its precache (3/3 runs, cause not found). Run the upgrade test first |
| actionlint | Lints GitHub Actions workflows | MIT, verified (LICENSE.txt, "Copyright (c) 2021 rhysd") | 1.7.12 | github.com/rhysd/actionlint (release binary) | `/tmp/actionlint_bin/` (box only, not kept in repo) | Kilumen CI | 0 findings on `.github/workflows/test.yml`. shellcheck isn't installed, so `run:` scripts were not shell-linted |
| GitHub Actions: actions/checkout@v4, actions/setup-node@v4, actions/cache@v4 | CI: npm test + stable Playwright e2e on push/PR | MIT, verified (each repo's LICENSE via the GitHub licence API, Oct 22, 2026) | v4 tags | github.com/actions/* | `kilumen/.github/workflows/test.yml` | Kilumen | **Repo has no git remote**, so CI can't run until Gary creates a GitHub repo and pushes. Free on public repos; private repos use the free monthly minutes. touch_e2e runs Chromium only (WebKit iPhone timing checks are flaky) |

### Recommended to Gary, awaiting his pick, tool-only (nothing installed)
| Tool | Purpose | Licence / terms | Version | Source | Staged path | Projects | Gotchas |
|---|---|---|---|---|---|---|---|
| Inky (inkle) | Writer's editor for .ink dialogue, with live play-through. Pairs with the inkjs runtime already vendored and `tools/ink/compile.mjs` | MIT, per README "License" section + app/package.json (**the repo has no LICENSE file**) | 0.15.2 (latest GitHub release) | github.com/inkle/inky | — | Kilumen dialogue | Keep Inky's ink version in step with the vendored inkjs, or compiled JSON may not load |
| ChipTone (SFBGames, Tom Vian) | Retro SFX generator (HTML5 / Win / Mac) | Free tool. **Sounds made with it are CC0** ("FREE to use for any purpose, commercial or otherwise, under the CC0 licence", itch.io page, read Oct 22, 2026) | 0.5.1 (Windows download) | sfbgames.itch.io/chiptone | — | Kilumen SFX | Tool is closed-source (tool-only). No Linux build. Keep the exported .wav plus settings for re-edits |
| Audacity | Audio trim, loop points, normalise, convert | **GPLv3** (LICENSE.txt: "released under the GNU GPL version 3"), so **tool only, never vendor or link its code**. Audio we export is ours | 4.0.1 (latest GitHub release) | github.com/audacity/audacity / audacityteam.org | — | Kilumen music/SFX cleanup | Not for embedding. Use the exported files only |
| Lospec palette list | Ready pixel-art palettes (e.g. Endesga 32) to pin a game palette | **No licence is shown on the palette pages** (checked endesga-32: author credit only). Check each palette's author terms and credit them before adopting | — | lospec.com/palette-list | — | Kilumen art direction | Record the chosen palette's author, URL and terms here when picked |

## Music for Riftward and Lifeline (added Oct 22, 2026, ~11:45 PM CT, Grok Bot; local commits only, nothing pushed or published)
The same tools as Kilumen, reused. All melodies are original, generated from our own theory/score scripts.
| Tool | Used for | Licence | Where | Notes |
|---|---|---|---|---|
| howler.js 2.2.4 | Runtime music + SFX (shipped) | MIT, verified (LICENSE copied beside it) | Riftward `app/src/vendor/howler/` (ESM + our `.d.ts`; dynamic-import chunk 26.6 KB built). Lifeline `vendor/howler/` | Riftward's tsconfig has checkJs: put `/* eslint-disable */` first, then `// @ts-nocheck` |
| BeepBox 4.2.0 | Riftward field + dungeon; Lifeline life + farewell (tool only) | MIT, verified | kilumen `vendor_staging/audio/beepbox/`, called from each game's `tools/audio/render_beepbox.mjs` | Score JSON + beepbox.co URL saved in `tools/audio/src/` |
| Bosca Ceoil Blue fork (ceol.py bridge) | Riftward town + fallen; Lifeline title (tool only) | MIT, verified | `/workspace/kilumen/toolkit/bosca/` | `.ceol` + spec JSON saved in `tools/audio/src/`; the app can open them for edits |
| jsfxr 1.4.1 | Riftward UI SFX sprite (tool only; only our generated sprite ships) | Unlicense (FLAGGED, as above) | Riftward `app/tools/audio/make_sfx.mjs` | Lifeline already had WebAudio SFX (`art/sfx.js`), so no jsfxr there |
| ffmpeg (libvorbis q2 / AAC 96k; SFX mono q3 / 64k) | Encode + loudness (-16 LUFS, TP <= -1 dBTP) | LGPL/GPL tool, not shipped | box | `tools/audio/encode.sh`, `loudness.sh` |

### Adopted Oct 22, 2026, 11:40 PM CT (Gary, 11:24 PM CT: "use all those tools"; box only, nothing committed or pushed)
Supersedes the "awaiting his pick" rows above for these four.
| Tool | Purpose | Licence / terms | Version | Source | Staged path | Projects | Gotchas |
|---|---|---|---|---|---|---|---|
| Inky (inkle) | Writer's editor + live play for .ink dialogue | MIT, verified (README "License" + app/package.json; no LICENSE file in repo). Evidence: `toolkit/_licence_evidence/inkle_inky_*` | 0.15.2 | github.com/inkle/inky | box `/home/box/tools/inky/` | Kilumen dialogue | Runs under Xvfb. Bundled inklecate matches ink 1.2.1 |
| inklecate / ink | Official .ink compiler | MIT, verified (LICENSE, inkle Ltd.) | 1.2.1 | github.com/inkle/ink | box `/home/box/tools/inklecate/` | Kilumen dialogue | Output identical to inkjs compiler for our story |
| inkjs | Ink runtime in the game + Node compiler | MIT, verified (LICENSE, Yannick Lohse) | 2.4.0 | npm `inkjs` | runtime `kilumen/src/vendor/inkjs/`; compiler `kilumen/vendor_staging/inkjs/` | Kilumen (OFF by default, `?ink=1`) | One NPC proven identical (toolkit/INK_PIPELINE.md). Choices not wired yet |
| ChipTone (SFBGames, Tom Vian) | Retro SFX generator | **Exported sounds CC0**, verified verbatim on the itch page ("FREE to use for any purpose, commercial or otherwise, under the CC0 licence"; asset licence field "Creative Commons Zero v1.0 Universal"). Tool itself free, closed-source: tool only | 0.5.1 (Windows download; HTML5 in browser) | sfbgames.itch.io/chiptone | — (browser tool; no Linux build) | Kilumen SFX | Keep the settings file next to each export. Workflow in toolkit/MUSIC_SFX_PIPELINE.md |
| Audacity | Trim / fade / normalise cleanup via headless macros | GPL-3.0: tool only, never vendor | **3.7.3** (Ubuntu apt 3.7.3+dfsg-1; upstream latest 4.0.1) | audacityteam.org | box (apt) + macros/runner `toolkit/audacity/` | Kilumen music/SFX | mod-script-pipe enabled. `Macro_` over the pipe not recognised in 3.7.3, so the runner sends lines. loudness.sh is still the gate |
| SoX | Test-signal generation / quick checks for the Audacity tests | GPL-2.0+ / LGPL (tool only) | 14.4.2 (apt) | sox.sourceforge.net | box (apt) | Kilumen audio QA | Not shipped |
| Lospec palette list | Reference palettes to compare against | **No palette licence** on lospec.com (T&C are site/store terms; pages show author credit only). Only "free to use" statement is a user comment, not official. Credit author + link if ever adopted. Evidence: `toolkit/_licence_evidence/lospec_*.html` | — (top 600 by downloads, fetched Oct 22, 2026) | lospec.com/palette-list | `toolkit/palette/` (study, proposal only) | Kilumen art | No palette is close (best weighted ΔE2000 4.3, 36/64 colours visibly shifted). **Kept the current 64-colour palette, locked** (`kilumen/art/palette/`, `kilumen/tools/palette_check.py`) |

- 2026-10-22 11:42 PM CT, Gary on the generated vs hand-made tile contact sheet: "i think the right looks better". Generated transition tiles stay OUT of the game. tilegen (Autotiler+Blobator) is used only for blank templates, layout/rules and the seam check; terrain art stays hand-drawn.
- 2026-10-22 11:42 PM CT, follow-up: Gary then said of the generated tiles "those are ok". Generated tiles MAY be used for new areas (World Design OK + hand touch-up where seen closely); existing hand-made tiles stay. Supersedes the line above.

## Juice FX (paid, Steam 1046770, by CodeManu) — Gary installed it Oct 22, 2026, 11:59 PM CT ("juice fx is in")
- Purpose: one-click sprite animation effects (flash, scale/squash, skew, shake, wobble, jump, wave, outline, tint, dissolve) from a single still; presets, own presets, .pal palettes up to 256 colours, Pixel Art vs HD mode.
- Export: sprite sheet, GIF or single frames. Steam page says 128x128 max (v1); itch page says up to 512x512. v2.0 beta (Steam Betas tab "v2.0.0.0") is a rewrite: node graph, arbitrary canvas size, MP4, smears. v1 HD mode can't export sheets/GIF (frames only).
- Licence: commercial proprietary tool; our exported art is ours (EULA not yet read; check before shipping). No CLI/scripting found, so Gary or Animator exports by hand; bots post-process (po_import.py-style: sheet + timings -> game sheet, palette check against kilumen.hex).
- Kilumen use: pre-baked creature reactions (hurt wobble, faint dissolve, capture-crystal pull-in, level-up/evolution pulse, idle bob) at 1x 64 px, then nearest-neighbour 2x. Keep code-driven flash/shake that already exist in battle FX; use Juice FX where code can't match (dissolve, wave, outline pulses). Must pass the palette lock.
- Sources: store.steampowered.com/app/1046770, codemanu.itch.io/juicefx, Steam v2.0 beta announcement (read Oct 22-23, 2026). Version on Gary's PC: unverified.

## Pixel-art rotation for capture poses (bone_v2) — Oct 23, 2026, CT
- Approach: RotSprite (Xenowhirl's algorithm: pixel-guessing 8x upscale, aliased rotate, downscale) using Scale2x (Andrea Mazzoleni, AdvanceMAME; spec at scale2x.it) applied 3x. **Own numpy implementation written from the published algorithm descriptions** in `quality/toolkit/pixelover/capture_bone.py` (`scale2x`, `mode_rows`, `render_arm`). No library installed or vendored, no third-party source copied.
- Existing implementations checked (Oct 23, 2026), none used: amadvance/scale2x (reference C, GPL-2.0), tversteeg/rotsprite (Rust crate, AGPL-3.0-or-later), tzinmein/rotsprite-sharp (.NET, AGPL-3.0-or-later), adnanlah/rotsprite-webgl (JS, MIT). If we ever vendor one, only the MIT one is shippable without copyleft obligations; the GPL/AGPL ones are tool-only.
- Variant notes: our upscale uses exact-equality Scale2x (RotSprite's original uses a similarity test); downsample = mode of 8x8 subsamples per pixel instead of a single nearest sample; no offset search. Silhouettes come from clean capsules, not from the rotated image, so edges stay on 1:1/2:1/3:1 steps.

## Candidates from the GitHub scan: Oct 23, 2026 12:14 AM CT (status: candidate (not adopted))
Details and rankings: `dev_notes/kilumen_github_candidates_2026-10-23.md`. Licences come from the GitHub API, plus the LICENSE file for Piscina. Nothing is installed.
- cspell (MIT): blocked-word + spelling lint. ~~candidate~~ **adopted Oct 23, ~12:50 AM CT** (see Free tools pass below)
- pixelmatch (ISC): screenshot diff. ~~candidate~~ **adopted Oct 23, ~12:50 AM CT** (helper + tests; no baseline suite yet)
- sharp (Apache-2.0; bundles libvips LGPL, tool-only): WebP/AVIF. ~~candidate~~ **adopted Oct 23, offline only** (see below)
- oxipng (MIT): lossless PNG. ~~candidate~~ **adopted Oct 23, offline only, lossless** (see below)
- Ajv (MIT): data-table schema tests. ~~candidate~~ **adopted Oct 23, ~12:50 AM CT** (see below)
- Valibot (MIT): save validation. candidate (not adopted)
- Piscina (MIT): parallel balance sims. candidate (not adopted)
- simple-statistics (ISC): sim stats. candidate (not adopted)
- json-editor (MIT): dev data editor. candidate (not adopted)
- stats.js (MIT): perf overlay. candidate (not adopted)
- web-vitals (Apache-2.0): field perf. candidate (not adopted)
- free-tex-packer-core (MIT): atlas packing. candidate (not adopted)
- gremlins.js (MIT): monkey testing. candidate (not adopted)
- Proton (MIT): particles, likely redundant. candidate (not adopted)

## Free tools pass: 10 GitHub candidates adopted (Oct 23, 2026, ~12:50 AM CT; Gary approved 12:15 AM CT). Kilumen dev build only; nothing committed or published, alpha untouched
Licences were checked against the LICENSE file in each installed tarball (exact versions). Dev copies live in `kilumen/tools/free_tools` (its own package.json, not installed by CI); ajv, pixelmatch and pngjs are also root devDependencies (exact pins) so the tests run in CI. Ship size added: Valibot ~2.3 KB gzip (always), stats.js ~1.8 KB gzip incl. loader (only with `?debug=perf`).
- Ajv 8.20.0 (MIT): **adopted**, devDependency. `tools/schemas/*.schema.json` + `check_data.mjs` (`npm run check:data`), test `tests/data_schemas.test.mjs`. Core data (quests, masters, encounters.json) must pass; design/overnight_gd drafts are warn-only (`KILUMEN_DATA_STRICT=1` makes them hard). Gotchas: strict mode needs `strictRequired:false`; anyOf on zones gave noisy errors, so it uses if/then/else and drops `if` errors.
- pixelmatch 8.0.0 (ISC) + pngjs 7.0.0 (MIT): **adopted**, devDependency. `tools/visual/visual_diff.mjs` (`npm run visual:diff -- <baselineDir> <currentDir>`), test `tests/visual_diff.test.mjs`. Warn-only unless `--strict`; diff PNGs go to /tmp. Gotcha: the current shots/ PNGs are not deterministic (animation, time of day), so a baseline suite needs fixed time/weather first.
- cspell 9.8.0 (MIT): **adopted**, dev only. `tools/text_lint/` (cspell.json en-GB, kilumen-words.txt, spellcheck.mjs; `npm run lint:text`), test `tests/text_lint.test.mjs`. Blocked words (shiny, poké*, nurse, alcohol/drug words …) fail only when NEW; known hits are in blocked_baseline.json. Spelling is warn-only. Gotchas: test skips when tools/free_tools is not installed (CI); a broad `{…}` ignore regex hid real hits; keep it to `{placeholder}` shapes.
- Valibot 1.5.0 (MIT): **adopted, ships**. Subset bundle `src/vendor/valibot/valibot.min.js` (esbuild, rebuild command in its README), `src/overworld/save_schema.js`, small marked edits in `src/overworld/save.js`. Bad saves fall back to the backup, the raw text is kept at `<key>.bad`, and a bad save never replaces a good backup. Test `tests/save_valibot.test.mjs` (incl. fast-check property). Gotcha: the licence file is LICENSE.md; a `LICENSE` copy was added because build_alpha.py only keeps files named LICENSE.
- stats.js 0.17.0 (MIT): **adopted, debug only**. `src/vendor/stats.js/`, `src/debug_perf.js`, one loader line in index.html gated on `?debug=perf`. Gotcha: UMD build, so it is loaded as a classic script (window.Stats). The alpha build prunes it because nothing imports it statically. Still, the alpha index.html should drop the loader line (alpha.js does not strip `debug=perf`).
- json-editor 2.17.3 (MIT): **adopted, dev page only**. `tools/dev/data_editor.html` (under tools/, so not in the alpha filelist). It inlines `kilumen:common` refs and drops if/then/else, because json-editor does not follow them. Download only, so it never writes to the repo; Ajv stays the real validator.
- oxipng 10.2.1 (MIT): **adopted, offline only, lossless**. Binary `tools/free_tools/bin/oxipng`; `tools/assets/png_optimize.mjs` copies to /tmp/kilumen_png_opt, runs `-o 2 --strip safe` and proves the pixels are identical with pngjs. Never in place. Sample run: 257 overworld tile/interior PNGs, 24.1 MB → 9.5 MB (−60.6%), all identical.
- sharp 0.35.5 (Apache-2.0; @img/sharp-libvips 1.3.4 is LGPL-3.0-or-later): **adopted, offline only**. `tools/assets/webp_variants.mjs` writes WebP/AVIF copies to /tmp/kilumen_img_variants. key_art_notext.png 4.4 MB → 333 KB WebP q82 / 197 KB AVIF / 244 KB WebP at 1920 px. Never import it from src/ (native module).
- Piscina 5.3.2 (MIT) + simple-statistics 7.12.1 (ISC): **partial** (encounter sim only, not a full battle sim yet). `tools/sim/encounter_sim.mjs` + worker (`npm run sim:encounters`), covered by `tests/free_tools.test.mjs`. Rolls every zone × phase in worker threads and checks the observed species share against the weights. It uses `createRequire(tools/free_tools/package.json)` so the root deps stay small.

### Gary's tool review: Oct 23, 2026, 9:05 AM CT (Grok Bot coder, Kilumen dev only; nothing committed or published, alpha untouched)
Gary asked to keep only the tools with a real benefit, all permissively licensed. No new packages were installed. All five were already in the dev build, and this pass tightened how they are wired.
- cspell 9.8.0 (MIT): **kept**. `npm run lint:text`. The blocked list now also covers **phrases** that cspell's single-word flagWords cannot match: PP (case-sensitive), "super effective", "Poké Ball"/"Poke Ball", "Gotcha!", and "tonic" used as a label. The check is in `BLOCKED_PHRASES` in `tools/text_lint/spellcheck.mjs`, scans JSON string values only (ids like `tonic_small`, keys and `_meta`/note fields are skipped) and has no allowance, so any hit fails `tests/text_lint.test.mjs`. shiny, Pokédex, nurse and weed stay in cspell flagWords. `blocked_baseline.json` is now empty: both old 'shiny' hits are fixed. 46 invented names and real words were added to `kilumen-words.txt`, leaving 7 spelling warnings (US spellings `Vigor` ×6 and `practicing`; left for Gary).
- Ajv 8.20.0 (MIT): **kept**. `npm run check:data` validates quests, masters and encounters.json (core must pass) plus the overnight drafts (warn-only). Current run: core is clean apart from 9 known "species has no art yet" warnings, and 1 draft placeholder.
- pixelmatch 8.0.0 (ISC) + pngjs 7.0.0 (MIT): **kept as a helper; no baseline suite added (not cheap yet)**. Deterministic screenshots need a browser run with fixed time, weather and animation, and the current shots/ PNGs are not deterministic. Revisit once a seeded headless capture exists.
- oxipng 10.2.1 (MIT): **kept, build-time only, lossless**. Re-run at ~9:10 AM CT into /tmp/kilumen_png_opt_0905 on the shipped overworld tiles (tiles_1x/2x/3x, tiles_extra, interiors_new). 257 PNGs went from 27.8 MB to 11.0 MB (−60.4%, 16.4 MB saved), and pngjs decoded every file **pixel-identical**. Originals were untouched and nothing touched live.
- sharp 0.35.5 (Apache-2.0; libvips LGPL-3.0-or-later, tool-only): **kept, build-time only**, never imported from src/. WebP is lossy unless `lossless:true`, so for Gary's "lossless only" rule use oxipng for shipped PNGs and treat sharp WebP/AVIF as opt-in previews (key_art 4.4 MB → 333 KB WebP q82, not pixel-identical).

## Creature sprite stand-ins: candidates, not adopted (Oct 23, 2026, ~1:05 AM CT, Grok Bot, box only)
Gary (12:49–12:50 AM CT) asked whether free creature sprites could stand in for undrawn dex slots ("pull 150 and see if we can use them"; "if they arent useable then skip that step"). An early fit test came back **no-go**, so the 150 pull was stopped after 2 packs. Nothing went into the game. Staging: `/workspace/art_library/free_creatures_staging/` (fit test sheet `fit_test_isaiah658.png`, palette helper `_tools/kq.py`).
| Pack | Licence | Count / size | Source | Staged path | Status | Notes |
|---|---|---|---|---|---|---|
| 50+ Monsters Pack 2D (isaiah658) v1.0 | CC0, verified (OGA page + pack Credits.txt) | 56 creatures, front + back + alt palette, 64x64 | opengameart.org/content/50-monsters-pack-2d | `free_creatures_staging/isaiah658_50_monsters/` | **used as bases for reworks** (Oct 23 2026; not drop-ins, nothing in the game): 49 reworked into Kilumen-style draft fronts in `free_creatures_staging/rework/` (20 usable drafts, 29 need a hand pass), 7 dropped for Pokémon resemblance. Style no-go as drop-ins still stands | Pure-black outline + 4 flat colours at 64px; Kilumen fronts are 128/160px, ~20–26 colours, soft shading, dark-brown outlines. Palette quantize works (ΔE nearest in Lab), but density/outline/shading differ, so they read as another game. Useful only as pose/silhouette references. Author says the set targets a Gen 2/3 monster-game feel: check each design for resemblance before any use |
| Assets for Tuxemon (biodegradableguy) | CC0 (OGA page; no licence file) | 10 creatures, 64x64 front/back | opengameart.org/content/assets-for-tuxemon | `free_creatures_staging/biodegradableguy_tuxemon_assets/` | candidate (not adopted): rejected | Mixed styles, includes a human sumo and joke designs |
| Tuxemon Set 1 (154 monsters) | **CC-BY-SA 4.0** + per-monster attribution | 154, 64x64 | opengameart.org/content/tuxemon-set-1-154-monsters-front-and-back-sprites-and-menu-animations | — (not pulled) | excluded | SA licence and a Pokémon-like fan project |
| Dungeon Crawl 32x32 tiles | CC0 per OGA listing (not re-read) | hundreds, 32x32 roguelike tiles | opengameart.org/content/dungeon-crawl-32x32-tiles | — (not pulled) | not pulled | 4x upscale to Kilumen battle size; style gap larger than isaiah658 |

## Kilumen mood layers scan: Oct 23, 2026, ~11:35 AM CT (Grok Bot coder; status: scanned, none adopted)
Searched GitHub/npm for small canvas-2D ambient particle, vignette and god-ray code to reuse in `src/overworld/mood.js`.
| Candidate | Licence (repo) | What it is | Decision |
|---|---|---|---|
| starflock | MIT | canvas particle field (stars/motes) | not adopted: float positions + smooth alpha sprites; Kilumen needs whole-native-px particles on the zoom grid (blockCheck), seeded per map/day, and wrap-around-camera. ~40 lines of our own instead |
| dotfield | MIT | canvas dot/particle background | not adopted: full-screen clear + redraw per frame owns its canvas; we draw into the game canvas between entities and UI |
| godlights | MIT (React component) | god-ray / light-shaft overlay | not adopted: React + CSS blur/blend-mode overlay; banned here (no full-screen blur, no DOM overlay over HUD) |
| canvas-fx style effect packs | mixed / unclear per file | vignette, film grain, lens flare, fog | not adopted: rely on getImageData or filter/blur, and lens flare / fog are not approved by Gary |
Result: all four layers (area tint, vignette, particles, sun rays) are original code in mood.js. Sun rays reuse Kilumen's own cloud noise (living.js periodicFbm sky, same seed) to place shafts in cloud gaps.

## Kilumen company voice scan: Oct 23, 2026, ~12:25 PM CT (Grok Bot coder; status: scanned, none adopted)
Looked for small permissive vanilla-JS toast/notification queues to drive the company comms pop-up (`src/systems/company_voice.js`).
| Candidate | Licence (repo) | What it is | Decision |
|---|---|---|---|
| notyf | MIT | ~3 KB vanilla toast lib, success/error types, custom HTML | not adopted: wall-clock timers and a stacked list; we need one message at a time, a game-clock queue that pauses for battles/dialogue, burst priority and a save guard |
| toastify-js | MIT | stacked vanilla toasts | not adopted: same as notyf; npm last updated 2022 |
| toast-queue (andreruffert) | MIT | unstyled accessible toast queue, visibleLimit | not adopted: marked work-in-progress, 1 star; relies on ariaNotify/View Transitions; no pause/priority |
Result: ~60 lines of our own (VoiceStrip + queue in company_voice.js), driven by data/company_voice.json; nothing installed.
