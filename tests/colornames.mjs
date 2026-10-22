// No numbered colour labels ("Colour 3", "Color 2", 'Colours ' + n) anywhere in UI/source/data; swatches get real names. node tests/colornames.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { colorName, paletteName } from '../ui/js/colorname.js'; import { LOGO } from '../src/franchise.js';
const root = new URL('..', import.meta.url).pathname; const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', '.git', 'vendor', 'tests', 'tools', 'art', 'assets'].includes(f.name)) continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|json|html)$/.test(f.name)) files.push(p); } };
walk(path.join(root, 'ui')); walk(path.join(root, 'src')); walk(path.join(root, 'data'));
const bad = []; const re = /['"`]\s*Colou?rs?\s*['"`]\s*\+|Colou?rs?\s+\d|Colou?rs?\s*\$\{|colou?r\s*#\d|'Colou?rs? '\s*\+/i;
for (const f of files) { const t = fs.readFileSync(f, 'utf8'); t.split('\n').forEach((l, i) => { if (re.test(l) && !/colorname\.js/.test(f)) bad.push(`${path.relative(root, f)}:${i + 1}: ${l.trim().slice(0, 90)}`); }); }
assert.deepEqual(bad, [], 'numbered colour labels remain:\n' + bad.join('\n')); console.log('  ok - no numbered colour labels in ' + files.length + ' files');
assert.equal(colorName('#d94a4a').includes('Colour'), false); assert.equal(colorName('#1b2a5e'), 'Navy'); assert.equal(colorName('#3a9d5d'), 'Green'); assert.equal(colorName('#b0182c'), 'Crimson'); console.log('  ok - hex -> real names (Navy, Green, Crimson)');
for (const p of LOGO.palettes) { const n = paletteName(p); assert.ok(n && !/\d/.test(n), n); } console.log('  ok - every team/logo palette has a real name: ' + LOGO.palettes.map(paletteName).join(' | '));
console.log('PASS colornames');
