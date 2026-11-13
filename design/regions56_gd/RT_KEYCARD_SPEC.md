# RT key-card research areas (R5+ only)
Matches the dev/board-fish-sports branch, which was read but not edited.
- Cards: `keycard_r5` (Mirefen research hut) and `keycard_r6` (Tidewater reef lab). **Coder: drop keycard_r1..r4.**
- Branch: `rnd_clearance`. Granting the card sets flag `rt_keycard_r5` / `rt_keycard_r6`.
- `locked_warps`: each research-area door warp gets `unlock_flag: rt_keycard_rN`. A locked door shows "Clearance card needed."
- Card sources: r5 from the Mirefen quest after beating Master Wenna Peat; r6 from Dr. Coralie Finch after Master Jory Swell.
- Areas are listed in balance.json `research_areas`.
