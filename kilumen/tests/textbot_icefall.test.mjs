import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addTextbot, fallbackText, loadTextbot } from '../src/region9/textbot.js';
import { FB } from '../src/region9/text_fallback.js';
const J = JSON.parse(readFileSync(new URL('../data/textbot_icefall.json', import.meta.url), 'utf8'));
const keys = Object.keys(J).filter((k) => !k.startsWith('_'));
test('textbot_icefall: 16 icefall keys, each resolves to the Text Bot text over the fallback', async () => {
  assert.equal(keys.length, 16);
  for (const k of keys) assert.ok(/^r9\.(icefall_|ic\.)/.test(k), k);
  await loadTextbot(async (u) => ({ ok: true, json: async () => JSON.parse(readFileSync(new URL('../' + u, import.meta.url), 'utf8')) }));
  for (const k of keys) assert.deepEqual(fallbackText(k), J[k], k);
  const other = Object.keys(FB).find((k) => !(k in J));
  assert.deepEqual(fallbackText(other), FB[other], 'missing keys still fall back');
  addTextbot({ _status: 'x' }); assert.equal(fallbackText('_status').length, 0);
});
test('textbot_icefall: no blocked words', () => {
  const bad = /\b(pp|shiny|super effective|pok[eé]dex|pok[eé] ?ball|gotcha|nurse|weed|tonic|route|elite|beer|wine|ale|whisky|whiskey|vodka|drunk|booze|drugs?|smok\w*|cigar\w*)\b/i;
  for (const k of keys) for (const line of J[k]) assert.ok(!bad.test(line), `${k}: ${line}`);
});
