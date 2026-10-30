# Text Bot requests: merit shop + garden (Coder, Oct 30 2026)

Branch `dev/merit-shop`. Every string below is a PLACEHOLDER. Please write the final text and keep the ids unchanged.
Tokens in `{braces}` are filled in by code and must stay in the line. House rules apply: the venue building is a "hall", and none of the blocked words may appear.

## Where these show up
- Merit counter: talk to the Aurelith Games announcer and pick the second choice. Tabs: today's shelf (3 seeds that change every in-game day) and always in (both cans plus 2 seeds).
- Merit points: 4th place or better in the Brookhollow tournament, a town cup or the Aurelith Games.
- Soil plots: 3 beside the player's house (Brookhollow), 2 in Fernwick, 2 in Saltmere. Face a plot and press A.

## UI / dialogue strings (src/garden/strings.js)

| id | placeholder |
|---|---|
| `merit.shop.title` | Merit Counter |
| `merit.shop.clerk` | Merit Clerk |
| `merit.shop.tab_today` | Today's shelf |
| `merit.shop.tab_always` | Always in |
| `merit.shop.points` | {points} merit |
| `merit.shop.unit` | ★ |
| `merit.shop.owned` | Owned |
| `merit.shop.in_pack` | In your pack: {n} |
| `merit.shop.rotates` | This shelf changes every day. |
| `merit.shop.confirm` | {item} x{count} is {total} merit. Trade? |
| `merit.shop.confirm_yes` | Trade |
| `merit.shop.confirm_no` | Not yet |
| `merit.shop.bought` | Here you go. Earned fair and square. |
| `merit.shop.short` | You need {short} more merit for that. |
| `merit.shop.bag_full` | Your pack can't hold any more of those. |
| `merit.shop.already` | You already have one of those. |
| `merit.shop.bye` | Come back after your next event. |
| `merit.shop.hint_tabs` | Today / Always |
| `merit.shop.hint_pick` | Pick |
| `merit.shop.hint_back` | Done |
| `merit.shop.desc.watering_can` | Waters one plot a day. Watered crops grow a stage overnight. |
| `merit.shop.desc.watering_can_merit` | A prize can. A crop watered with it is ready the next day. |
| `merit.shop.desc.seeds` | Plant in a soil plot. Ready in {days} watered days. |
| `merit.earned` | +{pts} merit points! ({points} total) |
| `merit.announcer.ask` | Here for the Games, or the merit counter? |
| `merit.announcer.games` | The Games |
| `merit.announcer.shop` | Merit counter |
| `merit.announcer.leave` | Just looking |
| `garden.empty` | It's a soil plot. Something could grow here. |
| `garden.plant_ask` | Plant something? |
| `garden.plant_none` | You have no seeds to plant. |
| `garden.cancel` | Leave it |
| `garden.planted` | You planted the {crop} seeds. |
| `garden.stage.seed` | The {crop} seeds are in the soil. |
| `garden.stage.sprout` | A little {crop} sprout is up. |
| `garden.stage.growing` | The {crop} is coming along. |
| `garden.water_ask` | Water it? |
| `garden.water_yes` | Water |
| `garden.watered` | You watered the {crop}. |
| `garden.watered_merit` | You watered the {crop} with the merit can. It will be ready tomorrow. |
| `garden.watered_done` | The soil is already damp today. |
| `garden.no_can` | The soil is dry. A watering can would help. |
| `garden.ready` | The {crop} is ready! |
| `garden.harvest_yes` | Harvest |
| `garden.harvested` | You harvested {n} {crop}! |
| `garden.bag_full` | Your pack can't hold the {crop}. |

## Item names (src/systems/items.js, field `name`); a one-line description for each would help too

| item id | placeholder name |
|---|---|
| `watering_can` | Watering Can |
| `watering_can_merit` | Merit Watering Can |
| `carrot_seeds` | Carrot Seeds |
| `turnip_seeds` | Turnip Seeds |
| `radish_seeds` | Radish Seeds |
| `tomato_seeds` | Tomato Seeds |
| `pumpkin_seeds` | Pumpkin Seeds |
| `sunroot_seeds` | Sunroot Seeds |
| `glowbean_seeds` | Glowbean Seeds |
| `drumleek_seeds` | Drumleek Seeds |
| `carrot` | Carrot |
| `turnip` | Turnip |
| `radish` | Radish |
| `tomato` | Tomato |
| `pumpkin` | Pumpkin |
| `sunroot` | Sunroot |
| `glowbean` | Glowbean |
| `drumleek` | Drumleek |

Invented crops (sunroot, glowbean, drumleek): rename them freely, but keep each item id.
