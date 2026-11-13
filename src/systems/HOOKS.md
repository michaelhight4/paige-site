# systems-gd hooks (Oct 22, 2026)

`src/systems/*` and `src/ui/systems_screens.*` are self-contained. They reach the game only through the hook lines
below. Every hook line carries `// [systems-gd hook]`. The full diff is in `hooks.patch`, made against the
working-tree versions of these files in `/workspace/kilumen` as of 10:49 PM CT on Oct 22, 2026 (Coder's uncommitted
overlay on 3b537d6, NOT HEAD). It applies cleanly with `patch -p1 --dry-run` to overworld.js, save.js and main.js.
package.json has moved on since (Coder added `tests/map_bridge.test.mjs`), so add `tests/systems_gd.test.mjs` to the
`test` script by hand.

The hooked files are **not** committed on dev/systems-gd, because they carry Coder's uncommitted work. Coder applies
the patch.

## src/overworld/overworld.js (7 hooks)
| where | line |
|---|---|
| constructor | `this.systems = null;` |
| `_enterMap`, after `life.enter` | `this.systems?.onMapEnter(m);` (makes satchels solid, applies puzzle state) |
| `setLead` (2 lines) | keeps the whole existing creature (`uid`/level/hp/xp) instead of rebuilding `{species, nickname, warmth, rt}` |
| `interact`, after fx/fy, before spot/door checks | `if (this.systems?.onInteract(fx, fy)) return;` (pickups, crystal switches, starter cradles) |
| `talk`, non-battle path after `const line = this.pick(e, key);` | `if (this.systems && await this.systems.onTalk({ mapName, def, entry: e, line, speaker: sp })) return;` (heal counter, shop clerk) |
| `saveData` | `...this.systems?.saveBlocks(),` (coins, bag, archive, systems) |
| `view` actors | `if (this.systems) actors.push(...this.systems.worldActors(grade));` (supply satchels, time-of-day graded) |

## src/overworld/save.js (5 hooks)
- `V2_BLOCKS` adds `'systems'`. `v2Defaults` adds `systems: {}`.
- `normParty` keeps `hp, energy, status, skills, lineage, origin` (`keepSystemsFields`). Without this, a save/load
  round trip would heal everyone and wipe skills.
- The normalise loop includes `'systems'`.

## src/main.js (3 hooks)
- `import { attachSystems } from './systems/index.js';`
- `attachSystems(scene, { saveData: saveData || {}, config: q });` before `window.kilumen`. The URL can set
  `?sys.<flag>=` to override config flags.
- After `mountUI`: `import('./ui/systems_screens.js').then((m) => m.installSystemsScreens(window.kilumen.ui, scene.systems))`.

## package.json
- The `test` script adds `tests/systems_gd.test.mjs`.

## Battle side (Coder, not hooked here)
- Before a battle: `scene.systems.bagForBattle()` gives the engine bag `{itemId: count}`.
- After a battle: `scene.systems.applyBattleResult(KilumenBattle.result())` writes back hp/energy/status and the bag.
  It returns `'blackout'` when the whole party is out cold.
- On a loss: `await onPartyFainted()` (exported from `src/systems/index.js` and `heal.js`) charges the copay, warps
  to the last heal point and rests the team.
- On a win: `scene.systems.awardBattleMoney(trainer)` or `awardPrize({ trainerId, baseAmount, level })`. Both return
  the amount and add it to the coins.

## Battle side: wired by the merge (Oct 22, 2026, ~11:17 PM CT, on dev/overworld-v1)
- `src/battle/ui_sd.js` (`// [systems-gd hook]` lines): it builds the engine bag from `bagForBattle()` and the team from
  `toSet()` + uid. In `finish()` it calls `applyBattleResult(res)`. If there is no `onDone` and the result is
  `'blackout'`, it awaits `onPartyFainted()`. Trainer foes go on `res.foes`.
- Under `?uidemo=1`, ui_sd ignores systems. The demo team and demo bag stay in use, and no write-back happens.
- `finish()` calls `onDone(res)` BEFORE `ui.closeAll()`. ui.js resolves `onBattle` inside `_onClose`, which runs
  from closeAll, so the old close-then-onDone order made every `?battle=sd` trainer battle count as lost.
- `overworld.js talk()` trainer block: `battle_won` is said before `onTrainerLoss`. A loss returns
  `{fee, paid, short, to}` and warps, and it does not mark the trainer as seen, so the trainer can be challenged again.
  A win marks the trainer and pays out through `onTrainerWin` (`awardBattleMoney`).
- Items data is now `src/systems/items.js`. It was `bag_items.js`, and rules.js reads `BATTLE_ITEMS` from it.
  Config `pepRemedyRestoresEnergyInBattle: true` (Gary). Override it with `?sys.pepRemedyRestoresEnergyInBattle=0`.
- `src/ui/systems_screens.js` Team reads `scene.systems.party.list`, falling back to `scene.party`. When both are
  empty under `?uidemo`, it reads the demo list and reorders through `ui._reorderTeam`, so a drag re-renders in both modes.
- e2e: `PORT=<port> node tests/systems_battle_e2e.mjs` covers wild item decrement, Pep, trainer loss and re-challenge,
  trainer win payout, and wipe to blackout.
