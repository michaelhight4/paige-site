# Kilumen quest draft schema (overnight, Oct 23 2026) — DRAFT

No data-driven quest schema exists in the codebase yet (no `data/quests.json`, no quest loader; `rg -i quest src/` only finds a comment in save.js). So this is a simple, flat format the Coder can convert.

## File shape
```json
{
  "_meta": {"version": "0.1-draft", "status": "DRAFT", "written": "2026-10-23", "notes": "..."},
  "quests": [ <quest>, ... ]
}
```
Side-quest worker: write `side_quests_draft.json` with the same top-level shape (`_meta` + `quests` array). Main worker merges.

## Quest object (all keys always present; use [] / null when empty)
| key | type | meaning |
|---|---|---|
| `id` | string, snake_case | main quests `mq_<zone>_<beat>`, side quests `sq_<name>` (keep existing `sq_*` flag stems from SOUL_PLAYBOOK 8.5) |
| `title` | string | player-facing title, short |
| `type` | `"main"` or `"side"` | |
| `zone` | string | zone/map id the quest belongs to for play-order grouping (e.g. `brookhollow`, `fernwick`, `thornwood`) |
| `order` | int | play-order sort key (main: 10, 20, 30...; side: use the zone's main order + 1..9) |
| `map_status` | `"built"` or `"map pending"` | "map pending" if any step's map doesn't exist yet |
| `giver` | `{"npc": "<npc id>", "map": "<map id>"}` | real ids where they exist |
| `prerequisites` | list of flag strings | all must be set to start. Prefix `!` = flag must be UNSET |
| `steps` | list of step objects | in order |
| `reward` | `{"items": [{"id": "<item id>", "qty": n}], "money": int, "flags": ["..."]}` | |
| `lines` | list of line objects | quest dialogue only (Text Bot owns map NPC/sign lines) |
| `notes` | list of strings | notes / open questions for Gary |
| `new_ids` | list of strings | every id in this quest that does not exist in code/data yet |
| `status` | `"DRAFT"` | always |

## Step object
| key | type | meaning |
|---|---|---|
| `id` | string | `<quest id>_s<n>` |
| `desc` | string | what the player does (designer-facing) |
| `map` | string | map id |
| `at` | `{"x": int, "y": int}` or null | tile, if known from map data |
| `sets_flag` | string | flag set when the step completes |
| `condition` | string or null | optional extra condition, e.g. `"phase == Night"`, `"has_bike"`, `"ron_in_party"` |

## Line object
| key | type | meaning |
|---|---|---|
| `npc` | string | npc id (or `sign:<id>` / `prop:<id>` / `system`) |
| `context` | `"start"`, `"in_progress"`, `"turn_in"` (also allowed: `"step"` with `step` key, `"after"`) | |
| `step` | string or null | step id when context is `step` |
| `text` | list of strings | one string = one text box, ~20 words max, 2 lines x 40 chars ideal |

## Rules
- Banned words: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse. No alcohol, drugs or smoking (Firefly = juices, teas, milkshakes only; never "bartender", "tab", "round", "tipsy" in player text; NPC id `rebel_bartender` is fine as an id only).
- Player text says "coin", never "badge". Creatures by name, Vane by catalogue number.
- Unconfirmed big calls (rebels = Riverbank Stranger's people, Vane memo, Vane's motive, crystal-release ending) are NOT canon: put them in `notes`, never in `lines`.
