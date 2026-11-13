# Kilumen palette (LOCKED)

- 64 colours, exported verbatim (same order) from `art/world/overworld/palette.hex` on 2026-10-22.
- Files: `kilumen.hex` (one hex per line), `kilumen.gpl` (GIMP/Aseprite/Krita), `kilumen.pal` (JASC-PAL, Aseprite/Pro Motion/Paint Shop Pro).
- Lock: sha256 of `kilumen.hex` = `82166240370aa7fc43de8889f7032eff08bf565696905dd79eff512c3afeacf8`. `tools/palette_check.py --verify-lock` fails if any copy drifts.
- Allowed non-opaque pixel: the overworld drop shadow `rgba(26,18,38,96)` (#1a1226 at alpha 96). Fully transparent pixels are ignored.
- Painted portraits (`*/portraits/*`) and preview/raw/upscale folders are not pixel art and are skipped by the checker.
- Nothing was recoloured. A Lospec comparison (proposal only) lives in `/workspace/quality/toolkit/palette/` (`lospec_match_ranking.json`, `contact_sheet_current_vs_top2.png`).
- Changing this palette needs Gary's approval.
