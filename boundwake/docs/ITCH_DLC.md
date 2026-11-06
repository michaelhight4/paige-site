# Boundwake itch.io DLC plan

Gary lock (Nov 5, 2026): itch gamepasses = **DLCs**, not Stripe-on-itch. Play/Apple stay store IAP.

## Layout

One itch **game** page: Boundwake (HTML5). Each Boundwake pass is a **paid DLC** file (or a bundle DLC).

| Boundwake pass | Suggested itch DLC slug / SKU | Notes |
|----------------|-------------------------------|-------|
| archsage | `boundwake-archsage` | matches `itchSku` in premium.json |
| dragonhoard | `boundwake-dragonhoard` | |
| heralds_favor | `boundwake-heralds-favor` | |
| banner_champion | `boundwake-banner-champion` | |
| keep_keys | `boundwake-keep-keys` | |
| banner_lord | `boundwake-banner-lord` | |
| shadowcloak | `boundwake-shadowcloak` | |
| eternal_bloom | `boundwake-eternal-bloom` | |
| kinblessed | `boundwake-kinblessed` | |
| tollbreaker | `boundwake-tollbreaker` | |
| no_ads | `boundwake-no-ads` | |
| fateweaver | `boundwake-fateweaver` | |
| autopilot | `boundwake-autopilot` | |
| tester_pack | `boundwake-tester-pack` | unlocks all current passes |
| (bundle) | `boundwake-realm-bundle` | optional: all 13 one-time passes cheaper |

Price target: **$5.99** each (tester **$9.99**), mirror Lifeline.

DLC “files” can be tiny placeholder zips (`entitlement.json` with `{ "pass": "no_ads" }`) — ownership is what matters, not the payload.

## How HTML5 verifies ownership

itch HTML5 embeds do **not** automatically expose purchases to JS. Pick one path:

### Option A — itch.io API + OAuth (recommended for browser play on itch)
1. Create an itch.io API key / OAuth app for Paige Games.
2. On boot, if `?platform=itch` or host is `*.itch.io`, show **Sign in with itch**.
3. Call [itch.io API](https://itch.io/docs/api/overview) `GET /api/1/jwt/me` / game downloads / owned keys for this game id.
4. Map owned DLC upload ids → `itchSku` → `Premium.setOwned(passId)`.
5. Cache entitlements in `bw.premium.v1` (same as Play restore).

### Option B — Download keys (simpler alpha)
1. Each DLC purchase emails a download key.
2. Boundwake Settings → **Redeem itch key** posts key to a tiny Paige edge function that validates via itch API and returns pass ids.
3. Client calls `Premium.setOwned`.

### Option C — External claim page
1. Host `paigegames.net/boundwake/itch-claim` (needs website approval — separate from store builds).
2. User pastes itch username + key; server writes entitlement; game polls or uses signed token.

**Stub today:** `src/payments.js` → `itchDlc.checkEntitlement()` returns TODO. `?platform=itch` selects the itch channel copy.

## Exact next Gary steps (itch)

1. Create / open Boundwake game page on itch (HTML5 upload already zip-ready — see STORE_PUSH.md).
2. For each pass (or start with **no_ads**, **autopilot**, **tester_pack**):
   - Add **DLC** → price $5.99 → slug as in table → upload tiny placeholder file.
3. Note numeric **upload / DLC ids** from itch dashboard → paste into a follow-up so Coder can fill `itchUploadId` in catalog.
4. Decide Option A vs B for verification; provide itch API key to vault when ready (do not paste in chat).
5. After DLC live: Coder wires `itchDlc.restoreAll()` and Restore button.
6. **Do not** add Stripe Checkout to the itch build.

## Bundles (optional later)

- **Realm Bundle** = all one-time passes except tester_pack.
- **Ad-free + Autopilot** duo pack for launch promo.
