# Text Bot requests: RT Employee Benefits (system_rt_benefits.*)

Requested Oct 23 2026, 1:09 PM CT, by the coder (region 1 release v0.2.0-alpha).
Gary, Oct 23 2026 1:01-1:02 PM CT: "the job board is the skill tree ui for leveling up company xp", "yes its the company benifits bord",
"RT Employee Benifits", "build into region one on the phone". On-screen spelling: **RT Employee Benefits**.

Please add these to text/overworld_lines.json under `system_rt_benefits` (the coder does not edit text/*). The game already
shows the placeholder below for every key, via `ui.T('system_rt_benefits.<key>')` (src/ui/rt_benefits_screen.js, RTB_TEXT).
A key may be a plain string or `{ "text": "..." }`; `{name}` placeholders must stay.

Voice: RITA, Revival Tech's company voice. Sarcastic and dry. The player is an asset and benefits exist to raise asset value.
Keep it short: phone at 844x390 is tight (node names about 16 characters, chips about 12).
Blocked words: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route/routes, "throw" for a capture. No real money and no Blue Bucks.

Also optional: `system_phone.menu.labels.rt_benefits` (phone tile label; falls back to labels.tab_title). It must stay "RT Employee Benefits".

| key (system_rt_benefits.) | placeholder now | where / notes |
|---|---|---|
| `labels.tab_title` | RT Employee Benefits | Phone tile + screen title. Must read exactly "RT Employee Benefits" (Gary 1:02 PM CT). |
| `labels.employee_id` | Employee ID | Header label over the bare 6-digit employee number. |
| `labels.id_level` | ID {level} | Header chip. {level} = ID level (1-4 in region 1). Keep short (chip). |
| `labels.points` | {points} pts | Header chip. {points} = unspent benefit points. Keep short (chip). |
| `labels.points_one` | {points} pt | Header chip when exactly 1 point is unspent. |
| `labels.xp` | XP | XP bar label. |
| `labels.xp_to_next` | {into}/{span} | {into}/{span} XP into this ID level. Numbers only, probably keep as is. |
| `labels.xp_capped` | Region cap | Shown instead of the numbers at the region 1 cap (ID 4). |
| `labels.buy` | Buy rank {rank} | Buy button + confirm choice. {rank} = I / II / III. |
| `labels.cancel` | Not now | Confirm: the no choice. |
| `labels.rank` | Rank {rank}/{max} | Detail line + pips aria label. {rank}/{max}. |
| `labels.cost` | Cost: {cost} pt · Needs ID {level} | Detail line under the next rank. {cost} points, {level} ID level. |
| `labels.state_available` | Available | Node chip (can buy now). |
| `labels.state_owned` | Owned | Node chip (bought / maxed for this region). |
| `labels.state_locked` | Locked | Node chip (spare, generic locked). |
| `labels.lock_region` | Region {region} | Node chip, region-locked. {region}. |
| `labels.lock_id` | Needs ID {level} | Node chip, ID too low. {level}. |
| `labels.lock_points` | Need {cost} pt | Node chip, not enough points. {cost}. |
| `labels.hint_perk` | Perk | Bottom hint for the arrows. |
| `labels.hint_buy` | Details / Buy | Bottom hint for A / tap. |
| `labels.back` | Back | Bottom hint for B. |
| `branches.field_logistics` | Field Logistics | Branch header over its column (short, 2 lines max on phone). |
| `branches.supply_pay` | Supply & Pay | Branch header over its column (short, 2 lines max on phone). |
| `branches.crystal_lab` | Crystal Lab | Branch header over its column (short, 2 lines max on phone). |
| `branches.unit_performance` | Unit Performance | Branch header over its column (short, 2 lines max on phone). |
| `nodes.copay_coverage.name` | Copay Coverage | Node card title (short: about 16 characters, phone column is narrow). |
| `nodes.copay_coverage.desc` | We cover part of your blackout copay. Our generosity has a region lock. | Detail panel blurb. One or two short sentences. |
| `nodes.copay_coverage.ranks.1` | Blackout copay -25%. | Detail panel, effect of this rank. Keep the number. |
| `nodes.copay_coverage.ranks.2` | Blackout copay -50%. | Detail panel, effect of this rank. Keep the number. |
| `nodes.store_discount.name` | Store Discount | Node card title (short: about 16 characters, phone column is narrow). |
| `nodes.store_discount.desc` | Pay less at RT shops. Cheaper gear keeps company assets topped up. | Detail panel blurb. One or two short sentences. |
| `nodes.store_discount.ranks.1` | 3% off at RT shops (stacks with staff pricing). | Detail panel, effect of this rank. Keep the number. |
| `nodes.store_discount.ranks.2` | 6% off at RT shops. | Detail panel, effect of this rank. Keep the number. |
| `nodes.store_discount.ranks.3` | 10% off at RT shops. | Detail panel, effect of this rank. Keep the number. |
| `nodes.rt_payout.name` | Field Bonus | Node card title (short: about 16 characters, phone column is narrow). |
| `nodes.rt_payout.desc` | A cut of trainer prize money, on top. Winning keeps our assets looking pricey. | Detail panel blurb. One or two short sentences. |
| `nodes.rt_payout.ranks.1` | +10% trainer prize money. | Detail panel, effect of this rank. Keep the number. |
| `nodes.rt_payout.ranks.2` | +20% trainer prize money. | Detail panel, effect of this rank. Keep the number. |
| `nodes.rt_payout.ranks.3` | +30% trainer prize money. | Detail panel, effect of this rank. Keep the number. |
| `nodes.crystal_grade.name` | Crystal Grades | Node card title (short: about 16 characters, phone column is narrow). |
| `nodes.crystal_grade.desc` | Lab-grade crystals in RT shops. Not for your current pay grade or region. | Detail panel blurb. One or two short sentences. |
| `nodes.crystal_grade.ranks.1` | Field Crystals in RT shops. | Detail panel, effect of this rank. Keep the number. |
| `nodes.crystal_grade.ranks.2` | Prime Crystals in RT shops. | Detail panel, effect of this rank. Keep the number. |
| `nodes.crystal_grade.ranks.3` | Apex Crystals in RT shops. | Detail panel, effect of this rank. Keep the number. |
| `nodes.unit_training.name` | Unit Training | Node card title (short: about 16 characters, phone column is narrow). |
| `nodes.unit_training.desc` | Your team learns faster. Assets that learn are worth more. To us. | Detail panel blurb. One or two short sentences. |
| `nodes.unit_training.ranks.1` | Team training boost I. | Detail panel, effect of this rank. Keep the number. |
| `nodes.unit_training.ranks.2` | Team training boost II. | Detail panel, effect of this rank. Keep the number. |
| `locked.region` | Locked until Region {region}. Legal says no. | Detail panel reason. {region}. |
| `locked.id` | Needs ID level {level}. Keep logging assets. | Detail panel reason. {level}. |
| `locked.points` | Needs {cost} benefit point. You have {points}. | Detail panel reason. {cost}, {points}. |
| `locked.maxed` | Fully vested. Do not ask for more. | Detail panel: every rank bought. |
| `locked.owned_region` | Maxed for this region. More ranks in Region {region}. | Detail panel: region 1 ranks bought, more later. {region}. |
| `confirm` | Spend {cost} benefit point on {node} rank {rank}? No refunds. Company policy. | Confirm box before a buy. {cost}, {node}, {rank}. One line. |
| `toast.bought` | {node} rank {rank} filed. Asset value up. Slightly. | Toast after a buy. {node}, {rank}. |
| `toast.level_up` | ID level {level}. +1 benefit point. Try not to waste it. | Toast when the ID level rises while the tab is open. {level}. |
| `toast.not_yet` | {reason} | Toast when A is pressed on a locked node. {reason} = the matching locked.* line; can wrap it. |

Notes: copay_coverage, crystal_grade and unit_training are locked as **Region 2** in region 1 (their text shows in the detail panel only).
Respec is not offered yet (no terminal, fee or week clock), so there are no respec lines.
