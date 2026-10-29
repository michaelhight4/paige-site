// RITA voice test panel for the dev console (v0.2.32, Gary: "test the voice lines from the ai assistant in game by clicking
// them to make sure they work without needing to manually trigger them in the game world"). Loaded only through
// dev/console.js (devgate: ?dev=1 + server-checked owner/admin). No keys, nothing saved.
// What it does: lists every system_company_voice line (base + variants _2.._9, specific keys, Trainer 1 intro), grouped by
// the company_voice.json event it belongs to, with region tag and search. Play = the game's real path: a CompanyVoice
// `current` record on cv, cv.view.show (the real RITA strip), cv.duckOn, cv.hookPage -> RitaVoice.onPage (real clip loader,
// planFor, voice bus); cv.tick then advances / hides it like any line. Status per line comes from the real planFor().
// Save rules: no cv.show() (that writes seen cv#trainer1 / cv#last#<base> and checkpoints), no scene.log entry, no flags;
// scene._dirty is put back after the preview hides, and the saveGuard blocks saving while the strip is up, as in the game.
import { planFor } from '../systems/rita_voice.js?v=v0.2.83-alpha';
import { CompanyVoice, ritaIdOf, TRAINER1_LINE } from '../systems/company_voice.js?v=v0.2.83-alpha';
import { employeeIdOf } from '../systems/employee_id.js?v=v0.2.83-alpha';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const title = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
const SKIP = new Set(['_section', 'speaker']);
export const SAMPLE = { level: '5', rank: '2', count: '5', node: 'Field Pay Rise', area: 'Brookhollow', master: 'Fernwick', trainer: 'Ron', quest: 'Promoted (Apparently)', creature: 'Tumbloam', new: 'Burrowmane' };

const rawOf = (v) => (Array.isArray(v) ? v : Array.isArray(v?.pages) ? v.pages : null);

/** Every RITA line -> [{key, base, event, region, raw}] grouped by event base (longest base prefix wins). */
export function ritaLines(lines, cfg) {
  const L = lines?.system_company_voice || {};
  const bases = new Map(); // base line key -> event name
  for (const [name, ev] of Object.entries(cfg?.events || {})) if (!bases.has(ev.line || name)) bases.set(ev.line || name, name);
  if (!bases.has(TRAINER1_LINE)) bases.set(TRAINER1_LINE, 'trainer1_intro');
  const sorted = [...bases.keys()].sort((a, b) => b.length - a.length);
  const out = [];
  for (const [key, v] of Object.entries(L)) {
    if (SKIP.has(key) || key.startsWith('_')) continue;
    const base = sorted.find((b) => key === b || key.startsWith(b + '_')) || '(no event)';
    out.push({ key, base, event: bases.get(base) || null, region: CompanyVoice.lineRegion(v), raw: rawOf(v) });
  }
  const order = [...bases.keys()];
  return out.sort((a, b) => (order.indexOf(a.base) + 1 || 999) - (order.indexOf(b.base) + 1 || 999) || a.key.localeCompare(b.key, 'en', { numeric: true }));
}

/** Sample slot values for a line (picked so a built clip exists when the manifest has one). */
export function sampleVars(row, manifest, scene) {
  const v = { ...SAMPLE, employee_id: row.key === TRAINER1_LINE || row.base === TRAINER1_LINE ? employeeIdOf(scene) : ritaIdOf(scene) };
  const m = /^kilindex_milestone_(\d+)/.exec(row.key); if (m) v.count = m[1];
  const nums = Object.keys(manifest?.numbers || {}); if (!m && nums.length && !nums.includes(v.count)) v.count = nums[0];
  const tail = row.key.slice(row.base.length + 1).replace(/_\d+$/, '').replace(/_/g, ' ');
  for (const [slot, names] of Object.entries(manifest?.names || {})) {
    const list = Object.keys(names); if (!list.length) continue;
    const hit = tail && list.find((n) => n === tail || n.replace(/ /g, '') === tail.replace(/ /g, ''));
    v[slot] = title(hit || (list.includes(String(v[slot] || '').toLowerCase()) ? v[slot] : list[0]));
  }
  return v;
}

export const fill = (p, vars) => String(p).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));

