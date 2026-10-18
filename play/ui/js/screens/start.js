// Start flow: Lifeline (2 save slots) + character creation. Rendered as a full-screen layer inside #app (never remounts the hub).
import { adapter } from '../adapter.js';
import { store, h, btn, section, sheet, confirmSheet, money, sfx, toast } from '../ui.js';
import { composeSprite } from '../character.js';

const rand = (a) => a[Math.floor(Math.random() * a.length)];
async function sprite(look, size, crop) { return composeSprite(look, { size, crop: crop || null, shadow: !crop }); }

// opts: {slot, cancelable, onDone}. mode: 'create' | 'lifeline'. Resolves when a life is loaded/started (or the layer is cancelled).
export function runStart(mode, opts = {}) {
  return new Promise((resolve) => {
    const layer = h('div', { class: 'startscr', 'data-el': 'start-screen' });
    store.root.append(layer);
    const done = (started) => { layer.remove(); resolve(started); if (started && opts.onDone) opts.onDone(); };
    const bar = (title, onBack) => h('div', { class: 'pbar' }, onBack ? h('button', { class: 'pbtn', 'aria-label': 'Back', 'data-el': 'start-back', onclick: onBack }, '‹') : null, h('h2', { text: title }));
    const show = (...kids) => layer.replaceChildren(...kids);

    async function lifeline() {
      const slots = await adapter.getSlots(), body = h('div', { class: 'body' });
      const last = slots.find((s) => s.last && !s.empty) || null;
      body.append(h('div', { class: 'card start-hero' }, h('img', { src: 'assets/brand/logo.png', alt: 'Lifeline', class: 'brand-logo', 'data-el': 'brand-logo', style: { display: 'block', margin: '0 auto 6px', height: '120px', width: 'auto', maxWidth: '70%' } }), h('h3', { text: 'Your Lifelines' }), h('p', { class: 'hint', text: 'Two save slots, each its own life. Progress saves automatically.' })));
      if (last) body.append(btn(`Continue: ${last.name} (Slot ${last.slot})`, async () => { const r = await adapter.loadSlot(last.slot); if (r.ok) { if (r.note) toast(r.note, 'warn'); done(true); } }, 'go block', { 'data-el': 'slot-continue' }));
      for (const s of slots) {
        const pic = h('div', { class: 'slot-pic' });
        if (!s.empty) sprite(s.look, 72, 'head').then((x) => { pic.innerHTML = x; });
        else pic.textContent = '＋';
        const info = s.empty
          ? h('div', { class: 'slot-info' }, h('b', { text: `Slot ${s.slot}` }), h('span', { class: 'hint', text: 'Empty' }))
          : h('div', { class: 'slot-info' }, h('b', { text: `Slot ${s.slot} · ${s.name}` }), h('span', { text: s.summary + (s.alive ? '' : ' · 🪦') }), h('span', { class: 'hint', text: `${s.country}${s.gen > 1 ? ' · Generation ' + s.gen : ''} · ${money(s.cash, true)}` }), s.last ? h('span', { class: 'chip good', text: 'Last played' }) : null);
        const acts = h('div', { class: 'btns' },
          s.empty ? null : btn(s.current && opts.cancelable ? 'Playing' : 'Play', async () => { const r = await adapter.loadSlot(s.slot); if (r.ok) { if (r.note) toast(r.note, 'warn'); done(true); } }, 'go sm', { 'data-el': 'slot-play-' + s.slot }),
          btn(s.empty ? 'New Life' : 'New Life (overwrite)', async () => {
            if (!s.empty && !(await confirmSheet(`Overwrite Slot ${s.slot}?`, `${s.name} (${s.summary}) will be erased and replaced with a new life. This cannot be undone.`, 'Overwrite', 'danger'))) return;
            creator(s.slot, true);
          }, (s.empty ? '' : 'danger ') + 'sm', { 'data-el': 'slot-new-' + s.slot }));
        body.append(h('div', { class: 'card lslot' + (s.empty ? ' empty' : ''), 'data-el': 'slot-card-' + s.slot, 'data-slot': s.slot }, h('div', { class: 'slot-row' }, pic, info), acts));
      }
      show(bar('Lifeline', opts.cancelable ? () => done(false) : null), body);
    }

    async function creator(slot, fromLifeline) {
      const O = await adapter.getCreatorOptions(), L = O;
      const first = await adapter.getRandomName('us', 'm');
      const v = { first: first.first, last: first.last, gender: 'm', country: rand(O.countries).id, build: 'avg', skin: rand(L.skins), hairColor: rand(L.hairColors), eye: rand(L.eyeColors), hair: rand(L.hairs).id, facial: null };
      const prev = h('div', { class: 'cr-prev', 'data-el': 'char-preview' }), body = h('div', { class: 'body' }), form = h('div'), firstIn = h('input', { type: 'text', maxlength: 18, value: v.first, 'data-el': 'creator-first', 'aria-label': 'First name' }), lastIn = h('input', { type: 'text', maxlength: 22, value: v.last, 'data-el': 'creator-last', 'aria-label': 'Last name' });
      firstIn.addEventListener('input', () => { v.first = firstIn.value; }); lastIn.addEventListener('input', () => { v.last = lastIn.value; });
      const lookOf = () => ({ skin: v.skin, eye: v.eye, build: v.build, hair: v.hair, hairColor: v.hairColor, facial: v.gender === 'm' ? v.facial : null });
      let seq = 0; const paint = async () => { const n = ++seq, l = await adapter.getPreviewLook(lookOf(), O.previewAge); const svg = await composeSprite(l, { size: 200 }); if (n === seq) prev.innerHTML = svg; };
      const swatches = (colors, cur, key, tag) => h('div', { class: 'swatches' }, ...colors.map((c) => h('button', { class: 'sw' + (c === cur ? ' on' : ''), 'data-swatch': tag + ':' + c, 'aria-label': tag + ' ' + c, title: c, style: { background: c }, onclick: () => { v[key] = c; redraw(); } })));
      const chips = (items, cur, key, tag) => h('div', { class: 'btns cr-chips' }, ...items.map((i) => btn(i.label, () => { v[key] = i.id; if (key === 'gender' && i.id !== 'm') v.facial = null; redraw(); }, (cur === i.id ? 'go' : 'alt') + ' sm', { 'data-opt': tag + ':' + i.id })));
      const lab = (t) => h('div', { class: 'hint cr-lab', text: t });
      function redraw() {
        form.replaceChildren(
          section('Who are you?'),
          h('div', { class: 'cr-names' }, firstIn, lastIn, btn('🎲', async () => { const n = await adapter.getRandomName(v.country, v.gender); v.first = n.first; v.last = n.last; firstIn.value = n.first; lastIn.value = n.last; }, 'alt sm', { 'data-el': 'creator-dice', 'aria-label': 'Random name' })),
          lab('Gender'), chips(O.genders.map((g) => ({ id: g.id, label: g.label })), v.gender, 'gender', 'gender'),
          lab('Starting country'), h('select', { 'data-el': 'creator-country', 'aria-label': 'Starting country', onchange: (e) => { v.country = e.target.value; } }, ...O.countries.map((c) => h('option', { value: c.id, text: c.name, selected: c.id === v.country }))),
          section('Look'),
          lab('Build'), chips(L.builds.map((b) => ({ id: b, label: b === 'avg' ? 'Average' : b[0].toUpperCase() + b.slice(1) })), v.build, 'build', 'build'),
          lab('Skin tone'), swatches(L.skins, v.skin, 'skin', 'skin'),
          lab('Hair style'), chips(L.hairs.map((x) => ({ id: x.id, label: x.name })), v.hair, 'hair', 'hair'),
          lab('Hair color'), swatches(L.hairColors, v.hairColor, 'hairColor', 'haircolor'),
          lab('Eye color'), swatches(L.eyeColors, v.eye, 'eye', 'eye'),
          v.gender === 'm' ? h('div', { 'data-el': 'facial-block' }, lab('Facial hair'), chips([{ id: null, label: 'None' }, ...L.facials.map((x) => ({ id: x.id, label: x.name }))], v.facial, 'facial', 'facial')) : null);
        paint();
      }
      const countryName = () => O.countries.find((c) => c.id === v.country).name;
      body.append(h('div', { class: 'card cr-card' }, prev, h('div', { class: 'hint', style: { textAlign: 'center' }, text: 'Preview shown as an adult. You start life as a baby and grow up.' })), form,
        btn('🎲 Randomize look', () => { Object.assign(v, { build: rand(L.builds), skin: rand(L.skins), hairColor: rand(L.hairColors), eye: rand(L.eyeColors), hair: rand(L.hairs).id, facial: v.gender === 'm' && Math.random() < 0.4 ? rand(L.facials).id : null }); redraw(); }, 'alt block', { 'data-el': 'creator-random' }),
        btn('Start life', async () => {
          if (!v.first.trim()) { firstIn.focus(); return; }
          sfx('good'); const r = await adapter.startLife(slot, { first: v.first, last: v.last, gender: v.gender, country: v.country, look: lookOf() });
          if (r.ok) { if (r.note) toast(r.note, 'warn'); done(true); }
        }, 'go block', { 'data-el': 'creator-start' }),
        h('p', { class: 'hint', style: { textAlign: 'center' }, text: `Slot ${slot}` }));
      redraw();
      show(bar('New Life', fromLifeline ? lifeline : (opts.cancelable ? () => done(false) : null)), body);
    }

    if (mode === 'lifeline') lifeline(); else creator(opts.slot || 1, false);
  });
}
