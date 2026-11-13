// Builds vendor/battle-sim (TypeScript, MIT fork of Pokémon Showdown's simulator via @pkmn/sim)
// into one minified ES module the zero-build game loads: src/battle/engine.js.
// Usage: node tools/build_battle_engine.mjs [--check]   (--check also runs tsc on the fork)
import { build } from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const out = root + 'src/battle/engine.js';
if (process.argv.includes('--check')) {
  execFileSync(root + 'node_modules/.bin/tsc', ['-p', root + 'vendor/battle-sim'], { stdio: 'inherit' });
}
const lic = (f) => readFileSync(root + 'vendor/battle-sim/' + f, 'utf8').trim().replace(/\*\//g, '* /');
const license = lic('LICENSE') + '\n\n' + lic('LICENSE.pkmn');
await build({
  entryPoints: [root + 'vendor/battle-sim/sim/index.ts'],
  bundle: true, format: 'esm', minify: true, target: 'es2020', platform: 'neutral', outfile: out,
  legalComments: 'none',
  banner: { js: `/*! Kilumen battle engine: a modified fork of an MIT-licensed battle simulator.\n * Source and changes: vendor/battle-sim (CHANGES.md); notices: THIRD_PARTY_LICENSES.\n${license.split('\n').map((l) => ' * ' + l).join('\n')}\n */` },
  logLevel: 'warning',
});
const buf = readFileSync(out);
console.log(`src/battle/engine.js ${statSync(out).size} B, gzip ${gzipSync(buf, { level: 9 }).length} B`);
