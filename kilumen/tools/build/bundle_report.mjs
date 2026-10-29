// Load-time report: bundles + minifies src/main.js with esbuild (MIT, already in node_modules)
// into /tmp/kilumen_bundle (never in place) and prints raw vs bundled vs gzip size and module count.
// Dev/offline only; the live game still loads the unbundled ES modules. Usage: node tools/build/bundle_report.mjs
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.argv[2] || '/tmp/kilumen_bundle';
const stripQuery = { name: 'strip-query', setup(b) {
  b.onResolve({ filter: /\?/ }, a => ({ path: path.resolve(a.resolveDir, a.path.split('?')[0]) }));
} };
const r = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: true, format: 'esm',
  splitting: true, outdir: out, metafile: true, logLevel: 'warning', plugins: [stripQuery],
  external: ['node:*'], loader: { '.json': 'json' } });
const inputs = Object.entries(r.metafile.inputs);
const raw = inputs.reduce((s, [, v]) => s + v.bytes, 0);
let min = 0, gz = 0;
for (const f of Object.keys(r.metafile.outputs).filter(f => f.endsWith('.js'))) {
  const buf = readFileSync(path.resolve(process.cwd(), f));
  min += buf.length; gz += gzipSync(buf).length;
}
const top = inputs.sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 10);
console.log(JSON.stringify({ modules: inputs.length, raw_kb: +(raw / 1024).toFixed(1), min_kb: +(min / 1024).toFixed(1), gz_kb: +(gz / 1024).toFixed(1),
  outputs: Object.keys(r.metafile.outputs).length, out, top_inputs_kb: top.map(([k, v]) => [k, +(v.bytes / 1024).toFixed(1)]) }, null, 1));
