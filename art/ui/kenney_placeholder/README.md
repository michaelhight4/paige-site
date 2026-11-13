# PLACEHOLDER art: Kenney (CC0), UI tools pass, Oct 22, 2026

These are **stand-ins**, not Kilumen's final art. They only fill spots where the UI had no art at all.
They never replace the themed patterns, glyphs or colourways in src/ui/theme.css.

Every use in the DOM carries `data-placeholder="kenney"` and the class `ph-ico` or `ph-key`.
To find them all: `rg 'kph\(' src/ui` or `document.querySelectorAll('[data-placeholder=kenney]')`.

| File | Source pack (staged copy) | Used for |
|---|---|---|
| keyboard_z, keyboard_x, keyboard_enter, keyboard_escape, keyboard_arrows_* | Kenney Input Prompts 1.5, Keyboard & Mouse/Default (vendor_staging/ui/kenney-input-prompts) | Menu hint bar on PC (keyboard) |
| xbox_button_a, xbox_button_b, xbox_dpad_* | Kenney Input Prompts 1.5, Xbox Series/Default | Menu hint bar when the last input was a gamepad |
| icon_exclamation, icon_multiplayer, icon_shoppingBasket, icon_shoppingCart, icon_question | Kenney Game Icons, PNG/Black/2x (vendor_staging/ui/kenney-game-icons), renamed with an `icon_` prefix | Empty-state plates: Tasks, Contacts, empty pocket, nothing to sell, no team |

Licence: CC0 1.0 (see License_input-prompts.txt and License_game-icons.txt, copied unchanged from the packs).
Credit is optional, but it is listed in THIRD_PARTY_LICENSES ("UI tools pass (Oct 22, 2026)").

To swap in final art, replace the PNGs with files of the same name, or change `KPH` / `kph()` at the top of src/ui/ui.js.
