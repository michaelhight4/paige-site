// Transport interface for online play. Two implementations share it:
//   local_transport.js    BroadcastChannel, same browser only (tabs/windows). Works offline, no server.
//   supabase_transport.js Supabase Realtime presence + broadcast. Code only; off unless configured.
// The game (online.js) only talks to this interface, so a Colyseus or boardgame.io transport can be
// added later without touching the game side.
//
// Events (on/off):
//   'peer'   { id, meta, isNew }   a player joined the channel or changed their meta (name, map)
//   'leave'  { id }                a player left or timed out
//   'msg'    { type, from, payload, recv }   a broadcast from another player ('pos', 'qc', 'say')
//   'status' { state, channel, shard, reason? }  joining | joined | full | left | error
// Methods: joinZone(zone, meta), leave(), send(type, payload), setMeta(meta), peers(), close()
import { rankIn } from './net.js';

export class Transport {
  constructor({ id, profile, now = () => performance.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
    this.id = id; this.profile = profile; this.now = now; this.sleep = sleep;
    this._h = new Map(); this._peers = new Map(); this.channel = null; this.shard = 0; this.meta = {};
    this.dropFrom = () => false; // safety hook: messages from these ids are dropped at the transport
  }
  get kind() { return 'abstract'; }
  on(ev, fn) { if (!this._h.has(ev)) this._h.set(ev, new Set()); this._h.get(ev).add(fn); return () => this.off(ev, fn); }
  off(ev, fn) { this._h.get(ev)?.delete(fn); }
  emit(ev, data) { for (const fn of this._h.get(ev) || []) { try { fn(data); } catch (e) { console.error('online:', e); } } }
  peers() { return [...this._peers.entries()].map(([id, meta]) => ({ id, ...meta })); }

  /**
   * Join the zone's channel. Players are capped per channel: after a short listen, a joiner ranked
   * past the cap moves on to the next shard ("route1#2"). Resolves with the channel name joined.
   */
  async joinZone(zone, meta) {
    const cap = this.profile.capPerChannel, maxShards = this.profile.maxShards;
    this.meta = { ...meta, joinedAt: Date.now() };
    for (let shard = 1; shard <= maxShards; shard++) {
      const name = `${zone}#${shard}`;
      this.emit('status', { state: 'joining', channel: name, shard });
      await this._join(name);
      await this.sleep(this.profile.joinGraceMs);
      if (rankIn(this.peers(), { id: this.id, joinedAt: this.meta.joinedAt }) < cap) {
        this.channel = name; this.shard = shard;
        this.emit('status', { state: 'joined', channel: name, shard });
        return name;
      }
      await this.leave();
    }
    this.emit('status', { state: 'full', channel: zone, shard: 0, reason: 'all shards full' });
    return null;
  }
  async _join() { throw new Error('not implemented'); }
  async leave() {}
  send() {}
  setMeta(meta) { this.meta = { ...this.meta, ...meta }; }
  close() { return this.leave(); }

  // shared helpers for implementations
  _upsertPeer(id, meta) {
    if (id === this.id) return;
    const isNew = !this._peers.has(id);
    // Player cap: once we are settled in a channel, newcomers past the cap are ignored (they rank
    // after everyone here, so their own joinZone moves them on to the next shard).
    if (isNew && this.channel && this._peers.size >= this.profile.capPerChannel - 1) return;
    this._peers.set(id, { ...this._peers.get(id), ...meta });
    this.emit('peer', { id, meta: this._peers.get(id), isNew });
  }
  _dropPeer(id) { if (this._peers.delete(id)) this.emit('leave', { id }); }
  _deliver(type, from, payload) {
    if (from === this.id || this.dropFrom(from) || !this._peers.has(from)) return;
    this.emit('msg', { type, from, payload, recv: this.now() });
  }
}
