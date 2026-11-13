// Local transport: BroadcastChannel, one channel per zone shard. Two tabs (or windows) of the same
// browser see each other with no server at all. Presence is done by hand: hello on join, a heartbeat,
// bye on leave, and a timeout for tabs that vanish. Same message shapes as the Supabase transport.
import { Transport } from './transport.js';

export class LocalTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.makeChannel = opts.makeChannel || ((name) => new BroadcastChannel(name));
    this.setTimer = opts.setInterval || ((fn, ms) => setInterval(fn, ms));
    this.clearTimer = opts.clearInterval || ((t) => clearInterval(t));
    this.bc = null; this.timer = null; this.seen = new Map();
  }
  get kind() { return 'local'; }
  async _join(name) {
    await this.leave();
    const bc = this.bc = this.makeChannel(`kilumen-online:${name}`);
    bc.onmessage = (e) => this._onMessage(e.data);
    this._post({ k: 'hello', from: this.id, meta: this.meta });
    this.timer = this.setTimer(() => this._beat(), this.profile.heartbeatMs);
    this.timer?.unref?.();
  }
  _beat() {
    this._post({ k: 'hb', from: this.id, meta: this.meta });
    const now = this.now();
    for (const [id, t] of this.seen) if (now - t > this.profile.peerTimeoutMs) { this.seen.delete(id); this._dropPeer(id); }
  }
  _post(m) { try { this.bc?.postMessage(m); } catch (e) { console.error('online local:', e); } }
  _onMessage(m) {
    if (!m || typeof m !== 'object' || typeof m.from !== 'string' || m.from === this.id) return;
    if (m.k === 'hello' || m.k === 'hb') {
      const isNew = !this._peers.has(m.from);
      this.seen.set(m.from, this.now());
      this._upsertPeer(m.from, sanitiseMeta(m.meta));
      if (m.k === 'hello' && isNew) this._post({ k: 'hello', from: this.id, meta: this.meta }); // let the newcomer see us
    } else if (m.k === 'bye') { this.seen.delete(m.from); this._dropPeer(m.from); }
    else if (m.k === 'msg' && typeof m.type === 'string') { this.seen.set(m.from, this.now()); this._deliver(m.type, m.from, m.payload); }
  }
  send(type, payload) { this._post({ k: 'msg', from: this.id, type, payload }); }
  setMeta(meta) { super.setMeta(meta); if (this.bc) this._post({ k: 'hb', from: this.id, meta: this.meta }); }
  async leave() {
    if (this.timer != null) { this.clearTimer(this.timer); this.timer = null; }
    if (this.bc) { this._post({ k: 'bye', from: this.id }); try { this.bc.close(); } catch { /* closed */ } this.bc = null; }
    for (const id of [...this._peers.keys()]) this._dropPeer(id);
    this.seen.clear();
    if (this.channel) this.emit('status', { state: 'left', channel: this.channel, shard: this.shard });
    this.channel = null;
  }
}

/** Only known, small fields from a peer's meta; never trust another tab's object as-is. */
export function sanitiseMeta(m) {
  const o = {};
  if (m && typeof m === 'object') {
    if (typeof m.name === 'string') o.name = m.name.slice(0, 40);
    if (typeof m.map === 'string') o.map = m.map.slice(0, 64);
    if (Number.isFinite(m.joinedAt)) o.joinedAt = m.joinedAt;
    if (typeof m.platform === 'string') o.platform = m.platform === 'mobile' ? 'mobile' : 'pc';
    o.freeText = m.freeText === true;
  }
  return o;
}
