# ownership_beats_ab.json — DRAFT pending Gary

**Status:** DRAFT — not Gary-approved yet. Coder may merge+gate after Gary stamp.

**File:** `docs/events_draft/ownership_beats_ab.json` — 27 events (A0–A13 + B0–B12).

**Stubs:** none. A3, A7, A9, A13, B3, B8, B12 use Text Bot dialogue from `tournament_guild_scene_dialogue.md` (Nov 5 fill).

**Merge notes for Coder:**
- Do not edit live `events.json` / `events_expansion.json` until Gary approves.
- Gates use existing `matches()` keys: `if.team` / `if.guild` (bool or `{owned, stage, minRenown, minFoundedYears}`), `if.flag`.
- Story `flagset` values (`team_story_found`, `guild_story_found`, etc.) are narrative markers — wire to real `foundTeam` / `foundGuild` / stage mutations as needed; gold costs on A1/B1 mirror UI (80 / 150) but UI path still owns founding unless you auto-found on choice.
- A4 requires `team_meet_entered`; B4 requires `guild_board_open` (set by prior beat choices).
- A13/B12 require `reincarnated` (set by engine on reincarnate path).
- A8 is `once: true` for v1 merge safety; design wants triennial recur — flip to `once: false` + `cool: 8` when ready.
- No alcohol/drugs/tobacco. No live ID collisions.

*Playtest/Story draft · Nov 5, 2026 CT*
