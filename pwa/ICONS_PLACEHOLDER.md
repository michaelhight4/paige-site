# PLACEHOLDER app icons (not approved art)

Kilumen has no dedicated app icon yet (checked Oct 22, 2026: `art/` has key art, environment paintings and creature
battle icons, but nothing designed to read at 48 px). These three files are **placeholders**: a square crop of
`art/world/key_art_notext.png` (box 0,230 → 1040,1270, the researcher with the violet crystal), resized with LANCZOS
and quantised to 256 colours (one-off Python/PIL step, Oct 22, 2026 ~11:26 PM CT).

- `PLACEHOLDER_keyart_crop_192.png`, `PLACEHOLDER_keyart_crop_512.png` (purpose "any")
- `PLACEHOLDER_keyart_crop_maskable_512.png` (crop inset to 80% on #0b0d1a so Android's mask can't cut the figure)

At 48 px the figure is a small silhouette, so a real icon (one bold shape: the violet crystal or the K mark) should
replace these before any public install prompt. Swap the files in place and keep the names, or edit
`pwa/kilumen.webmanifest`, then re-run `node tools/pwa_build.mjs` so the precache revision changes.
