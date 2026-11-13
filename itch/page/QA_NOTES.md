# Kilumen itch page set — DRAFT (Gary review required)

Nothing uploaded or published. No Krea. Game source and Lifeline untouched; all work on copies. Rebuild script: build_page.py.

## Sources used (our own art)
- Logo: /workspace/kilumen_steam/store_art/logo.png (845×211)
- Scene: /workspace/kilumen/art/world/key_art_notext.png (2560×1440, painted; LANCZOS)
- Pixel creatures (NEAREST, 1×, no smoothing): slagrook, emberlunx (flipped), halovy — art/characters/pixel/creatures/<id>/battle/<id>_front_128.png
- Screenshots: unretouched real captures in /workspace/kilumen_android/store_listing/ (1920×1080, downscaled to exactly 1280×720 LANCZOS):
  1 phone_03_battle (battle menu) · 2 phone_04_capture (Dominance Crystal throw) · 3 tablet7_04_kilindex (dex) · 4 phone_01_town (Brookhollow overworld) · 5 phone_06_olympics (Fernwick Olympics champion)
  NOTE: these were captured on the mobile/touch layout ("Tap to skip"). Desktop listing ideally wants PC-layout captures.

## Fact check
- 8 Masters: data/masters.json has 8 halls. ✔
- Ondravel: present in src/ui/species_synced.gen.js. Guardian ending text not playtested.
- **273 Kilu: MISMATCH RISK.** design/DEX_450.json lists dex_no up to 273 (launch target), but data/creatures_synced.json currently has 237 synced species (+1 pending). Claim kept per brief; Gary/Coder must confirm 273 are actually in the shipped build before publishing.
- No ads on itch: per brief. LISTING.md has an open TODO that the desktop build's store mode (ads/IAP off) is unconfirmed; Play/mobile version is free with ads+IAP. Verify before publishing.
- Platforms: Windows zip /workspace/kilumen_steam/Kilumen-win-x64.zip and Linux zip exist (v0.2.95-alpha per STEAM_UPLOAD.md). Web build exists at /workspace/kilumen (free browser alpha at paigegames.net/kilumen per site copy) — not claimed on the paid page. No mobile/DLC/region promises.
- Skipped: marketing/pc/*.png (captioned composites, not raw captures; pc_08 says "Free to play").

## Visual QA (viewed with Read)
- banner 960×250: logo legible, creatures crisp, no overlap with logo after fix.
- background 1920×1080: blurred, ~25% brightness, navy-tinted; text-safe under an opaque column.
- screenshots: no ads, no drinking/drugs/tobacco (shop lists "Calm Tea" — a tea, fine).
- preview 1600×1150 contact sheet.
- Linux: add 'and Linux' to description.md only if the Linux zip is uploaded.

## Update 9:32 PM CT
Coder: shipped data has 308 catchable Kilu, so the description now says "300+ Kilu". itch build is a Windows + Linux download (not browser); description updated. Gary confirmed no ads. Coder's Play tablet captures also show "Tap to skip" on Olympics; fresh PC-layout capture in progress to replace screenshot_5 (and others if better).

## Full-page background revision — DRAFT, Gary review required

Primary lock: user-requested full-page side-decoration geometry, learned from Feed the Scorchpot; use only layout principle, not its assets. Game-owned art defines subjects, rendering and palette. Reject: dim blurred wallpaper, unrelated banner box, invented screenshots. Refero style search unavailable (inactive subscription); existing art and user reference are the explicit build target.

- `background_full.png`: 2560×1600, new GenerateImage artwork based on this game's existing art, Lanczos fitted to final size. Source retained in `_src/fullscene_generated.jpg`.
- Vivid illustrated side strips: x=0–799 and x=1760–2559. Center below the banner is toned toward #10142a; the opaque content column is #1b2140.
- `banner.png`: EXACT source crop **(800,20)–(1760,270)** (right/bottom exclusive), 960×250, with existing title/logotype reapplied. No separate box or banner-wide overlay.
- Recommended itch settings: background `background_full.png`, **top center / 50% 0**, **no repeat**, native **2560×1600** size (not cover/contain), scroll attachment, background color **#10142a**. Opaque **#1b2140** content column, width **960px**. Banner at **20px** below background origin; no horizontal padding around it. If itch inserts header spacing, adjust the page wrapper top inset to 20px or recrop at the exact resulting background y; do not stretch the background.
- The artwork behind the banner is literally the source crop; only logo pixels differ. Preview is a layout simulation, NOT gameplay evidence or an uploaded live page. At other viewport widths the native background stays top-centered and the 960px column stays centered; narrow/mobile view naturally hides side art.
- Preserved original files: `banner_old.png`, `background_old.png`; original `background.png` also remains unchanged. Screenshot files untouched.
- Updated: `background_full.png`, `banner.png`, `theme.json`, `preview.png`, `QA_NOTES.md`; supporting source / layout files in `_src/`.
- No Krea. No drinking, drugs, tobacco, copied characters, watermarks or new decorative text.
- QA: inspected generated art, finished full background, banner, left/right side strips and mock-layout preview using Read.
- Final integrity check: all 25 screenshot files across the three sets have unchanged SHA-256 hashes. Original background.png equals background_old.png byte-for-byte.

## Update 9:50 PM CT — PC-layout screenshots
Fresh real PC captures (1920x1200 fullscreen, mouse/keyboard, center-cropped to 16:9 and scaled to 1280x720; no UI edits). Originals: /workspace/kilumen-screenshots/.
1 wild battle menu (new) · 2 Dominance Crystal throw (new) · 3 Kilindex (kept, fuller dex than the new capture) · 4 Brookhollow (new) · 5 grass trail with buddy (new; replaces Olympics "Tap to skip"). Old set in _src/old_shots/. Night trail extra in _src/. screenshots_sheet.png shows the five. Description: 308 Kilu, Windows + Linux download.
