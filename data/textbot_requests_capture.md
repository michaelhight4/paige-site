# Text Bot request: capture refusal in trainer battles (Coder, Oct 23 2026)

Gary, 12:03 PM CT Oct 23 2026: "also the capture chance is based on health and chance, but also no capturing trainers creatures"

No existing key in text/overworld_lines.json covers this (searched system_trainers, system_wild, system_battle, catch/crystal lines).
The code already looks the key up and uses a neutral fallback until it exists. Coder did not edit overworld_lines.json.

## Needed key

| key | where it shows | fallback now in code |
|---|---|---|
| `system_trainers.no_capture` | Battle message box when the player picks a crystal in the Pack during any trainer battle (trainers, Ron, hall helpers, Masters, scripted owned battles). No item is used, no turn passes. | That creature already has a trainer. A crystal won't take it. |

- Format: `pages` = one short line (one page), no placeholders needed. Optional `{trainer}` is NOT passed today.
- Read by: `src/battle/ui_sd.js` (`noCapture()`), `src/ui/ui.js` shell battle (`?battle=shell`), both via `ui.P('system_trainers.no_capture', [fallback])`.
- Suggested parity/build tags: parity B16/B17, build `partial`.
- Blocked words reminder: no 'throw', 'Poké Ball', 'Gotcha!', 'route', 'PP', 'shiny', 'super effective'.
