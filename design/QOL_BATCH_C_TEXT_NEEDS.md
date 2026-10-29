# QoL batch C: text needs (for Text Bot)

Coder, Oct 29 2026. Code reads these through ui.T('qol_c.<key>'). Each uses the English fallback until text/*.py / the string table defines it. Please write final copy and keep the {placeholders}. Banned words apply (PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route(s), throw-for-capture).

| key | placeholder fallback |
|---|---|
| qol_c.apps.chain | Chain |
| qol_c.apps.quick_save | Quick save |
| qol_c.apps.storage | Storage |
| qol_c.back | Back |
| qol_c.chain.best | Best |
| qol_c.chain.count | In a row |
| qol_c.chain.odds | Variant odds |
| qol_c.chain.placeholder | not applied yet |
| qol_c.chain.species | Kind |
| qol_c.quick_save.done | Saved. |
| qol_c.rename.ask | New name for {creature}? (max {max} letters, empty = species name) |
| qol_c.rename.done | Now called {creature}. |
| qol_c.renew.no | Not now |
| qol_c.renew.ran_out | The {item} wore off. Use another? ({n} left) |
| qol_c.renew.used | Used another {item}. |
| qol_c.renew.yes | Use another |
| qol_c.stats.growth | Growth |
| qol_c.stats.note | Growth shows how far each stat tends to rise for this kind of creature. |
| qol_c.stats.now | Now |
| qol_c.stats.title | Stats |
| qol_c.storage.box | Box {n} |
| qol_c.storage.box_hint | Box |
| qol_c.storage.drop_off | Drop off |
| qol_c.storage.empty | This box is empty. |
| qol_c.storage.move | Move |
| qol_c.storage.pick_up | Pick up |
| qol_c.storage.team | Team |
| qol_c.storage.title | Storage |
| qol_c.summary.more | More |
| qol_c.summary.rename | Rename |
| qol_c.summary.stats | Stats |

Also needed: the quick-save refusal lines (battle, dialogue, script/cutscene, lock) and the rename rejection lines (too_long, banned, filtered). They currently show generic fallbacks.
