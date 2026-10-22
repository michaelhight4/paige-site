// Every job industry and special career has its own job.* icon (distinct art), and Sports/Coaching live under Special Careers. node tests/jobicons.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createRequire } from 'node:module';
import * as E from '../src/engine.js'; import { D } from '../src/data.js';
await E.loadData(); globalThis.window = globalThis; const req = createRequire(import.meta.url); req('../art/icon_data.js'); req('../art/icons.js');
const A = globalThis.LifeSimArt, J = A.iconData.job;
const resolve = (id) => { let e = J[id], n = 0; while (e && e.alias && n++ < 5) { const [c, k] = e.alias.split('.'); e = A.iconData[c][k]; } return e; };
const ids = [...D.sOcc.job_sectors.map((x) => x.id), ...D.sOcc.special.filter((x) => x.id !== 'athlete').map((x) => x.id), 'sports', 'coaching', 'military'];
for (const id of ids) assert.ok(resolve(id) && resolve(id).g, 'icon for ' + id);
const glyphs = ids.filter((x) => x !== 'sports').map((id) => resolve(id).g); assert.equal(new Set(glyphs).size, glyphs.length, 'each category has distinct art');
console.log(`  ok - ${ids.length} job categories each map to distinct art`);
const menu = JSON.parse(fs.readFileSync(new URL('../ui/data/ui_config.json', import.meta.url))).occupationMenu.map((m) => m.id);
assert.ok(menu.includes('special') && !menu.includes('sports') && !menu.includes('coaching'), 'sports + coaching moved under Special Careers');
const occ = fs.readFileSync(new URL('../ui/js/screens/occupation.js', import.meta.url), 'utf8'); assert.match(occ, /special-sports/); assert.match(occ, /sportsCareerTab/);
console.log('  ok - Sports tab (Pro Athlete + Coaching) is under Special Careers'); console.log('JOBICONS PASS');
