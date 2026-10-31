# Text Bot requests: RT Store (dev/kilumen-store, Oct 31 2026)

Coder placeholders live in `src/store/shop_screen.js` (`STORE_TEXT`, shown with a `[PH]` prefix in game) and in
`src/store/index.js` (toasts). Please write final lines into `system_store.*` (same key paths). Tone: RITA corporate,
short, honest about price and renewal (store copy must be clear: no dark patterns, no fake urgency).

| key | placeholder | notes |
|---|---|---|
| labels.tab_title | RT Store | phone tile + header |
| labels.buy | Buy {price} | |
| labels.subscribe | Subscribe {price} | |
| labels.owned / active / via_sub / coming_soon | Owned / Active / Included in All Passes / Coming soon | |
| labels.restore | Restore purchases | required by Play / web |
| labels.manage | Manage subscription | opens Play subscriptions |
| labels.per_month | {perMonth}/month, billed {price} | must show the real yearly charge ($12/year) |
| labels.sign_in | Sign in from Account to buy on the web. | |
| products.no_ads.name/desc | No Ads / Removes the break-room ads. Forever, on this account. | $5 |
| products.daily_gold.name/desc | Daily Gold / 200 gold every in-game day, on every save. | $2 |
| products.board_unlock.name/desc | Full Benefits Board / Every RT Employee Benefits perk at max rank. Key cards still need earning. | $2 |
| products.kilu_pack.name/desc | Kilu Pack / Four store-only level 15 Kilu: Dragonoid, Mystical, Sky and Magma. Once per save. | $4; names TBD with art |
| products.all_passes_yearly.name/desc | All Passes / Everything above while subscribed, plus +25% XP and money. | $12/year ($1/month) |
| confirm | Buy {name} for {price}? | |
| confirm_sub | Subscribe to {name} for {price} ({perMonth}/month)? Renews yearly until you cancel. | keep the renewal sentence |
| toast.bought / pending / failed / restored / restore_failed / coming_soon / owned | see STORE_TEXT | |
| daily gold toast | Daily gold: +{n} | src/store/index.js |
| kilu pack toast | Kilu Pack: {n} Kilu joined you | src/store/index.js |
| ad preview label | TEST AD / Placeholder · test build only | test builds only, never shipped copy |
| Kilu names + Kilindex entries x4 | (none yet) | after Gary approves the concept sheet |
