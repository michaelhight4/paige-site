// Supabase Realtime transport (stage 1). CODE ONLY: not connected to any project in this pass.
// Presence = who is in the zone channel (name, map); Broadcast = positions and chat (fire-and-forget).
// Per Supabase docs, presence is for slow-changing state and broadcast for frequent updates, so
// positions never go through track(). Channels are private (RLS on realtime.messages, see
// supabase/migrations_proposed/) and players sign in anonymously, so every player has an auth uid.
// Loads supabase-js 2.118.0 (MIT) lazily from src/vendor/supabase-js/ only when this transport is used.
import { Transport } from './transport.js';
import { sanitiseMeta } from './local_transport.js';
import { checkPublicKey } from './config.js';

const UMD_URL = new URL('../vendor/supabase-js/supabase.js', import.meta.url).href;

function loadUmd() {
  if (globalThis.supabase?.createClient) return Promise.resolve(globalThis.supabase);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = UMD_URL; s.async = true;
    s.onload = () => (globalThis.supabase?.createClient ? resolve(globalThis.supabase) : reject(new Error('supabase-js did not load')));
    s.onerror = () => reject(new Error('supabase-js failed to load'));
    document.head.appendChild(s);
  });
}

export class SupabaseTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    const k = checkPublicKey(opts.key);
    if (!k.ok) throw new Error(`refusing Supabase key: ${k.reason}`);
    this.url = opts.url; this.key = opts.key; this.createClient = opts.createClient || null;
    this.client = null; this.ch = null;
  }
  get kind() { return 'supabase'; }
  /** Sign in anonymously (if no session) so RLS can tell players apart. Returns the auth uid. */
  async connect() {
    const createClient = this.createClient || (await loadUmd()).createClient;
    this.client = createClient(this.url, this.key, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: Math.max(4, Math.ceil(this.profile.sendHz * 1.5)) } }, // client-side cap
    });
    let { data } = await this.client.auth.getSession();
    if (!data?.session) {
      const r = await this.client.auth.signInAnonymously(); // needs "Allow anonymous sign-ins" (stage 1 migration notes)
      if (r.error) throw r.error;
      data = { session: r.data.session };
    }
    await this.client.realtime.setAuth(data.session.access_token);
    this.id = data.session.user.id;
    // Stage-1 RLS (kilumen_private.online_ok) needs a players row; insert-if-missing, never overwrites ban fields.
    const up = await this.client.from('kilumen_online_players').upsert({ user_id: this.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (up?.error) console.warn('[online] player row:', up.error.message);
    return this.id;
  }
  async _join(name) {
    await this.leave();
    // name is 'zone:<id>#n' or 'map:<id>#n' -> topic 'kilumen:zone:<id>#n' (matches the RLS regex in
    // supabase/migrations_proposed/*_kilumen_online_stage1.sql)
    const topic = `kilumen:${String(name).toLowerCase().replace(/[^a-z0-9_:#]/g, '_')}`;
    const ch = this.ch = this.client.channel(topic, { config: { private: true, presence: { key: this.id }, broadcast: { self: false, ack: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState(), ids = new Set();
      for (const [id, metas] of Object.entries(state)) { ids.add(id); this._upsertPeer(id, sanitiseMeta(metas[metas.length - 1])); }
      for (const id of [...this._peers.keys()]) if (!ids.has(id)) this._dropPeer(id);
    });
    for (const ev of ['pos', 'qc', 'say', 'need']) ch.on('broadcast', { event: ev }, ({ payload }) => this._deliver(ev, payload?.from, payload?.d));
    await new Promise((resolve, reject) => {
      ch.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') { await ch.track(this.meta); resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(err || new Error(status));
      });
    });
  }
  send(type, payload) { this.ch?.send({ type: 'broadcast', event: type, payload: { from: this.id, d: payload } }); }
  setMeta(meta) { super.setMeta(meta); this.ch?.track(this.meta); } // presence: only on map change, not per step
  /** Stage 2: file a report (table public.online_reports, migration 002). Not called in stage 1 builds. */
  async report({ reportedId, reason, evidence }) {
    const { error } = await this.client.from('online_reports').insert({ reported_id: reportedId, reason, evidence });
    if (error) throw error;
  }
  async leave() {
    if (this.ch) { try { await this.ch.untrack(); await this.client.removeChannel(this.ch); } catch { /* already gone */ } this.ch = null; }
    for (const id of [...this._peers.keys()]) this._dropPeer(id);
    if (this.channel) this.emit('status', { state: 'left', channel: this.channel, shard: this.shard });
    this.channel = null;
  }
}
