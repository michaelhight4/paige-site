# Bar NPCs invisible (Gary, Oct 29 2026 10:53 AM CT)

Only bar/tavern/pub interior in live (v0.2.53, ac7c4dd) and dev: `club_int` (The Firefly, juice bar / underground club).

**Cause:** the 7-person cast (rebel_bartender, rebel_dj, rebel_patron_1-3, rebel_bouncer, rebel_paint_vendor) lives in
`club_int.json text_pending.npcs`, and Overworld.loadMap places them because Text Bot lines exist (they are solid and talkable),
but `art/characters/pixel/npcs/npc_sprite_map.json` had no `club_int.*` keys. Npc.sprite = null, `_loadActorSprites` skips them,
so they are never drawn. Not depth, not time of day, not a flag; the sheets exist.

**Fix (data only):** 7 entries added to npc_sprite_map.json reusing existing approved villager sheets
(`club_int_sprite_entries.json` = the exact entries to merge into live's `map`). Placeholder casting until bespoke art.

**Shots:** before = live tree served as is; after = live tree with the patched sprite map served in place
(`SITE=/workspace/ps_clone/kilumen [FIXED_MAP=...] node tests/bar_npcs_shots.mjs before|after`). 0/7 drawn -> 7/7, PC + phone, day + night.
**Test:** `node --test tests/bar_npcs.test.mjs` (SITE=... to check live: fails on v0.2.53, passes with the fix).
