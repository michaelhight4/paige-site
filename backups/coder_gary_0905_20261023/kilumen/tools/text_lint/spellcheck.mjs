// Kilumen player-facing text lint: cspell 9.8.0 (MIT, dev-only, installed in tools/free_tools). Oct 23, 2026.
// Config: tools/text_lint/cspell.json (en-GB + blocked words in flagWords), project words: kilumen-words.txt.
// Usage: node tools/text_lint/spellcheck.mjs [--strict] [--json]   (npm run lint:text)
// Warn-only by default: prints unknown and forbidden words, exits 0. --strict exits 1 on any issue.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
export const CSPELL = join(ROOT, 'tools/free_tools/node_modules/.bin/cspell');
/** Player-facing text sources (globs relative to the repo root). */
export const TEXT_GLOBS = ['text/overworld_lines.json', 'text/ink/*.ink', 'data/quests.json', 'data/masters.json', 'src/systems/data/*.json'];

export function available() { return existsSync(CSPELL); }

/** Run cspell on the given globs (or a string via stdin). Returns {unknown:[{file,line,col,word}], forbidden:[...]} */
export function spellcheck({ globs = TEXT_GLOBS, stdin = null } = {}) {
  const args = ['lint', '--no-progress', '--no-summary', '--no-color', '-c', join(HERE, 'cspell.json'), ...(stdin != null ? ['stdin'] : globs)];
  const r = spawnSync(CSPELL, args, { cwd: ROOT, input: stdin ?? undefined, encoding: 'utf8', maxBuffer: 32 << 20 });
  if (r.error) throw r.error;
  const out = { unknown: [], forbidden: [] };
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^(.*):(\d+):(\d+) - (Unknown|Forbidden) word \(([^)]+)\)/);
    if (m) out[m[4] === 'Unknown' ? 'unknown' : 'forbidden'].push({ file: m[1] || '(stdin)', line: +m[2], col: +m[3], word: m[5] });
  }
  if (r.status > 1 || (r.status === 1 && !out.unknown.length && !out.forbidden.length)) throw new Error(`cspell exited ${r.status}: ${r.stderr.slice(0, 400)}`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!available()) { console.log('cspell not installed: run `npm install` in tools/free_tools'); process.exit(0); }
  const res = spellcheck();
  if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 1));
  else {
    for (const k of ['forbidden', 'unknown']) for (const i of res[k]) console.log(`${k === 'forbidden' ? 'BLOCKED' : 'spell  '} ${i.file}:${i.line}:${i.col}  ${i.word}`);
    console.log(`text lint: ${res.forbidden.length} blocked word(s), ${res.unknown.length} unknown word(s) in ${TEXT_GLOBS.join(', ')}`);
    console.log('Invented names go in tools/text_lint/kilumen-words.txt; real typos should be fixed in the text.');
  }
  if (process.argv.includes('--strict') && (res.forbidden.length || res.unknown.length)) process.exit(1);
}
