# Free tools pass 2 (Oct 29, 2026) - dev only, nothing ships
| Command | Tool | What it tells you |
|---|---|---|
| node tools/build/bundle_report.mjs | esbuild (MIT) | Boot JS: 198 modules, 2591 KB raw -> 1641 KB min -> 561 KB gz if bundled. Biggest: battle/engine.js 201 KB, ui/species_synced.gen.js 113 KB, ui.js 105 KB, vendor/brackets 93 KB |
| tools/coverage/coverage.sh | c8 (ISC) | Node-test coverage of src/ (Oct 29: 55.8% lines, 35.0% functions) |
| node tools/bench/boot_bench.mjs | tinybench (MIT) | JSON.parse of all 95 maps = ~7 ms, so map parsing is NOT the 20-25 s load cause |
| node tools/world_graph/world_graph.mjs [--route A B] | ngraph.graph/path (BSD-3/MIT) | Unreachable maps, warps to missing maps, one-way links, shortest map route |
Setup for the two /tmp tools: `npm i --prefix /tmp/kil_bench tinybench@6.2.2` and `npm i --prefix /tmp/kil_graph ngraph.graph@20.1.2 ngraph.path@1.6.1`.
World graph caveats: `$return` warps are linked back to every map that warps in, so shared interiors (shop_int) create shortcut routes; lifts/stairs not stored as warps show as "unreachable" (check before fixing).
Oct 29 findings: dangling `aurelith_stadium_int -> aurelith_arena` (x2); unreachable galleria 2F-roof, hotel 2F, heal_centre_int, house_int_a/b/c, house_1f_v2, rt_branch_backroom.
