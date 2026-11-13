# Text Bot request: RITA install scene + escort walk beats (Coder, Oct 23 2026)

Gary, 3:58 PM CT: "We need for the lab guy to 'install Rita' and explain it's a cutting edge Ai meant to assist the field teams."
Gary, 3:59 PM CT: "That happens during the tutorial before you choose a kilumen."
Gary, 4:00 PM CT (escort walk): "the walk is supposed to give the story body."

The lines below are live as **code defaults** in `src/overworld/intro.js` (`FALLBACK_OFFICE`). Please add them to
`text/overworld_lines.json` under the keys shown (same shape as `scene_starter_intro`: `pages` with `WHO:` prefixes plus a
`lines` default entry). Edit the wording freely; keep the facts (RITA = Resource Inventory and Tracking Assistant, a
cutting-edge AI built to assist the field teams; Revival Tech). The game uses the file version as soon as the key exists.

## maps.lab_brookhollow.scene_rita_install (kind: scene, 4 pages)
Plays right after `scene_starter_intro` ("RON: I'm going by looks."), before the starter pick. Speaker: the lab tech.
```
LAB TECH: Oh, one more thing before you pick. Your device, please. I need to install RITA.
LAB TECH: Resource Inventory and Tracking Assistant. Cutting-edge AI, built to assist the field teams.
LAB TECH: She tracks your creatures, your crystals, your progress. She's very helpful. She'll tell you so herself.
LAB TECH: She also has a bit of a personality. Revival Tech calls that a feature.
```

## maps.lab_brookhollow.rita_install_progress (kind: scene, 1 page, narration, no speaker; a chime plays with it)
```
Installing RITA... 100%. The device chimes.
```
Straight after this page RITA's first strip appears: the existing one-time Trainer 1 intro
(`system_company_voice.rita_trainer1`). No new RITA line is needed.

## maps.brookhollow.escort_street (kind: scene, 1 page)
On the street outside the office, before the walk to the lab starts.
```
MANAGER: Lab's down by the river. Stay close, and don't stop to pet anything.
```

## maps.brookhollow.escort_midway (kind: scene, 3 pages)
Halfway to the lab (the line stops, talks, walks on).
```
RON: So what's the lab like?
MANAGER: Clean. Quiet. Expensive. Don't touch anything you can't afford.
RON: So... nothing.
```

Flag set by the install: `rita_installed` (saved). Blocked words checked (none used).
