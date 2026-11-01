// Contacts regions 2-8 (Oct 31 2026): tips never repeat per save, per-contact + tip cooldowns, region caps, save shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pickPing, nextTip, tipId, contactWait, regionOf, rematchTeam, isHallNpc, rareSlot } from '../src/systems/contacts.js';
import { contactsDefault, normaliseContacts } from '../src/systems/contacts_save.js';
const data = JSON.parse(fs.readFileSync(new URL('../src/systems/data/contacts.json', import.meta.url)));
const lines = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url)));
const enc = JSON.parse(fs.readFileSync(new URL('../data/encounters_wired.json', import.meta.url)));
const keys = Object.keys(data.trainers);
const withList = (ks) => ({ ...contactsDefault(), list: ks.map((key) => ({ key })) });

test('regions 2-8 each have 1-2 named non-Master contacts with a cap and text', () => {
  for (let r = 2; r <= 8; r++) {
    const reg = data.regions[String(r)];
    assert.ok(reg && Number.isFinite(reg.cap) && reg.maps.length, 'region ' + r);
    const mine = keys.filter((k) => regionOf(data, k.split('.')[0])?.id === String(r));
    assert.ok(mine.length >= 1 && mine.length <= 2, `region ${r}: ${mine.length}`);
    for (const k of mine) {
      const [m, id] = k.split('.');
      assert.ok(!isHallNpc(k), k);
      assert.ok(lines.maps[m][id].name, k);
      for (const f of ['call', 'rematch_text', 'tip_text']) assert.ok(lines.system_contacts.trainers[m][id][f].pages.length, k + f);
    }
  }
});
test('every tip id is unique across all contacts and points at a grass table', () => {
  const ids = keys.flatMap((k) => data.trainers[k].tips.map((t) => tipId(t, k)));
  const own = keys.slice(5).flatMap((k) => data.trainers[k].tips.map((t) => tipId(t, k)));
  assert.equal(new Set(own).size, own.length);
  for (const id of new Set(ids)) assert.ok(rareSlot(enc, id.replace(/^rare:/, '')), id);
});
test('no tip ever repeats for a save, then contacts stop sending tips', () => {
  const s = withList(keys);
  const seen = [];
  let t = 0;
  for (let i = 0; i < 400; i++) {
    t += 10 * 1440;
    const p = pickPing(s, data, { map: 'nowhere', gameMin: t, rng: () => 0.99 });
    if (!p) continue;
    s.lastPing[p.key] = t;
    if (p.kind === 'rematch') { s.ready[p.key] = t; continue; }
    const id = tipId(p.tip, p.key);
    assert.ok(!seen.includes(id), 'repeat ' + id);
    seen.push(id); s.tipsUsed.push(id); s.lastTipAt = t;
  }
  const all = new Set(keys.flatMap((k) => data.trainers[k].tips.map((x) => tipId(x, k))));
  assert.equal(seen.length, all.size);
  for (const k of keys) assert.equal(nextTip(s, data.trainers[k], k), null);
  // survives a save round trip
  const back = normaliseContacts(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.tipsUsed, s.tipsUsed);
  assert.equal(pickPing({ ...back, ready: Object.fromEntries(keys.map((k) => [k, 1])) }, data, { map: 'x', gameMin: t + 1e6, rng: () => 0.5 }), null);
});
test('per-contact cooldown blocks the same contact; tip cooldown spaces tips out', () => {
  const k = 'route_coast.route_coast_trainer_4';
  const s = withList([k]);
  s.lastPing[k] = 1000;
  const cd = data.ping.contactCooldownGameMinutes;
  assert.ok(contactWait(s, data.ping, k, 1000 + cd - 1) > 0);
  assert.equal(pickPing(s, data, { map: 'x', gameMin: 1000 + cd - 1, rng: () => 0 }), null);
  assert.ok(pickPing(s, data, { map: 'x', gameMin: 1000 + cd, rng: () => 0 }));
  s.ready[k] = 1; s.lastTipAt = 5000; delete s.lastPing[k];
  assert.equal(pickPing(s, data, { map: 'x', gameMin: 5000 + data.ping.tipCooldownGameMinutes - 1, rng: () => 0 }), null);
  assert.equal(pickPing(s, data, { map: 'x', gameMin: 5000 + data.ping.tipCooldownGameMinutes, rng: () => 0 }).kind, 'tip');
});
test('rematches scale with progress inside the region cap', () => {
  const cap = data.regions['6'].cap;
  const base = [{ species: 'a', level: 46 }, { species: 'b', level: 47 }];
  const t0 = rematchTeam(base, { wins: 0, playerTop: 0, cap });
  const t3 = rematchTeam(base, { wins: 3, playerTop: 60, cap });
  assert.ok(t3[1].level > t0[1].level && t3[1].level <= cap && t0[1].level === 49);
});
test('old saves gain the new fields', () => {
  const v = normaliseContacts({ v: 1, list: [{ key: 'a.b' }] });
  assert.deepEqual(v.tipsUsed, []); assert.deepEqual(v.lastPing, {}); assert.equal(v.lastTipAt, -1);
});
