// Gary Nov 5 2026: Set out spends Adventure only — never Actions.
import fs from 'fs';
import { loadPack } from '../src/pack.js';
import * as E from '../src/bw_engine.js';

const pack = await loadPack(async (f) => JSON.parse(fs.readFileSync(new URL('../data_fantasy/' + f, import.meta.url))));
E.setPack(pack);

const f = E.rollFate(4242, {}, { race: 'elf', rerolls: 0 });
f.wealth = 'common';
const s = E.begin(f, {});
s.age = 15; // cage 15
s.budget = { act: 0, social: 3, adv: 5 };
s.pending = [];

if (!E.canAdventure(s)) {
  console.error('FAIL: canAdventure false with act=0 adv=5 age=15', { act: s.budget.act, adv: s.budget.adv, cage: E.cage(s) });
  process.exit(1);
}
const beforeAct = s.budget.act;
const beforeAdv = s.budget.adv;
const r = E.adventure(s);
if (!r?.ok) {
  console.error('FAIL: adventure rejected', r);
  process.exit(1);
}
if (s.budget.act !== beforeAct) {
  console.error('FAIL: Actions changed', { beforeAct, after: s.budget.act });
  process.exit(1);
}
if (s.budget.adv !== beforeAdv - 1) {
  console.error('FAIL: Adventures did not drop by 1', { beforeAdv, after: s.budget.adv });
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, act: s.budget.act, adv: s.budget.adv, msg: r.msg || 'ok' }));
console.log('ADVENTURE_ACTS_INDEPENDENT PASS');
