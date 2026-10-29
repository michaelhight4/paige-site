// Expected catches per 100 clean casts, every rod x bait on one map (design/FISHING_GEAR.md §6). node tools/fishing/sim_gear.mjs [map]
import { readFileSync } from 'node:fs';
import { ROD_TIERS, BAIT_IDS, expectedPer100 } from '../../src/fishing/logic.js';
const d = JSON.parse(readFileSync(new URL('../../data/fishing_tables.json', import.meta.url)));
const map = process.argv[2] || 'lanternport';
console.log(`| Rod | Bait | Bite | Bites/100 | Common | Uncommon | Rare |\n|---|---|---|---|---|---|---|`);
for (const r of ROD_TIERS) for (const b of [null, ...BAIT_IDS]) { const e = expectedPer100(d, map, r, b);
  console.log(`| ${r.id} | ${b || 'none'} | ${e.bite.toFixed(2)} | ${e.bites.toFixed(0)} | ${e.common.toFixed(1)} | ${e.uncommon.toFixed(1)} | ${e.rare.toFixed(2)} |`); }
