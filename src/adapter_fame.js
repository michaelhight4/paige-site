import * as Fame from './fame.js';
export const fameApi = {
  getFame() { return Fame.status(this.s); },
  fameTake(id) { const n0 = this.mark(); if (!this.s.alive) return this.res(false, 'Not available.', n0); const r = Fame.take(this.s, id); return this.res(!!r.ok, r.msg, n0, r); },
};
