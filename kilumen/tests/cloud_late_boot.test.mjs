// v0.2.88 load fix: a cloud check that finishes after the boot went on must not write the local save, ask, or upload over a different playthrough.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootCloudSave } from '../src/net/cloud_save.js';
const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };
const base = (local, cloud, late) => ({ storage: mem({ k: JSON.stringify(local) }), key: 'k', isLoadable: () => true, device: 'pc', session: async () => ({ token: 't', uid: 'u' }),
  api: { meta: async () => cloud && { saveId: cloud.saveId, savedAt: cloud.savedAt }, data: async () => cloud, put: async () => ({}) }, ls: mem(), late: () => late, ask: async () => { throw new Error('asked'); }, locked: () => false });
test('late + newer same playthrough: no write, reason late', async () => {
  const o = base({ saveId: 'a', savedAt: 1 }, { saveId: 'a', savedAt: 5 }, true); const r = await bootCloudSave(o);
  assert.equal(r.reason, 'late'); assert.equal(r.action, 'download'); assert.equal(JSON.parse(o.storage.getItem('k')).savedAt, 1); assert.equal(r.uploader, undefined);
});
test('late + different playthrough: never asks', async () => {
  const r = await bootCloudSave(base({ saveId: 'a', savedAt: 1 }, { saveId: 'b', savedAt: 5 }, true)); assert.equal(r.reason, 'late'); assert.equal(r.action, 'ask');
});
test('late + local newer: still uploads', async () => {
  const r = await bootCloudSave(base({ saveId: 'a', savedAt: 9 }, { saveId: 'a', savedAt: 5 }, true)); assert.equal(r.ok, true); assert.equal(r.action, 'upload'); assert.ok(r.uploader);
});
test('in time: download as before', async () => {
  const o = base({ saveId: 'a', savedAt: 1 }, { saveId: 'a', savedAt: 5 }, false); const r = await bootCloudSave(o);
  assert.equal(r.action, 'download'); assert.equal(JSON.parse(o.storage.getItem('k')).savedAt, 5);
});
