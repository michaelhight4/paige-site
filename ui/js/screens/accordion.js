// Inline accordion: tap a banner to drop its content down in place, tap again to collapse. Open/closed state is remembered per key (localStorage).
import { h } from '../ui.js';
export function accordion(key, sections, attr = 'data-acc') {
  const rd = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } }, wr = (v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const openState = rd(), acc = h('div', { class: 'acc' });
  for (const sec of sections) {
    const cnt = h('span', { class: 'acc-n' + (sec.on ? ' on' : ''), text: sec.badge || '' }), chev = h('span', { class: 'acc-chev', text: '▾' });
    const list = h('div', { class: 'acc-body' }, ...sec.rows), wrap = h('div', { class: 'acc-sec' }), head = h('button', { class: 'acc-head', [attr]: sec.id, 'aria-expanded': 'false', type: 'button' }, h('span', { class: 'acc-ic', text: sec.icon }), h('span', { class: 'acc-t', text: sec.label }), cnt, chev);
    const setOpen = (o, anim) => { wrap.classList.toggle('open', o); head.setAttribute('aria-expanded', o ? 'true' : 'false'); list.style.maxHeight = o ? (anim ? list.scrollHeight + 'px' : 'none') : '0px'; if (o && anim) setTimeout(() => { if (wrap.classList.contains('open')) list.style.maxHeight = 'none'; }, 260); };
    head.onclick = () => { const o = !wrap.classList.contains('open'); if (!o) { list.style.maxHeight = list.scrollHeight + 'px'; void list.offsetHeight; } setOpen(o, true); const st = rd(); st[sec.id] = o ? 1 : 0; wr(st); };
    wrap.append(head, list); setOpen(!!openState[sec.id], false); acc.append(wrap);
  }
  return acc;
}
