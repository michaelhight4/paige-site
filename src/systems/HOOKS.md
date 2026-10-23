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