/** Static check -> {text: 'ok'|'missing'|'placeholder', audio: 'ok'|'partial'|'missing', why, pages, voice, stems} */
export function lineStatus(row, manifest, scene, maxPages = 3) {
  const raw = (row.raw || []).slice(0, maxPages);
  const vars = sampleVars(row, manifest, scene);
  const pages = raw.map((p) => fill(p, vars));
  const r = { pages, voice: { key: row.key, raw, vars }, stems: [], text: 'ok', audio: 'missing', why: '' };
  if (!raw.length || raw.some((p) => !String(p ?? '').trim())) { r.text = 'missing'; r.why = 'no text'; }
  else { const left = pages.join(' ').match(/\{\w+\}/g); if (left) { r.text = 'placeholder'; r.why = 'unresolved ' + [...new Set(left)].join(' '); } }
  if (!manifest) { r.why ||= 'voice manifest not loaded'; return r; }
  const ml = manifest.lines?.[row.key];
  let ok = 0;
  raw.forEach((_, i) => { const p = planFor(manifest, { voice: r.voice, page: i }); if (p) { ok++; r.stems.push(...p.stems); } });
  r.stems = [...new Set(r.stems)];
  if (raw.length && ok === raw.length) r.audio = 'ok';
  else {
    r.audio = ok ? 'partial' : 'missing';
    const a = !ml ? 'no clip built for this key' : (ml.pages || []).some((p, i) => p.src !== String(raw[i] ?? '')) ? 'clip text out of date (line changed since build)' : 'a slot value has no clip';
    r.why = r.why ? r.why + '; ' + a : a;
  }
  return r;
}

/** Regions the voice build covers (manifest.regions + its region parts); untagged lines (0) count as covered. */
export function voicedRegions(m) { const out = new Set([0]); for (const r of [...(m?.regions || []), ...Object.keys(m?.parts || {})]) { const n = Number(String(r).replace(/\D/g, '')); if (n) out.add(n); } return out; }

const CSS = `.krita .st{font-size:11px;padding:2px 6px;border-radius:6px;white-space:nowrap}.krita .ok{background:#1f5133}.krita .bad{background:#6e2c22}.krita .mid{background:#6a5a1e}
.krita .ln{font-size:12px;color:#c8d2ea}.krita .grp{position:sticky;top:-10px;background:#141a26;padding:6px 0;margin:0}`;

