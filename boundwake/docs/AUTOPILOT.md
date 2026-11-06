# Boundwake Autopilot / Skip

**Calendar:** uses **cage** age. **1 turn = 1 year** for every race (Gary Nov 5).

## Entitlement

Requires premium pass **`autopilot`** (Autopilot Pack), or Realm Pass subscription.

**Web alpha exception:** `data_fantasy/premium.json` → `alpha.webFreePasses` includes `autopilot` so Skip stays free on paigegames.net until store IAP / itch DLC ship. Clear that array to gate web too. Store builds (android/ios/itch) always check ownership.

## Skip N years
From Life (or the Age dock): choose **1 / 5 / 10 / 25** or a custom count (max 100). Boundwake advances one cage year at a time under the hood.

## Each year
1. Auto-resolve **safe** pending event choices (first unlocked non-dangerous option).
2. **Pause** (show UI, stop skip) on:
   - death
   - jail / imprisonment
   - romance / family / heir beats
   - ownership founding (team/guild `own_*` and related)
   - tournament / tagged `important`
   - user **Stop**
3. Spend leftover **Actions** with short rules:
   - **Rest** while Strain ≥ 70
   - **Work hard** if employed
   - **Train** lowest unlocked skill
   - otherwise **Rest**

## Stop
- Important event (manual choice)
- Death
- Jail
- User Stop
- N years reached
- Missing Autopilot entitlement (locked)
