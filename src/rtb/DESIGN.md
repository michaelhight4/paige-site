# Real-time wild battles (rtb): DEV ONLY prototype, Oct 29 2026

The reference is a TikTok clip of a modded GBA game with real-time fights. We copy **structure only**: no names, assets or code
from Nintendo or Game Freak ROMs, and none from the fan mods either (none has a usable licence).

## Gate
- `src/rtb/flag.js`. Works on dev hosts only (localhost, 127.x, ::1, *.local, 0.0.0.0); a live host always gets the turn battle.
- `?rtb=1` turns it on and remembers it (localStorage `kilumen_dev_rtb`). `?rtb=0` is the kill switch: it clears the setting and turns the mode off.
- Hook: 4 lines in `src/ui/ui.js` wireWild. `pick(foe)` sends wild encounters to `src/rtb/index.js` when the mode is on.
- Trainer battles, Ron and the story fights stay turn-based.

## Fight
- Happens right on the overworld map around the player. The arena is the visible screen inside the map (at most 13x8 tiles). Map collision is respected and walls stop shots.
- Your lead creature fights while the player stands by. Encounters are 1v1, or 2 foes about 25% of the time (`&rtbpack=1/0` forces it for dev).
- **Reused unchanged:**
  - stats: `battleStats`, `maxHp`
  - skills: the 33 entries in skills.js, with power, accuracy, element and category
  - element chart: strong 1.5 / weak 0.6
  - affinity 1.3, crits, damage formula
  - Energy: per-skill uses; empty gives overuse at 0.6 damage, 0.7 accuracy and 1/8 self-damage
  - XP: baseXp·L/7, with level-ups
  - capture: `captureChance` / `captureRoll` with crystal grades and status bonuses
  - result: `applyBattleResult`, `onPartyFainted`
- **New layer:**
  - Each skill gets a shape: bolt, wave, lob, wisp, cone, melee, dash, slam or self. Shapes are in `moves.js`.
  - Cooldown = 0.45 s + power/60 (4 s for status skills).
  - Accuracy below 100 turns into aim spread.
  - Dodge roll with i-frames. A near miss refunds part of the dodge cooldown.
  - Knockback and hitstun; a hit during a wind-up breaks it ("Broken!").
- **Hard:**
  - Foes act on their own: alert, then close in, strafe, telegraph (0.38 s), then attack. They share an attack token.
  - Foes lead their aim, sidestep shots, and enrage below 35% HP.
  - In tests, an idle player loses.
- **Juice:**
  - hitstop, screen shake and white flash
  - squash, afterimages, particles
  - damage numbers, "Strong!" / "Weak..." / "Clean strike!"
  - letterbox intro, hurt vignette, slow-mo on the last KO
  - `?rm=1` or prefers-reduced-motion tones all of this down.
- **Capture:** use a Crystal (weakest grade first). It pulses and then rolls; a fail enrages the foe. One catch per battle, and the crystal is only spent when the cast goes off.
- **Leave:** hold Esc or the Leave button for 1 s.
- **Save:** a `saveGuards` entry returns 'rtb' for the whole fight, so nothing saves mid-battle. The `scene.script` checkpoint is from before the encounter.

## Controls
| | PC | Phone (existing pad) |
|---|---|---|
| move | WASD / arrows | D-pad |
| selected skill | Z / Space / Enter / F | A |
| skill 1-4 | 1-4 | tap a skill chip |
| next skill | C | SEL |
| dodge / sprint | X or Shift: tap = dodge, hold = sprint | B: tap = dodge, hold = sprint (matches overworld sprint) |
| team / crystal / leave | Q / E / hold Esc | buttons top right |

## Files
`src/rtb/flag.js`, `moves.js`, `sim.js` (pure, no DOM), `view.js` (canvas overlay + HUD), `index.js` (session).
Tests: `tests/rtb.test.mjs`. Clips: `tests/rtb_clips.mjs` → `shots/rtb_v1/`.
