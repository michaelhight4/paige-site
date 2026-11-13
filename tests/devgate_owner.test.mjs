// Owner-only dev menu gate (v0.2.39): mocked Supabase server responses (no real sign-in in tests).
import test from 'node:test'; import assert from 'node:assert/strict';
const { checkDevAccess, hasSessionHint } = await import(process.env.DEVGATE || '/workspace/ps_clone/kilumen/src/dev/devgate.js');
const lib = (user, me, err = null) => async () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, rpc: async (n) => { assert.equal(n, 'admin_me'); return { data: me, error: err }; } }) });
const U = { id: 'u', email: 'x@y', is_anonymous: false };
test('owner passes the auto (owner-only) check', async () => assert.equal((await checkDevAccess(['owner'], lib(U, { role: 'owner' }))).ok, true));
test('admin is refused without ?dev=1, allowed with it', async () => {
  assert.equal((await checkDevAccess(['owner'], lib(U, { role: 'admin' }))).ok, false);
  assert.equal((await checkDevAccess(['owner', 'admin'], lib(U, { role: 'admin' }))).ok, true);
});
test('player / guest / signed out / server error / lib failure are refused', async () => {
  assert.equal((await checkDevAccess(['owner'], lib(U, null))).reason, 'not_admin');
  assert.equal((await checkDevAccess(['owner'], lib({ ...U, is_anonymous: true }, { role: 'owner' }))).reason, 'guest_account');
  assert.equal((await checkDevAccess(['owner'], lib(null, { role: 'owner' }))).reason, 'not_signed_in');
  assert.equal((await checkDevAccess(['owner'], lib(U, null, { message: 'x' }))).reason, 'check_failed');
  assert.equal((await checkDevAccess(['owner'], async () => { throw new Error('offline'); })).ok, false);
});
test('a forged client role cannot pass (only the rpc answer counts)', async () => {
  globalThis.KILUMEN_ROLE = 'owner'; assert.equal((await checkDevAccess(['owner'], lib({ ...U, role: 'owner', user_metadata: { role: 'owner' } }, { role: 'player' }))).ok, false);
});
test('session hint', () => {
  const st = (keys) => ({ length: keys.length, key: (i) => keys[i] });
  assert.equal(hasSessionHint(st(['sb-kjdubkeowcyuoazvpoyt-auth-token'])), true);
  assert.equal(hasSessionHint(st(['kilumen_save', 'role'])), false);
});
