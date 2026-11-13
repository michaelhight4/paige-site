# valibot 1.5.0 (MIT) – tree-shaken subset for save validation

- Source: npm `valibot@1.5.0` (github.com/open-circle/valibot), licence file `LICENSE.md` (MIT, read Oct 23, 2026).
- `valibot.min.js` is an esbuild bundle of only the exports listed in `entry.mjs` (8.4 KB min, ~2.3 KB gzip).
- Used by `src/overworld/save_schema.js` (save-file validation inside `SaveStore` load/save).
- Rebuild (from the repo root, after `npm install` in `tools/free_tools`):
  `NODE_PATH=tools/free_tools/node_modules ./node_modules/.bin/esbuild src/vendor/valibot/entry.mjs --bundle --format=esm --minify --legal-comments=none --outfile=src/vendor/valibot/valibot.min.js`
  then put the licence banner line back at the top.
