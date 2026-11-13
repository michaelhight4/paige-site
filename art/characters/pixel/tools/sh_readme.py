import json
M=json.load(open('_parts/starters_humans_manifest.json'))
L=["# Kilumen pixel conversion — starters + humans slice (Phase 3)","",
f"Generated {M['generated']}. Scope: {M['scope']}.",f"Palette: {M['palette']}. Off-palette / semi-alpha pixels found in sprites: {M['palette_check_offpalette_or_semialpha']}.","",
"Pipeline = pixel_pilot pipeline (tools/sh_pxlib.py is pilot pxlib.py verbatim + helpers copied from pilot step3/4/5), then redmean remap to the official 64-colour palette. Build: `python3 tools/sh_build.py all && python3 tools/sh_parts.py && python3 tools/sh_readme.py` from pixel/.","",
"## Layout per starter (creatures/<name>/)",
"- battle/<name>_{front,back}_<128|160>.png (+ _2x). 160 = Bastonox, Forgeharrow, Tidemarrow.",
"- anim/<name>_{front,back}_idle/ f0–f3 (+ _2x), anim/<name>_{front,back}_idle_sheet(.png,_2x), _2x.gif (180/160/200/160 ms; bob + crystal/lava glow).",
"- overworld/<name>_ow/<name>_ow_{down,left,right,up}_{stand,walk0..3}(.png,_2x,_3x); overworld/<name>_ow_sheet(.png,_2x,_3x) (rows down/left/right/up, cols stand+walk0-3); _walk_{dir}_{2,3}x.gif, _walk_all_{2,3}x.gif (130 ms). 64x64, or 96x96 for finals.",
"- Cindrip rebuilt from pilot bases; Emberlunx/Forgeharrow battle FRONT = pilot bases (backs new). All remapped to the official palette.","",
"## Layout per human (humans/<cal|ron|mira|vane|riverbank_stranger>/)",
"- trainer/<n>_trainer_64x128(.png,_2x,_3x)",
"- overworld/<n>_chibi/... same naming as creatures (64x96, 150 ms); arm swing on Cal, Ron, Mira front/back walks.",
"- portraits/<n>_<expr>.png, 512 px tall, transparent. Cal: neutral/happy/surprised (pilot copies). Ron: neutral/happy/angry (new clean-arc raws). Mira: neutral/cheerful/determined. Vane: composed/pleased/stern. Stranger: calm/kind/sorrowful.",
"- NOTE: humans/cal/run_bike/ is NOT mine (another worker) and is excluded.","",
"## Shared (_parts/)"]+[f"- {p['path']} {p.get('size','')}" for p in M['parts']]+["- _parts/starters_humans_manifest.json","- _parts/starters_humans_README.md","",
f"## Counts\n{json.dumps(M['counts'])}","","## Every file"]
for g in ('creatures','humans'):
    for k,v in M[g].items():
        L.append(f"\n### {g}/{k} ({len(v['files'])} files)")
        L+= [f"- {f['path']}"+(f"  {f['size'][0]}x{f['size'][1]}" if 'size' in f else '')+(f" {f['frames']}fr" if 'frames' in f else '') for f in v['files']]
L.append("\n### tools (sh_ only)"); L+=[f"- {f['path']}" for f in M['tools']]
L.append("\n### raw (generated sources, 1280x720)"); L+=[f"- {f['path']}" for f in M['raw']]
open('_parts/starters_humans_README.md','w').write('\n'.join(L)+'\n'); print(len(L))