/** Panel controller for console.js. ctx: {scene, say(text, bad), close()} */
export function createRitaPanel({ scene, say }) {
  const st = { q: '', region: 'all', results: new Map(), running: false, stop: false, manifest: null, loading: null };
  const cv = () => scene.companyVoice || globalThis.window?.kilumen?.companyVoice || null;
  const rv = () => cv()?.ritaVoice || globalThis.window?.kilumen?.ritaVoice || null;
  const rows = () => ritaLines(scene.lines, cv()?.cfg);
  const maxPages = () => cv()?.cfg?.timing?.max_pages || 3;
  const loadManifest = () => (st.loading ||= (async () => { const v = rv(); if (!v) return null; await v.loadManifest(); await v.loadParts(); return (st.manifest = v.manifest); })().catch(() => null));

  /** Plays one line through the real strip + voice. Resolves {spoke, why, ms} once the strip has gone (or on stop). */
  async function play(row) {
    const c = cv(); if (!c) return { spoke: false, why: 'company voice is off (?cv=0)' };
    if (st.playing) { if (c.current?.devPreview) c.hide('dev_preview'); await st.playing.catch(() => {}); } // one preview at a time
    st.stop = false;
    const run = playOne(c, row); st.playing = run; try { return await run; } finally { if (st.playing === run) st.playing = null; }
  }
  async function playOne(c, row) {
    if (c.current) c.hide('dev_preview');
    const s = lineStatus(row, st.manifest, scene, maxPages());
    if (!s.pages.length) return { spoke: false, why: 'no text' };
    const dirty = scene._dirty, t = c.now(), v = rv();
    const cur = { name: row.event || row.base, ctx: {}, priority: 0, at: t, order: 0, pages: s.pages, page: 0, shownAt: t, pageEnd: t + c.pageMs(s.pages[0]), speaker: c.speaker(), voice: s.voice, devPreview: true };
    const spoken = []; const onPage = c.onPage;
    if (v) c.onPage = (p) => { spoken.push(v.onPage(p).then((ok) => ({ ok, last: v.last })).catch(() => ({ ok: false, last: { why: 'error' } }))); };
    const z = c.view?.el?.style.zIndex; if (c.view?.el) c.view.el.style.zIndex = '100001'; // above the console overlay
    c.current = cur; c.view?.show(cur); c.duckOn(); c.hookPage();
    while (c.current === cur && !st.stop) await new Promise((ok) => setTimeout(ok, 120));
    if (c.current === cur) c.hide('dev_stop');
    if (onPage) c.onPage = onPage; else delete c.onPage;
    if (c.view?.el) setTimeout(() => { if (!c.current) c.view.el.style.zIndex = z || ''; }, 300);
    if (!dirty) scene._dirty = false; // a preview never asks for a save
    const res = await Promise.all(spoken);
    const allOk = res.length >= s.pages.length && res.every((x) => x.ok);
    return { spoke: allOk, why: allOk ? '' : (res.find((x) => !x.ok)?.last?.why || (v ? 'page skipped' : 'RITA voice off (?ritavoice=0)')), pages: res.length };
  }
  /** Clip files load through the real loader (decoded) when audio is up, else a fetch of the file. */
  async function clipsLoad(stems) {
    const v = rv(); if (!v) return 'RITA voice off';
    const r = v.ready();
    for (const sm of stems) {
      if (r) { if (!(await v.buffer(r.ctx, sm))) return 'clip failed to load: ' + sm; }
      else { const f = v.format(); const ok = await v.fetch(v.base + sm + '.' + f).then((x) => x.ok).catch(() => false); if (!ok) return 'clip file missing: ' + sm + '.' + f; }
    }
    return '';
  }

  function verdict(row) {
    const s = lineStatus(row, st.manifest, scene, maxPages()), r = st.results.get(row.key);
    const out = s.text !== 'ok' ? ['bad', s.text === 'missing' ? 'text missing' : 'placeholder'] : s.audio === 'ok' ? ['ok', 'audio OK'] : ['mid', s.audio === 'partial' ? 'audio partial' : 'audio missing'];
    if (r && !r.ok) out.splice(0, 2, 'bad', 'FAILED');
    if (r?.ok && !r.note) out[1] += ' ✓';
    return { cls: out[0], label: out[1], s, r };
  }
  const visible = () => rows().filter((r) => (st.region === 'all' || String(r.region) === st.region) && (!st.q.trim() || [r.key, r.base, r.event, ...(r.raw || [])].some((x) => String(x ?? '').toLowerCase().includes(st.q.trim().toLowerCase()))));

  function render(body) {
    if (!document.getElementById('krita-style')) { const e = document.createElement('style'); e.id = 'krita-style'; e.textContent = CSS; document.head.appendChild(e); }
    const all = rows(), regions = [...new Set(all.map((r) => r.region))].sort((a, b) => a - b), maxR = cv()?.maxRegion;
    body.classList.add('krita');
    body.innerHTML = `<div class="kbar"><input type="search" placeholder="Search ${all.length} RITA lines (key, event or text)" value="${esc(st.q)}" data-rq></div>
<div class="kbar"><select data-rr><option value="all">All regions</option>${regions.map((r) => `<option value="${r}" ${String(r) === st.region ? 'selected' : ''}>${r ? 'Region ' + r : 'Untagged (all regions)'}</option>`).join('')}</select>
<button class="go" data-all>${st.running ? 'Running…' : 'Play all and check'}</button><button data-quick>Quick check (no sound)</button><button class="warn" data-stop>Stop</button></div>
<small>${cv() ? `Plays through the game's real RITA strip and voice (${rv() ? 'voice ' + rv().label() : 'voice not attached'}). Released up to region ${maxR}. Sample values fill {placeholders}. Nothing is saved.` : 'Company voice is off (?cv=0): nothing can play.'}</small>
<div data-sum></div><div data-list></div>`;
    const list = body.querySelector('[data-list]');
    const draw = () => {
      const vis = visible(); let h = '', g = null, n = { ok: 0, mid: 0, bad: 0 };
      for (const row of vis) {
        const v = verdict(row); n[v.cls]++; if (v.cls === 'mid' && !voicedRegions(st.manifest).has(row.region)) v.label += ' (not voiced yet)';
        if (row.base !== g) { g = row.base; h += `<h4 class="grp">${esc(row.event || row.base)} <small>(${esc(row.base)})</small></h4>`; }
        h += `<div class="row"><div class="n">${esc(row.key)} <small>${row.region ? 'region ' + row.region : 'untagged'}${maxR != null && row.region > maxR ? ' · not shipped' : ''}</small><div class="ln">${v.s.pages.map(esc).join(' / ') || '<i>(no text)</i>'}</div>${v.s.why || v.r?.why ? `<small>${esc([v.s.why, v.r?.why].filter(Boolean).join('; '))}</small>` : ''}</div><span class="st ${v.cls}">${esc(v.label)}</span><button class="go" data-play="${esc(row.key)}">Play</button></div>`;
      }
      list.innerHTML = h || '<div class="row"><small>No matches</small></div>';
      const fails = [...st.results.entries()].filter(([, r]) => !r.ok);
      body.querySelector('[data-sum]').innerHTML = `<h4>${vis.length} shown · audio OK ${n.ok} · audio missing/partial ${n.mid} · text problem/failed ${n.bad}${st.manifest ? '' : ' · (voice manifest not loaded yet)'}</h4>${fails.length ? `<div class="row"><div class="n"><b>Failures (${fails.length})</b><br><small>${fails.map(([k, r]) => esc(k + ': ' + r.why)).join('<br>')}</small></div></div>` : ''}`;
    };
    draw(); loadManifest().then(() => { if (body.isConnected) draw(); });
    const qi = body.querySelector('[data-rq]'); qi.oninput = () => { st.q = qi.value; draw(); };
    const rr = body.querySelector('[data-rr]'); rr.onchange = () => { st.region = rr.value; draw(); };
    const runAll = async (sound) => {
      if (st.running) return; st.running = true; st.stop = false; await loadManifest();
      const vis = visible(); let i = 0;
      for (const row of vis) {
        if (st.stop || !body.isConnected) break;
        i++; say(`${sound ? 'Playing' : 'Checking'} ${i}/${vis.length}: ${row.key}`);
        const s = lineStatus(row, st.manifest, scene, maxPages());
        const voiced = voicedRegions(st.manifest).has(row.region);
        let why = s.text !== 'ok' ? s.why : s.audio !== 'ok' && voiced ? 'audio: ' + s.why : '';
        if (!why && s.audio !== 'ok') { st.results.set(row.key, { ok: true, note: `no voice: region ${row.region} is not in the voice build` }); continue; }
        if (!why && sound) { const p = await play(row); if (!p.spoke) why = 'voice did not play: ' + p.why; }
        else if (!why) why = await clipsLoad(s.stems);
        st.results.set(row.key, { ok: !why, why }); if (i % 10 === 0 || why) draw();
      }
      st.running = false; draw();
      const f = vis.filter((r) => st.results.get(r.key) && !st.results.get(r.key).ok).length;
      say(`${st.stop ? 'Stopped' : 'Done'}: ${i} lines checked, ${f} failed.`, f > 0);
    };
    body.onclick = async (e) => {
      const d = e.target.dataset || {};
      if (d.play) { const row = rows().find((r) => r.key === d.play); if (!row) return; st.stop = false; await loadManifest(); say('Playing ' + row.key + '…'); const p = await play(row); const s = lineStatus(row, st.manifest, scene, maxPages()); const why = s.text !== 'ok' ? s.why : p.spoke ? '' : 'voice did not play: ' + p.why; st.results.set(row.key, { ok: !why, why }); say(why ? `${row.key}: ${why}` : `${row.key}: played OK (${p.pages} page${p.pages === 1 ? '' : 's'}).`, !!why); if (body.isConnected) draw(); }
      else if (e.target.hasAttribute('data-all')) runAll(true);
      else if (e.target.hasAttribute('data-quick')) runAll(false);
      else if (e.target.hasAttribute('data-stop')) { st.stop = true; cv()?.current?.devPreview && cv().hide('dev_stop'); }
    };
  }
  return { render, play, rows, status: (row) => lineStatus(row, st.manifest, scene, maxPages()), loadManifest, state: st };
}
