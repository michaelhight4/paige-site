# Text Bot requests: QoL batch B (Coder, Oct 29, 2026)

Every line below ships now as a `/* PH */` placeholder in code. Please write the final lines into text/*.py and overworld_lines.json.
Banned words: PP, shiny, super effective, Pokédex, Poké Ball, Gotcha!, nurse, weed, route/routes, and "throw" for capture.

## #4 Team XP share (src/battle/ui_sd.js, key prefix = ui_sd KEY, i.e. `system_battle`)
- `system_battle.xp_share`: "The rest of the team gained {n} XP." (said once per KO; {n} = each benched creature's share)
- `system_battle.bench_levelup`: "{creature} grew to Lv.{level}!" (a benched creature levels up)

## #7 Matchup hint (src/qol/matchup.js LABELS)
- Labels for the skill list: Very strong / Strong / Even / Weak / Very weak / No effect. Keep "Strong" and "Weak" as the core words.
- Damage preview (off by default, `?qol=dmgPreview`): "{lo}–{hi}%" plus "likely KO" / "2 hits" / "{n} hits".

## #5 Skill Recall (src/qol/skills_menu.js, Team menu, free)
- Menu row: "Recall skill"
- Ask: "Which skill should {creature} remember?"
- Replace ask: "{creature} knows four skills. Replace which one with {skill}?" / option "Keep all four"
- Results: "{creature} learned {skill}." / "{creature} forgot {old} and learned {skill}." / "{creature} already knows it." / "{creature} can't learn that one." / "Nothing changed."

## #6 Training Reels (B22, reusable; Revival Tech product)
- Team menu row: "Teach from Reel"; ask "Use which Reel?"
- Pack: "{reel}: teach who?" with tags "Can learn" / "Knows it" / "Can't learn"
- Item catalogue names and pages (items: reel_pounce, reel_gustdart, reel_halflash). Fallback name: "Training Reel: {skill}". Page should say it is reusable and made by Revival Tech.
