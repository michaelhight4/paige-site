# Text Bot request: RITA "Trainer 1" intro (coder, Oct 23 2026, 3:3x PM CT)

Gary 3:31 PM CT, verbatim: "the very first time rita ever talks to you she needs to read your number and say
'yeah no that uses too much company time, youre now trainer 1'" and "She calls me Trainer 1 from then on".

Please add to `text/overworld_lines.json` -> `system_company_voice` (key name is fixed, code reads it):

```json
"rita_trainer1": { "pages": ["{employee_id}...", "Yeah, no. That uses too much company time. You're now Trainer 1."] }
```

- Page 1 is the bare slot + "..." (she starts reading the 6-digit number and gets cut off). Keep max 2 pages.
- Shown once per save, in front of RITA's very first strip (src/systems/company_voice.js TRAINER1_INTRO is the code
  default until this key exists; the voice clips in assets/audio/rita were built from exactly this text, so if the
  wording changes the voice goes silent for that page until tools/build_rita_voice.py is re-run).
- After the intro, `{employee_id}` in RITA's lines renders as "Trainer 1" (text + voice). Other text keeps the number.
- Please also add `rita_trainer1` to the RITA voice scope (data/rita_voice_scope.json) so the next build keeps it.
