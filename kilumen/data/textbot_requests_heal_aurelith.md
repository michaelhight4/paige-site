# Text Bot requests: heal_aurelith (Coder, Oct 29 2026)

Gary (2:40 PM CT Oct 29 2026): "Give Aurelith its own heal centre". New map `heal_aurelith` (Revival Tech Aurelith
branch, the capital flagship; the crystal polisher here plays the FIRE heal animation, every other branch plays purple).
It ships with PLACEHOLDER lines in `src/overworld/heal_aurelith_ph.js`, used only while `overworld_lines.json
maps.heal_aurelith` is missing. Please add `maps.heal_aurelith` (same shape as maps.heal_saltmere) and soul_index entries;
once it exists the placeholders are ignored. Banned words as always (no nurse etc.).

- `area_name`: PH "Revival Tech, Aurelith"
- `heal_aurelith_carer` (healer, pages / after_heal / declined / lines incl. healer_lead + carer_coin like other branches):
  PH "Welcome to Revival Tech, Aurelith branch. Our flagship." / "Want me to rest your team?";
  after_heal "All rested. Flagship polish, at no extra charge." / "Do come again."; declined "Of course. We will be here."
- `heal_aurelith_technician` (by the polisher; a night line would be nice): PH "The capital machines run hot. Watch the
  flames." / "They don't burn. They just like to show off."
- `heal_aurelith_storage_user` (at the terminal): PH "Biggest branch in the country, and still a queue for the terminal."
- `heal_aurelith_visitor` (NEW 4th NPC, waiting area): PH "I came in from the station just to watch the machine." /
  "Nobody believes me about the fire."
- `suggestion_box`, `newsletter`, `company_terminal` (x 12, y 4, stand [11, 4]): currently reuse heal_saltmere's
  entries; capital-flavoured variants welcome.
