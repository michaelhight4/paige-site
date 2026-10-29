// Boot-path micro-bench with tinybench 6.2.2 (MIT, github.com/tinylibs/tinybench). Installed to /tmp only:
//   npm i --prefix /tmp/kil_bench tinybench@6.2.2 && node tools/bench/boot_bench.mjs
// Measures JSON.parse cost of every overworld map (all 96 parsed at once vs the largest one) so map lazy-loading
// work can be judged with numbers before/after. Dev only.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { Bench } = await import(pathToFileURL('/tmp/kil_bench/node_modules/tinybench/dist/index.js').href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'art/world/overworld/maps');
const maps = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => [f, readFileSync(path.join(dir, f), 'utf8')]);
const biggest = maps.reduce((a, b) => (b[1].length > a[1].length ? b : a));
const bench = new Bench({ time: 500 });
bench.add(`parse all ${maps.length} maps`, () => { for (const [, s] of maps) JSON.parse(s); })
  .add(`parse largest (${biggest[0]})`, () => JSON.parse(biggest[1]));
await bench.run();
console.table(bench.table());
