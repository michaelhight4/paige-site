// Kilumen ink proof (Oct 22, 2026): maps.brookhollow.villager_garden.
// SAME WORDS as text/overworld_lines.json v0.4.9 (that JSON entry stays the source of truth while ?ink=1 is off).
// Conventions (toolkit INK_PIPELINE.md): one output line = one dialogue page; "# line:<id>" on the first line of a
// branch names the overworld_lines id it mirrors; game placeholders are escaped (\{lead\}) so ink prints them and the
// game fills them; flags come from the game through EXTERNAL flag(); the fallbacks below are only for testing in Inky.
EXTERNAL flag(name)
EXTERNAL has_lead()

// overworld_lines.json order: first line whose flags are all set wins; a {lead} line needs a lead creature.
{
  - flag("beat_master_fernwick") && has_lead():
    -> garden_lead
  - else:
    -> default_line
}

=== garden_lead ===
Is that \{lead\}? It's eyeing my beans. # line:garden_lead
I'm watching you, \{lead\}.
-> END

=== default_line ===
Something keeps eating my beans at night. Neat little bites. Very polite. # line:default
Probably a Tumbloam up from the river. Hard to stay mad at it.
-> END

// ---- Inky preview fallbacks (the game binds the real functions; edit these to preview the other branch) ----
=== function flag(name) ===
~ return false

=== function has_lead() ===
~ return true
