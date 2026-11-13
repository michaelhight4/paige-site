// Kilumen player-facing text lint: cspell 9.8.0 (MIT, dev-only, installed in tools/free_tools). Oct 23, 2026.
// Also checks BLOCKED_PHRASES (PP, super effective, Poké Ball, Gotcha!, tonic as a label) with a JSON-value scan: cspell flagWords are single words only.
// Config: tools/text_lint/cspell.json (en-GB + blocked words in flagWords), project words: kilumen-words.txt.
// Usage: node tools/text_lint/spellcheck.mjs [--strict] [--json]   (npm run lint:text)
// Warn-only by default: prints unknown and forbidden words, exits 0. --strict exits 1 on any issue.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

/**
 * Blocked PHRASES that cspell's single-word flagWords can't catch (Gary, Oct 23, 2026, 9:05 AM CT).
 * Checked on player-facing string VALUES only: JSON keys, ids (tonic_small) and design notes
 * (keys starting with "_", note/notes/where/system/state_rule) are skipped.
 */
export const BLOCKED_PHRASES = [
  { id: 'PP', re: /\bPP\b/ },                                 // upstream move-energy term (case-sensitive)
  { id: 'super effective', re: /\bsuper[\s-]*effective\b/i },
  { id: 'Poké Ball', re: /\bpok[eé][\s-]*balls?\b/i },
  { id: 'Gotcha!', re: /\bgotcha\b/i },
  { id: 'tonic (label)', re: /\btonics?\b/i },                // label renamed to Remedy; ids like tonic_small are fine
];
const NOTE_KEY = /^(_|note$|notes$|where$|system$|state_rule$|format_in_engine$)/;

function* jsonStrings(o, path = []) {
  if (typeof o === 'string') { yield [path.join('.'), o]; return; }
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) yield* jsonStrings(o[i], [...path, i]); return; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!NOTE_KEY.test(k)) yield* jsonStrings(v, [...path, k]);
}

/** Expand TEXT_GLOBS (only "dir/*.ext" wildcards are used) to repo-relative paths. */
export function textFiles(globs = TEXT_GLOBS) {
  const out = [];
  for (const g of globs) {
    const m = g.match(/^(.*)\/\*(\.[\w.]+)$/);
    if (!m) { if (existsSync(join(ROOT, g))) out.push(g); continue; }
    if (!existsSync(join(ROOT, m[1]))) continue;
    for (const f of readdirSync(join(ROOT, m[1])).sort()) if (f.endsWith(m[2]) && !(m[2] === '.ink' && f.endsWith('.json'))) out.push(`${m[1]}/${f}`);
  }
  return out;
}

/** Scan text (or the player-facing files) for BLOCKED_PHRASES. -> [{file, where, phrase, text}] */
export function phraseCheck({ files = textFiles(), stdin = null } = {}) {
  const hits = [];
  const scan = (file, where, text) => { for (const p of BLOCKED_PHRASES) if (p.re.test(text)) hits.push({ file, where, phrase: p.id, text: text.slice(0, 100) }); };
  if (stdin != null) { scan('(stdin)', '', stdin); return hits; }
  for (const f of files) {
    const raw = readFileSync(join(ROOT, f), 'utf8');
    if (f.endsWith('.json')) for (const [where, v] of jsonStrings(JSON.parse(raw))) scan(f, where, v);
    else raw.split('\n').forEach((l, i) => { if (!/^\s*(\/\/|#|VAR\b|~)/.test(l)) scan(f, `line ${i + 1}`, l); });
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!available()) { console.log('cspell not installed: run `npm install` in tools/free_tools'); process.exit(0); }
  const res = spellcheck();
  const phrases = phraseCheck();
  if (process.argv.includes('--json')) console.log(JSON.stringify({ ...res, phrases }, null, 1));
  else {
    for (const k of ['forbidden', 'unknown']) for (const i of res[k]) console.log(`${k === 'forbidden' ? 'BLOCKED' : 'spell  '} ${i.file}:${i.line}:${i.col}  ${i.word}`);
    for (const h of phrases) console.log(`BLOCKED ${h.file} ${h.where}  "${h.phrase}"  ${h.text}`);
    console.log(`text lint: ${res.forbidden.length} blocked word(s), ${phrases.length} blocked phrase(s), ${res.unknown.length} unknown word(s) in ${TEXT_GLOBS.join(', ')}`);
    console.log('Invented names go in tools/text_lint/kilumen-words.txt; real typos should be fixed in the text.');
  }
  if (process.argv.includes('--strict') && (res.forbidden.length || phrases.length || res.unknown.length)) process.exit(1);
}
