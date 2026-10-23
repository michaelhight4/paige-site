// RITA voice playback (coder, Oct 23 2026; Gary 2:29 PM CT: "add RITA for region one since her voices are built already",
// 2:33 PM CT: "add ritas voice to region one then update our game"). Plays the pre-rendered clips from
// tools/build_rita_voice.py (assets/audio/rita/manifest.json + <kind>_<hash>.ogg|m4a) for the page RITA's strip shows.
// Rules:
// - Exact variant: company_voice.js records the key it picked (cv.current.voice.key, e.g. first_catch_3) and the unfilled
//   page text; we only speak when manifest.lines[key].pages[i].src equals that text. Anything else (FALLBACK text, a line
//   Text Bot changed since the build, a slot value with no clip, a region not built) = silent text, as before.
// - One page at a time: a new page / hide / mode off stops the current voice first (no overlap). Never blocks input
//   (A / F / tap still advance at once); the strip's auto-advance timer is stretched to the voice length.
// - Audio only after the first gesture (audio.js unlock): nothing is fetched before that; the manifest loads lazily,
//   clips load on demand per page (digits prefetched), decoded buffers are cached.
// - Volume: through audio.voiceOut() (howler master gain: master volume + mute). Own toggle 'RITA voice' (Options, default
//   on, localStorage kilumen.ritaVoice.v1). ?ritavoice=0 skips it entirely.
// - Cache: fetches carry no query on purpose; the alpha build's fetch wrapper (src/alpha.js ALPHA_FETCH_V) adds ?v=<build>.
//   Clip files are content-hashed, so a stale clip can never be paired with a new manifest.
export const VOICE_KEY = 'kilumen_alpha_ritaVoice.v2';
export const NUMBER_SLOTS = ['count', 'level', 'rank'];
export const WAIT_MS = 1500; // a page whose clips are still loading waits up to this long (Gary 3:29 PM CT: first page silent after a catch)
export const PAGE_TAIL_MS = 500; // strip stays this long after the voice ends (auto-advance)
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

export function loadVoiceOn(storage) {
  try { const v = JSON.parse(storage?.getItem(VOICE_KEY) || 'null'); if (typeof v?.on === 'boolean') return v.on; } catch { /* bad json */ }
  return true;
}

/** Manifest page for the shown page, or null (silent). pick = cv.current.voice {key, raw, vars}. */
export function pageFor(manifest, pick, pageIndex) {
  const line = pick?.key && manifest?.lines?.[pick.key];
  const page = line?.pages?.[pageIndex];
  if (!page || pick.raw?.[pageIndex] == null || page.src !== String(pick.raw[pageIndex])) return null;
  return page;
}

/** Page -> [{c: stem} | {p: gap ms}] with slots filled from vars, or null when any slot has no clip. */
export function sequenceFor(manifest, page, vars = {}) {
  const out = [], gaps = manifest.gaps || {};
  const push = (x) => { if (x.c && out.length && out[out.length - 1].c) out.push({ p: gaps.word ?? 70 }); out.push(x); };
  for (const seg of page.segs || []) {
    if (seg.c) push({ c: seg.c });
    else if (seg.p != null) out.push({ p: seg.p });
    else if (seg.s === 'employee_id') {
      const id = String(vars.employee_id ?? '');
      const w = manifest.id_words?.[id]; // 'Trainer 1' (Gary 3:31 PM CT): one clip instead of digits
      if (w) { push({ c: w }); continue; }
      if (!/^\d+$/.test(id)) return null;
      [...id].forEach((ch, i) => { if (i) out.push({ p: gaps.digit ?? 40 }); else if (out.length && out[out.length - 1].c) out.push({ p: gaps.word ?? 70 }); out.push({ c: manifest.digits?.[ch] }); });
      if (out.some((x) => 'c' in x && !x.c)) return null;
    } else if (NUMBER_SLOTS.includes(seg.s)) {
      const c = manifest.numbers?.[String(vars[seg.s])]; if (!c) return null; push({ c });
    } else {
      const v = vars[seg.s]; const c = v != null && manifest.names?.[seg.s]?.[norm(v)]; if (!c) return null; push({ c });
    }
  }
  return out.length ? out : null;
}

