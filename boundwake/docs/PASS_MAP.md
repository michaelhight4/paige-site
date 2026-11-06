# Boundwake ↔ Lifeline pass map

Prepared Nov 5, 2026 (America/Chicago). Lifeline catalog is **read-only** reference (`PLAY_PRODUCT_TEXT.md`, `play/data/premium.json`). Boundwake owns its own product IDs under `com.pagegames.boundwake`.

| Lifeline id | Boundwake id | Boundwake name | Fit / effect |
|-------------|--------------|----------------|--------------|
| einstein | archsage | Archsage Quill | Instant skill → 40 (once/life) |
| midas | dragonhoard | Dragonhoard | +1000 gold every new life |
| nepo | heralds_favor | Herald's Favor | Instant renown + floor |
| baller | banner_champion | Banner Champion | Tournament team draft (affinity primed) — effect stub shares Banner Lord founding path |
| free_realestate | keep_keys | Keep Keys | Free Emberlight Hall @18 |
| sports_owner | banner_lord | Banner Lord | Found tournament team without fee |
| golden_gun | shadowcloak | Shadowcloak | Crimes never arrest |
| fountain | eternal_bloom | Eternal Bloom | Never catch ailments |
| rabbit | kinblessed | Kinblessed | Unlimited heirs (flag; soft caps removed when wired) |
| tax_evasion | tollbreaker | Tollbreaker | **Adapted** — Boundwake has no income tax; waives living costs, rent, purse guild fees |
| no_ads | no_ads | No Ads Forever | Suppress forced ads; instant rewarded grants |
| creator | fateweaver | Fateweaver | Edit stats/age (API stub; UI later) |
| autopilot | autopilot | Autopilot Pack | Skip N years (existing Autopilot) |
| tester_pack | tester_pack | Tester Pack | Unlocks all current Boundwake passes |
| all_access (sub) | all_access | Realm Pass | Monthly/yearly; includes all passes except tester_pack |

## Skipped (Lifeline-only)

| Lifeline | Why skipped |
|----------|-------------|
| founder_pack | Play pre-registration reward for Lifeline. No Boundwake pre-reg yet — add later if needed. |

## Channels

| Channel | How sold |
|---------|----------|
| Google Play | One-time IAP + `all_access` sub (like Lifeline) |
| Apple | Non-consumable IAP + auto-renewable sub |
| itch.io | **DLC per pass** (or bundles) — **not** Stripe-on-itch |
| Web (paigegames.net) | Store approval separate; alpha shows catalog + coming-soon (dev grant on localhost / `?devpass=1` only) |

## Alpha free

`premium.json` → `alpha.webFreePasses: ["autopilot"]` keeps Skip free on web until Gary clears store IAP/itch. Clear the array to gate web too.
