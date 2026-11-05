## Playtest polish DEPLOYED — Coder Nov 5 ~5:05 PM CT

All three playtest logs collected (Story Bot, Soccer Rpg pass1+v2, Text Bot). Local polish + Soccer v2 fixes mirrored to paige-site Boundwake.

### Soccer Rpg v2 fixes (this pass)
| Bug | Fix |
|-----|-----|
| Court term spam (`My term as null ended` yearly) | `courtYear`: skip when `seat` already null; log once with real name |
| Stall Hand age 12 vs 10+ | merchant `unlock_text` → **age 10 (stall hand)** matching `req.age` |
| Life journal Adventure chip no-op | `data-tab` handler `render(); return`; Open Adventure primary button |
| Make a friend disabled no reason | Always show Friend/Market lock-why (Social / age / prison) |
| Realms ??? through 36 | **Scout realm** (1 act, age 14+) unlocks map without travel-writ event |
| Restless Feet +exploration | Event draw weight ×1.8 for exploration/travel; info copy honest |
| Favicon 404 | Relative `assets/brand/favicon-*.png` + root `favicon.ico` |

### Prior polish included (Story/Text/Soccer pass1)
heir_name + echo journal; stage/occ by cage; jail locks; ailments by hage; long-life age stretch; realm tag gates; ownership `own_*` 27 beats; guild claim copy; talents UI; disabled event choices; team founding skill 15; toast/modal click stability; Work unlock humanize.

### Deferred
- Elder/childhood/cook-weaver content density (Story/Text Bot)
- Death-cause variety design pack
- Adult RNG draw-floor tuning
- Path panel @11 (exists @cage≥8; no clear hide bug)

### Pack / smoke / live
- Expansion **169** (27 `own_*`); pool **294** (89+169+36)
- `node tests/smoke.mjs` → **SMOKE PASS**
- Deploy commit: **4e15468c** on paige-site main
- Live: https://paigegames.net/boundwake/
- Lifeline untouched
