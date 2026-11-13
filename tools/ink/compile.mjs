// Kilumen ink compile (Oct 22, 2026): text/ink/*.ink -> text/ink/*.ink.json (the JSON the game loads).
// Default compiler: inkjs ink-full (MIT, vendor_staging/inkjs 2.4.0; same ink format as inklecate 1.2.1).
// --inklecate=<path> uses the official inklecate binary instead (e.g. /home/box/tools/inklecate/inklecate).
// --check compiles in memory and fails if any .ink.json on disk is stale (CI / pre-handoff guard). Never touches src/.
// Usage: node tools/ink/compile.mjs [--check] [--inklecate=PATH] [file.ink ...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INK_DIR = path.join(ROOT, 'text/ink');
const args = process.argv.slice(2);
const check = args.includes('--check');
const inklecate = args.find((a) => a.startsWith('--inklecate='))?.slice(12);
let files = args.filter((a) => !a.startsWith('--')).map((f) => path.resolve(f));
if (!files.length) files = fs.readdirSync(INK_DIR).filter((f) => f.endsWith('.ink')).map((f) => path.join(INK_DIR, f));

const { Compiler } = await import(path.join(ROOT, 'vendor_staging/inkjs/package/dist/ink-full.mjs'));
const norm = (s) => JSON.stringify(JSON.parse(s.replace(/^\uFEFF/, '')));

let bad = 0;
for (const src of files) {
  const out = src + '.json', rel = path.relative(ROOT, src);
  let json;
  try {
    if (inklecate) {
      const tmp = path.join(fs.mkdtempSync('/tmp/inkc-'), 'out.json');
      execFileSync(inklecate, ['-o', tmp, src], { stdio: ['ignore', 'pipe', 'pipe'] });
      json = norm(fs.readFileSync(tmp, 'utf8'));
    } else {
      const errors = [], warnings = [];
      const c = new Compiler(fs.readFileSync(src, 'utf8'), {
        errorHandler: (msg, type) => (type === 2 ? errors : warnings).push(msg), // 2 = Error in inkjs ErrorType
      });
      const story = c.Compile();
      for (const w of warnings) console.warn(`  warn ${w}`);
      if (errors.length || !story) throw new Error(errors.join('\n') || 'compile failed');
      json = norm(story.ToJson());
    }
  } catch (e) { bad++; console.error(`FAIL ${rel}\n${String(e.stderr || e.message || e)}`); continue; }
  if (check) {
    const same = fs.existsSync(out) && norm(fs.readFileSync(out, 'utf8')) === json;
    console.log(`${same ? 'ok   ' : 'STALE'} ${path.relative(ROOT, out)}`);
    if (!same) bad++;
  } else {
    fs.writeFileSync(out, JSON.stringify(JSON.parse(json), null, 1) + '\n');
    console.log(`wrote ${path.relative(ROOT, out)}`);
  }
}
process.exit(bad ? 1 : 0);