/** Play plan for what the strip shows now: {seq, stems, key} or null (silent). */
export function planFor(manifest, current) {
  if (!manifest || !current) return null;
  let pick = current.voice, i = current.page;
  while (pick?.then !== undefined && pick.n != null && i >= pick.n) { i -= pick.n; pick = pick.then; } // Trainer 1 intro chain
  const page = pageFor(manifest, pick, i);
  const seq = page && sequenceFor(manifest, page, pick?.vars || {});
  return seq ? { key: pick.key, seq, stems: [...new Set(seq.filter((x) => x.c).map((x) => x.c))] } : null;
}

/** Total ms of a sequence given clip ms. */
export function sequenceMs(manifest, seq) { return seq.reduce((t, x) => t + (x.c ? (manifest.clips?.[x.c]?.ms || 0) : x.p), 0); }

export class RitaVoice {
  /** opts: {audio: () => audio api, storage, fetch, base, doc, win} */
  constructor(cv, opts = {}) {
    this.cv = cv; this.opts = opts;
    this.storage = opts.storage ?? null;
    this.on = loadVoiceOn(this.storage);
    this.base = opts.base || 'assets/audio/rita/';
    this.fetch = opts.fetch || ((u) => globalThis.fetch(u));
    this.manifest = null; this._mf = null; this.buffers = new Map(); this.sources = []; this.token = 0; this.last = null;
    this.fmt = null;
  }
  audio() { return this.opts.audio?.() || null; }
  setOn(v) { this.on = !!v; try { this.storage?.setItem(VOICE_KEY, JSON.stringify({ on: this.on })); } catch { /* private mode */ } if (!this.on) this.stop('off'); return this.on; }
  toggle() { return this.setOn(!this.on); }
  label() { return this.on ? 'On' : 'Off'; }
  /** Can we make sound right now? (toggle on, audio unlocked, not muted, master > 0, a voice bus exists) */
  ready() {
    const a = this.audio();
    if (!this.on || !a || !a.unlocked || a.settings?.muted || !(a.settings?.master > 0)) return null;
    if (typeof a.voiceOut !== 'function') return null;
    const out = a.voiceOut(); return out ? { a, out, ctx: out.context } : null;
  }
  loadManifest() {
    this._mf ||= this.fetch(this.base + 'manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => { this.manifest = m; return m; }).catch(() => null);
    return this._mf;
  }
  format(ctx) {
    if (this.fmt) return this.fmt;
    let ogg = '';
    try { ogg = (this.opts.doc || globalThis.document)?.createElement('audio').canPlayType('audio/ogg; codecs=opus') || ''; } catch { ogg = ''; }
    return (this.fmt = ogg ? 'ogg' : 'm4a');
  }
  async buffer(ctx, stem) {
    const k = stem; if (this.buffers.has(k)) return this.buffers.get(k);
    const p = (async () => {
      const get = async (ext) => { const r = await this.fetch(this.base + stem + '.' + ext); if (!r.ok) throw new Error('http ' + r.status); return ctx.decodeAudioData(await r.arrayBuffer()); };
      try { return await get(this.format(ctx)); } catch { if (this.fmt === 'ogg') { try { const b = await get('m4a'); this.fmt = 'm4a'; return b; } catch { /* below */ } } return null; }
    })();
    this.buffers.set(k, p);
    const b = await p; if (!b) this.buffers.delete(k); return b;
  }
  stop(why = 'stop') {
    this.token++;
    for (const s of this.sources) { try { s.stop(); } catch { /* already done */ } try { s.disconnect(); } catch { /* */ } }
    this.sources = []; this.lastStop = why;
  }
  /** Called by company_voice.js on every page shown. */
  async onPage(current) {
    this.stop('page');
    const tok = this.token; let r = this.ready();
    for (let i = 0; !r && i < WAIT_MS / 100 && this.on && this.audio()?.unlocked; i++) { await new Promise((ok) => setTimeout(ok, 100)); if (tok !== this.token) return false; r = this.ready(); }
    if (!r) { this.last = { key: current?.voice?.key || null, spoke: false, why: 'not ready' }; return false; }
    const m = this.manifest || await this.loadManifest();
    if (tok !== this.token) return false;
    const plan = planFor(m, current);
    if (!plan) { this.last = { key: current?.voice?.key || null, spoke: false, why: 'no clip (text only)' }; return false; }
    try { current.pageEnd = Math.max(current.pageEnd, this.cv.now() + WAIT_MS); } catch { /* */ } // hold the page while its clips load
    this.prefetchPages(r.ctx, m, current);
    let bufs = await Promise.all(plan.stems.map((s) => this.buffer(r.ctx, s)));
    if (tok === this.token && bufs.some((b) => !b)) bufs = await Promise.all(plan.stems.map((s) => this.buffer(r.ctx, s))); // one retry
    if (tok !== this.token || this.cv.current !== current) return false; // page moved on while loading
    if (bufs.some((b) => !b)) { this.last = { key: plan.key, spoke: false, why: 'clip load failed (text only)' }; return false; }
    const by = new Map(plan.stems.map((s, i) => [s, bufs[i]]));
    const out = this.ready()?.out; if (!out) return false;
    let t = r.ctx.currentTime + 0.04; const t0 = t;
    for (const x of plan.seq) {
      if (x.c) { const src = r.ctx.createBufferSource(); src.buffer = by.get(x.c); src.connect(out); src.start(t); t += src.buffer.duration; this.sources.push(src); }
      else t += x.p / 1000;
    }
    const ms = Math.round((t - t0) * 1000);
    try { current.pageEnd = Math.max(current.pageEnd, this.cv.now() + ms + PAGE_TAIL_MS); } catch { /* */ }
    this.last = { key: plan.key, page: current.page, spoke: true, ms, clips: plan.seq.filter((x) => x.c).length };
    return true;
  }
  /** Warm every page of the shown message (page 2 is ready before page 1 ends). */
  prefetchPages(ctx, m, current) {
    for (let i = 0; i < (current?.pages?.length || 0); i++) { if (i === current.page) continue; const p = planFor(m, { ...current, page: i }); for (const s of p?.stems || []) this.buffer(ctx, s).catch(() => {}); }
  }
  /** Event accepted into the queue: load the clips of its line variants (+ digits) now, before the strip shows (cap 24). */
  prefetchEvent(name) {
    const r = this.ready(); if (!r) return;
    this.loadManifest().then((m) => {
      if (!m?.lines) return;
      const base = this.cv.cfg?.events?.[name]?.line || name, stems = new Set([...Object.values(m.digits || {}), ...Object.values(m.id_words || {})]);
      if (!this.cv.scene?.seen?.['cv#trainer1']) for (const p of m.lines.rita_trainer1?.pages || []) for (const sg of p.segs || []) if (sg.c) stems.add(sg.c);
      for (const [k, line] of Object.entries(m.lines)) {
        if (k !== base && !new RegExp('^' + base + '_\\d+$').test(k)) continue;
        for (const p of line.pages || []) for (const sg of p.segs || []) if (sg.c) stems.add(sg.c);
      }
      [...stems].slice(0, 24).forEach((s) => this.buffer(r.ctx, s).catch(() => {}));
    }).catch(() => {});
  }
  state() { return { on: this.on, manifest: !!this.manifest, cached: this.buffers.size, playing: this.sources.length, last: this.last }; }
}

/** Wire to a CompanyVoice. Prefetches the manifest + digit clips once audio is unlocked (first gesture). */
export function attachRitaVoice(cv, opts = {}) {
  if (!cv || cv.ritaVoice) return cv?.ritaVoice || null;
  let storage = opts.storage; if (storage === undefined) { try { storage = globalThis.localStorage || null; } catch { storage = null; } }
  const rv = new RitaVoice(cv, { ...opts, storage });
  cv.ritaVoice = rv;
  cv.onPage = (c) => { rv.onPage(c).catch(() => { /* silent text */ }); };
  cv.onHide = (why) => rv.stop('hide:' + why);
  if (typeof cv.emit === 'function') { const emit = cv.emit.bind(cv); cv.emit = (name, ctx) => { const ok = emit(name, ctx); if (ok) { try { rv.prefetchEvent(name); } catch { /* never break the game */ } } return ok; }; }
  const win = opts.win || globalThis.window;
  let warmed = false;
  const warm = () => {
    const r = !warmed && rv.ready(); if (!r) return;
    warmed = true; win?.removeEventListener?.('pointerup', kick, true); win?.removeEventListener?.('keydown', kick, true);
    rv.loadManifest().then((m) => { if (m?.digits) for (const s of Object.values(m.digits)) rv.buffer(r.ctx, s).catch(() => {}); });
  };
  const kick = () => setTimeout(warm, 50); // after audio.js's own unlock handler ran
  win?.addEventListener?.('pointerup', kick, true); win?.addEventListener?.('keydown', kick, true);
  return rv;
}
