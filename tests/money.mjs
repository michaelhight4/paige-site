import assert from 'node:assert/strict'; import { fmtMoney } from '../src/fmt.js'; import { money as rm } from '../src/rng.js'; import { money as sm } from '../src/slice/core.js';
assert.equal(fmtMoney(1250000), '$1,250,000 (1.25 mil)'); assert.equal(fmtMoney(8500), '$8,500'); assert.equal(fmtMoney(-42000), '-$42,000 (42K)');
assert.equal(fmtMoney(3.2e9), '$3,200,000,000 (3.2 bill)'); assert.equal(fmtMoney(4.5e12), '$4,500,000,000,000 (4.5 trill)');
assert.equal(rm(2500000), '$2,500,000 (2.5 mil)'); assert.equal(sm({ terms: {} }, 15000), '$15,000 (15K)');
for (const m of ['advisor', 'brand', 'farm', 'franchise', 'racing', 'prodco', 'bankruptcy']) { const t = (await import('node:fs')).readFileSync(`src/${m}.js`, 'utf8'); assert.ok(/money = \(n\) => fmtMoney/.test(t), m + ' uses central formatter'); }
assert.equal(fmtMoney(2e15), '$2,000,000,000,000,000 (2 quad)'); assert.ok(/\(3 quint\)$/.test(fmtMoney(3e18))); assert.ok(/\(4 sext\)$/.test(fmtMoney(4e21))); assert.ok(/\(5 sept\)$/.test(fmtMoney(5e24)));
assert.ok(/\(6 oct\)$/.test(fmtMoney(6e27))); assert.ok(/\(7 non\)$/.test(fmtMoney(7e30))); assert.ok(/\(8 dec\)$/.test(fmtMoney(8e33))); assert.equal(fmtMoney(1.2e36), '$1.2e36');
assert.ok(/^\$1[0-9,]+ \(1 quint\)$/.test(fmtMoney(1e18)) && fmtMoney(1e18).split(',').length === 7, 'commas on the full float-based number');
assert.equal(fmtMoney(999999), '$999,999 (1000K)'.replace('1000K', '1 mil')) ;
const { fmtCompact } = await import('../src/fmt.js'); assert.equal(fmtCompact(9e6), '$9 mil'); assert.equal(fmtCompact(25000), '$25,000');
console.log('money: PASS');
