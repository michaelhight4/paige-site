# Text Bot request: Contacts (phone book) for named trainers (Coder, Oct 23 2026)

Gary, 12:24 PM CT Oct 23 2026, asked for a contact system for named trainers (his exact words are quoted in quality/dev_notes/kilumen.md).
The feature is dev only and DEFAULT OFF, behind `?contacts=1` (`src/systems/contacts.js`; data in `src/systems/data/contacts.json`).
Coder did NOT edit `text/overworld_lines.json`. Every line below already has a neutral placeholder in code (`PH` in contacts.js).

## Lookup order (per field)

1. `system_contacts.trainers.<map>.<npc id>.<field>` (per-trainer voice, optional)
2. `system_contacts.generic.<field>` (shared fallback)
3. an older key that already covers it (column "existing key"; Text Bot wrote these for SP 1.11 / G4, so those six already show real text)
4. the Coder placeholder

Format: same as other `system_*` blocks. `pages` = list of pages; `choices` where noted (first choice = yes). String fields are plain strings.
`call` (and any pages field) may also be a **variant pool**: a list of page lists, one is picked at random.
Variables are filled from `{name}` braces; `{player}` is available in every field.

## Generic keys: `system_contacts.generic.<field>`

| field | shape | existing key (used now) | vars | where it shows | placeholder now |
|---|---|---|---|---|---|
| `swap_offer` | pages + choices | `system_trainers.contact_ask` | {trainer} | Trainer, after their usual post-battle line, when you talk to them after beating them. Yes/No choice. | Want to swap numbers? I can text you when I want a rematch. [Yes / No] |
| `swap_yes` | pages | - | {player} | Trainer, after Yes. | Great. I will be in touch. |
| `added` | pages | `system_trainers.contact_added` | {trainer} | System line (no speaker) after Yes. | {trainer} was added to your Contacts. |
| `swap_no` | pages | - | {player} | Trainer, after No. | No problem. Ask me again some time. |
| `full` | pages | - | {player} | System line when the list is full (max 20). | Your Contacts list is full. |
| `call` | variants | - | {trainer} {player} | Contacts > Call: the trainer reply. Variant pool (array of page arrays), one picked at random. | {trainer}: "Hey, {player}. Still training hard out here." / {trainer}: "Good timing. I was just thinking about our battle." |
| `call_ready` | pages | - | {trainer} {player} | Contacts > Call while a rematch is waiting. | {trainer}: "I am waiting at my usual spot. Come and find me!" |
| `ping` | pages | `system_phone.ping` | {trainer} | System line when a text arrives on the move. | Your phone buzzes. A text from {trainer}. |
| `rematch_text` | pages | `system_phone.rematch_text` | {trainer} | The incoming text body: rematch offer. | {trainer}: "I have been training. Same spot as before?" |
| `tip_text` | pages | - | {trainer} {species} {place} {time} | The incoming text body: tip about a rare creature on a Trail. | {trainer}: "Heard a rare {species} shows up on {place}{time}. Worth a look!" |
| `rematch_ask` | pages + choices | `system_trainers.rematch_ask` | {trainer} | Trainer, when you talk to a contact who is waiting for a rematch. Yes/Not now. | Ready for our rematch? [Yes / Not now] |
| `rematch_not_now` | pages | - | {player} | Trainer, after Not now. | Okay. I will be right here. |
| `rematch_beaten` | pages | - | {player} | Trainer, after you win the rematch. | You beat me again. I will keep training. |
| `rematch_won` | pages | - | {player} | Trainer, after you lose the rematch. | That one was mine! Come back any time. |
| `gift` | pages | - | {player} | Trainer, gift after every Nth rematch win (Dorian only for now). | Here, take this. It helps on long walks. |
| `gift_received` | pages | - | {item} | System line after the gift. | You got {item}. |
| `remove_confirm` | pages + choices | - | {trainer} | Contacts > Remove: confirm. Remove/Keep. | Remove {trainer} from your Contacts? [Remove / Keep] |
| `removed` | pages | - | {trainer} | Note after removing. | {trainer} was removed from your Contacts. |
| `title` | string | `system_phone.menu.labels.contacts` | {player} | Contacts screen title. | Contacts |
| `call_label` | string | - | {player} | Menu choice. | Call |
| `remove_label` | string | - | {player} | Menu choice. | Remove |
| `back_label` | string | - | {player} | Menu choice. | Back |
| `ok_label` | string | - | {player} | Closes the Call reply. | OK |
| `ready_chip` | string | - | {player} | Chip on a list row when a rematch is waiting. | Rematch |
| `empty` | string | - | {player} | Contacts screen with no contacts. | No contacts yet. Swap numbers with trainers you beat. |
| `last_text` | string | - | {player} | Side panel heading above the last text. | Last text |
| `no_text` | string | - | {player} | Side panel when there is no text yet. | No texts yet. |
| `where` | string | - | {player} | Side panel label before the place name ("Usually at: Trail 1"). | Usually at |
| `time_dawn` | string | - | {player} | Appended to tip_text {time} (leading space). |  at dawn |
| `time_day` | string | - | {player} | Same. |  by day |
| `time_dusk` | string | - | {player} | Same. |  at dusk |
| `time_night` | string | - | {player} | Same. |  at night |

## Per-trainer keys (optional, voice): `system_contacts.trainers.<map>.<id>.<field>`

These five are the only contact-capable trainers today (named, region 1). Most useful per-trainer fields: `swap_offer`, `swap_yes`, `swap_no`, `call` (pool), `call_ready`, `rematch_text`, `tip_text`, `rematch_ask`, `rematch_beaten`, `rematch_won`. Anything not given falls back to `generic`.

| key prefix | trainer | class | notes |
|---|---|---|---|
| `system_contacts.trainers.route1.trainer_r1_d` | Odette | Lab Intern | rematches + tips |
| `system_contacts.trainers.route1.trainer_r1_e` | Rowan | Beetle Keeper | rematches + tips |
| `system_contacts.trainers.route1.trainer_r1_f` | Dorian | Rock Collector | rematches + tips + `gift` (Small Remedy every 2nd rematch win) |
| `system_contacts.trainers.fernwick.trainer_fw_a` | Sabine | Hall Hopeful | rematches + tips |
| `system_contacts.trainers.fernwick.ron_rival_1` | Ron | rival | swap + calls + tips only, **no rematches** (story rival), so no rematch_* lines needed |

## Notes

- Tips name a real rare creature of the tip's Trail from `data/encounters_wired.json` (`{species}`), the place from the area sign title (`{place}`, e.g. "Trail 1 - Sunmeadow Fields"), and `{time}` (one of the `time_*` strings, or empty).
- Trainers *text* the player (the playbook wording); the menu verb is "Call". Text Bot may prefer one verb for both: open question for Gary.
- Blocked words: follow `tools/text_lint/spellcheck.mjs` BLOCKED_PHRASES and the brief's list (use "Trail", never the other word; no capture verbs from the reference game).
- Suggested parity/build tags: parity G4, build `different`.
