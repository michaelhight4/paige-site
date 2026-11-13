# Kilumen: itch.io listing (DRAFT, ready to paste)

Sources: `kilumen_android/store_listing/listing_text.md` (Play draft), `site_copy/game_kilumen.md` (site page), `kilumen_steam/STEAM_UPLOAD.md`, `quality/PROJECTS.md`.

## Basics
- **URL slug:** `kilumen` → `https://<itch-username>.itch.io/kilumen` (TODO: Gary's itch username, e.g. `paigegames`)
- **Title:** Kilumen: Start of a Journey
- **Short description / tagline (≤160):**
  `A 2D open-world creature battler: catch and train Kilu, beat 8 Masters in their halls, and work your way up at Revival Tech.` (124 chars)
- **Kind of project:** Downloadable (Windows; Linux zip also exists) — optionally add web build, see Upload plan.
- **Release status:** In development (alpha, v0.2.95-alpha per STEAM_UPLOAD.md)

## Pricing (confirmed by Gary)
- **$8.00 minimum** ("Paid" → $8.00, or "Pay what you want" with **minimum $8.00 / suggested $8.00** so fans can tip more). Matches Steam $8.
- Note: Play copy says the mobile version is free with ads + IAP; the itch desktop build is the paid $8 version. TODO Gary: confirm itch build has no ads/IAP (or which store mode the desktop build ships with).

## Full description (paste into itch editor)

---
**Kilumen is a 2D open-world creature battler with a "128-bit" pixel look.** Your new job comes with a starter Kilu, a company phone and very high expectations.

Sign on with Revival Tech (RT), get your first Kilu for free, and head out on the trail. The company has invested in you. Pay it back with results.

### Features
- **Catch and train Kilu.** Find Kilu in grass, caves, towns and along every shore. Build a team of up to six, level them up, and log every kind you find in your Kilindex. Extras go to the Field Archive, and your lead is your Trail Buddy, who walks with you.
- **Beat 8 Masters.** Each Master runs a hall with its own puzzle: plates and crystals in Fernwick, salt-pan sluices in Saltmere, a prism relay in Revival Heights, gust lanes in Frostspire, a bog-light boardwalk in Mirefen, a tide clock on Tidewater Coast, a lens signal in Lanternport and quench channels in Cindervale. Win all 8, then face the Guardian Ondravel.
- **Turn-based team battles** with elements like earth, water, light, wind, swamp, sea, spirit and fire.
- **A living world.** Day and night clock, weather, drifting cloud shadows and town lights at night. Dig through caves, ride the water with Tideglide and cast a line from any shore.
- **The Aurelith Games.** Town tournaments of 3 events in a row. Pick the right Kilu for each event and win to open new doors.
- **Grow your career.** Earn gold and merit, level your Employee ID, unlock perks on the RT Employee Benefits board, and keep an ear out for RITA, the company voice who always has notes.
- **Restore abandoned camps** left by the missing field team, to rest, decorate and fast-travel.

### How to play
Start in Brookhollow and head out along Trail 1. Walk into tall grass to meet wild Kilu, weaken them in battle, then use a dominance crystal to bring one onto your team. Beat each town's Master to earn its coin and open the next part of the world.

**Platforms:** Windows (download). TODO: Linux build exists (`Kilumen-linux-x64.zip`) — list it if Gary wants. Controls: TODO (keyboard/mouse/gamepad — not documented in sources).

**Alpha note:** Kilumen is in active development. Some names, art and sounds are stand-ins while they're finished. Every playtest note helps!

### Links
- Paige Games: https://paigegames.net
- Free browser alpha: https://paigegames.net/kilumen/
- Steam: TODO (store URL once the app ID is live — STEAM_UPLOAD.md still uses placeholder ID 480)
- Google Play: TODO (store URL once published; Play bundle `kilumen_android/kilumen-0.3.0-vc1.aab` exists)
---

## Classification
- **Genre:** Role Playing (secondary: Adventure)
- **Tags (itch allows up to 10):** creature-collector, monster-taming, pixel-art, 2D, turn-based, rpg, open-world, singleplayer, exploration, fishing
- **AI disclosure:** TODO Gary (itch asks whether generative AI was used in assets).

## Cover image (315:250, recommended 630×500)
**Done:** `kilumen/itch/cover_630x500.png` (630×500 PNG). Cropped from `kilumen_steam/store_art/library_hero_3840x1240.png` (title-free art, so the logo is not cut off) with the existing `kilumen_steam/store_art/logo.png` laid over the top right. No new logo was made.

**Screenshot note, `kilumen_pc_08_free.png`:** the image has the words **"Free to play"** in the top left. It has no ad wording. **SKIP**, because the itch price is $8.

## Screenshots (itch shows 3–5 best; upload in this order)
PC (`/workspace/kilumen_android/store_listing/marketing/pc/`) — preferred for a desktop listing:
- [ ] kilumen_pc_01_battle.png
- [ ] kilumen_pc_02_catch.png
- [ ] kilumen_pc_03_masters.png
- [ ] kilumen_pc_04_guardian.png
- [ ] kilumen_pc_05_olympics.png
- [ ] kilumen_pc_06_world.png
- [ ] kilumen_pc_07_career.png
- [ ] kilumen_pc_08_free.png — **SKIP (checked):** the image says "Free to play" in big text, which contradicts the $8 price. It has no ad text.
Phone (`.../marketing/phone/`, same 8 names `kilumen_phone_0X_*.png`) — only if adding a web/mobile note. Also check the PC captions don't mention ads/IAP.

## Upload plan
1. **Windows:** `/workspace/kilumen_steam/Kilumen-win-x64.zip` (v0.2.95-alpha build). Mark platform = Windows. Exclude `steam_appid.txt` (build docs say it's not shipped). TODO: rebuild/confirm it's the current version and runs without Steam (docs say it falls back fine when Steam is absent).
2. **Linux (optional):** `/workspace/kilumen_steam/Kilumen-linux-x64.zip`.
3. **Web:** Don't upload HTML5 to the paid page. Link to the free browser alpha at https://paigegames.net/kilumen/ — `site_copy/game_kilumen.md` describes it as "Alpha, free to play in your browser at paigegames.net/kilumen/". I only checked files, not the live site; TODO confirm the URL loads before publishing.
4. Optional: use itch's **butler** for later updates (`butler push Kilumen-win-x64 <user>/kilumen:windows`).

## Facts to reconcile (TODO Gary)
- Creature count: Play copy says **273 Kilu**; site copy says the design target is 450 and not all are in the alpha. I left the number out on purpose.
- Name: Play copy uses "Kilu"; site copy uses "Kilumen" for the creatures. I used "Kilu".
