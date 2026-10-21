import { adapter } from '../adapter.js';
import { store, h, bar, money, avatarFor, avatarEl, ico, sfx, Art, openPanel, sheet, act, refreshState, closeAll, toast, btn, rerenderTop } from '../ui.js';
import { storeScreen, settingsScreen } from './store.js';
import { cemeteryScreen } from './profile.js';
import { occupationMenu } from './occupation.js';
import { assetsMenu } from './assets.js';
import { relationshipsScreen } from './relationships.js';
import { activitiesScreen } from './activities.js';
import { profileScreen, legacyScreen } from './profile.js';
import { tipsInit } from './tips.js';
import { moreScreen } from './directory.js';
import { skillsScreen, businessesScreen } from './extra.js';

export function mountHub(root) {
  const top = h('div', { class: 'topbar', 'data-el': 'topbar' });
  const agebar = h('div', { class: 'agebar' });
  const journal = h('div', { class: 'journal', 'data-el': 'journal', tabindex: 0 });
  const stats = h('div', { class: 'stats', 'data-el': 'stats' });
  const ageBtn = h('button', { class: 'agebtn', 'data-el': 'age', 'aria-label': 'Age one year' }, h('b', { text: 'AGE' }), h('small'));
  const nav = h('div', { class: 'nav' });
  root.classList.add('ls-app'); const hub = h('div', { class: 'hub' }, agebar, journal, stats);
  root.replaceChildren(top, hub, nav);

  const openers = { occupation: occupationMenu, assets: assetsMenu, relationships: relationshipsScreen, activities: activitiesScreen, more: moreScreen, skills: skillsScreen, businesses: businessesScreen };
  const titles = { occupation: 'Work', assets: 'Assets', relationships: 'Social', activities: 'Activities', more: 'More', skills: 'Skills', businesses: 'Businesses & Studios' };
  const tabs = store.cfg.tabs, half = Math.ceil(tabs.length / 2);
  nav.style.gridTemplateColumns = `repeat(${half},1fr) 96px repeat(${tabs.length - half},1fr)`;
  let activeTab = 'life'; const tabEls = {};
  tabs.forEach((t, i) => {
    const b = h('button', { class: 'tab', 'data-tab': t.id, onclick: () => { closeAll(); activeTab = t.id; if (t.id !== 'life') openPanel(titles[t.id] || t.label, openers[t.id]); paintTabs(); } }, ico(t.icon, 26), h('span', { class: 'tl', text: t.label }), h('i', { class: 'nbadge', 'data-badge': t.id }));
    tabEls[t.id] = b; if (i === half) nav.append(h('div'));
    nav.append(b);
  });
  function paintTabs() {
    if (!store.stack.length) activeTab = 'life';
    for (const t of tabs) {
      const el = tabEls[t.id], n = store.unlocks.filter((u) => u.isNew && u.tab === t.id).length; el.classList.toggle('on', t.id === activeTab);
      const bd = el.querySelector('.nbadge'); bd.textContent = n ? String(n) : ''; bd.style.display = n ? '' : 'none'; el.dataset.new = n;
    }
    const mn = store.unlocks.filter((u) => u.isNew).length; // More shows the total of everything new
    const bm = tabEls.more && tabEls.more.querySelector('.nbadge'); if (bm) { bm.textContent = mn ? String(mn) : ''; bm.style.display = mn ? '' : 'none'; }
  }
  document.addEventListener('panelchange', paintTabs); document.addEventListener('statechange', paintTabs); document.addEventListener('unlockseen', async () => { await refreshState(); });
  nav.append(ageBtn);

  let lastAge = -1; let shown = 0;
  function renderTop(st) {
    if (st.alive && store.root.classList.contains('ls-death-fade')) clearDeathFx(); // defensive: a living character is never shown faded/behind a stale backdrop
    top.className = top.className.replace(/\s*fame-t\d/g, '') + (st.fameTier ? ' fame-t' + st.fameTier.index : '');
    top.replaceChildren(
      avatarFor(st.gender, st.age, st.avatar),
      h('button', { class: 'who', 'data-el': 'profile-link', onclick: () => openPanel('Profile', profileScreen), 'aria-label': 'Open profile' }, h('span', { class: 'nm', text: st.name }), h('span', { class: 'hd', text: '💼 ' + st.headline }), st.fameTier && st.fameTier.index > 0 ? h('span', { class: 'fame-tag', 'data-el': 'fame-tier', role: 'link', onclick: (e) => { e.stopPropagation(); import('./fame.js').then((m) => openPanel('Use your fame', m.fameScreen)); }, text: `🌟 ${st.fameTier.name} · ${st.fameTier.fame}%` }) : null),
      h('button', { class: 'topbtn prem', 'data-el': 'store-link', 'aria-label': 'Premium store', onclick: () => openPanel('Premium', storeScreen) }, '⭐'),
      h('button', { class: 'topbtn', 'data-el': 'settings-link', 'aria-label': 'Settings', onclick: () => openPanel('Settings', settingsScreen) }, '⚙️'),
      h('div', { class: 'bank' }, h('b', { class: st.cash < 0 ? 'neg' : '', 'data-el': 'cash', text: money(st.cash, true) }), h('small', { text: 'Bank Balance' })));
    agebar.replaceChildren(h('span', { text: `Age: ${st.age} · ${st.stage}` }), h('span', { text: st.education.inSchool ? '🎓 ' + st.education.label : st.alive ? `Net worth ${money(st.netWorth, true)}` : '🪦 Deceased' }));
    stats.replaceChildren(...store.cfg.stats.map(s => bar(s.label, st.stats[s.key] ?? 0, { icon: s.icon, key: s.key })));
    ageBtn.querySelector('small').textContent = 'Age ' + st.age;
    ageBtn.disabled = !st.alive; ageBtn.classList.toggle('auto-on', !!st.auto); ageBtn.querySelector('small').textContent = 'Age ' + st.age + (st.auto ? ' 🤖' : '');
  }
  document.addEventListener('statechange', (e) => renderTop(e.detail));
  renderTop(store.state); paintTabs(); tipsInit(hub);

  // journal
  const kindIcon = store.cfg.journalKindIcons || {}; let lastA = -1;
  function addEntries(entries, animate) {
    for (const e of entries) {
      if (e.age !== lastA) { journal.append(h('div', { class: 'j-age', 'data-age': e.age }, `Age: ${e.age}`)); lastA = e.age; }
      journal.append(h('div', { class: `j-line k-${e.kind} ${animate ? 'new' : ''}`, 'data-kind': e.kind }, kindIcon[e.kind] ? h('span', { class: 'ic', text: kindIcon[e.kind] }) : null, e.text));
    }
    journal.scrollTop = journal.scrollHeight;
  }
  document.addEventListener('journal', (e) => addEntries(e.detail, true));
  adapter.getJournal().then(j => addEntries(j, false));

  async function showEvent(ev) {
    let i;
    for (;;) {
      i = await sheet({ title: ev.title, body: ev.prompt, options: ev.choices.map(c => ({ label: c.rare ? (c.locked ? '🌟📺 ' : '🌟 ') + c.label : c.label, sub: c.rare ? (c.locked ? (c.access && c.access.ok ? 'Rare option: ' + (c.access.mode === 'ad' ? 'watch an ad to unlock' : 'subscriber unlock') : (c.access && c.access.reason) || 'Locked') : 'Rare option unlocked') : c.cost ? 'Costs ' + money(c.cost) : '', disabled: !!c.disabled || (c.rare && c.locked && c.access && !c.access.ok) })), dismissable: false });
      const ch = ev.choices[i];
      if (ch && ch.rare && ch.locked) { const u = await adapter.unlockRareChoice(); if (u.ok) { toast('Rare option unlocked', 'good'); ev = { ...ev, choices: ev.choices.map((c, k) => (k === i ? { ...c, locked: false } : c)) }; } else toast(u.message || 'Not unlocked', 'bad'); continue; }
      break;
    }
    const r = await adapter.resolveEvent(ev.id, i);
    document.dispatchEvent(new CustomEvent('journal', { detail: r.entries || [] }));
    await refreshState();
    if (r.event) await showEvent(r.event);
  }
  async function showDeath(d) {
    const A = Art(); sfx('death'); if (A) A.fx.deathFade(store.root);
    const stone = h('div', { class: 'stone' });
    if (A) stone.innerHTML = A.renderTombstone({ name: d.name, born: d.born, died: d.died, age: d.age, epitaph: d.epitaph, cause: d.cause, netWorth: d.netWorth, style: ['classic', 'round', 'cross', 'obelisk'][d.age % 4], avatar: { seed: store.state.id, gender: (d.gender || 'M').toLowerCase(), age: d.age, dead: true }, ribbons: d.ribbon ? [{ id: d.ribbon, title: d.ribbon, tier: 'gold', icon: d.ribbonIcon }] : [] }); else stone.textContent = '🪦';
    const body = h('div', { class: 'death' }, stone, h('p', { text: `${d.name} died at age ${d.age} of ${String(d.cause).toLowerCase()}.` }), h('p', { text: `Last occupation: ${d.headline} · Net worth ${money(d.netWorth)}` }), d.obituary ? h('p', { class: 'hint', text: d.obituary }) : null, d.creatorUsed ? h('p', { class: 'hint', 'data-el': 'creator-flag', text: '🛠️ The Creator was used in this life (no challenges / leaderboards).' }) : null);
    store.root.querySelectorAll('.overlay').forEach((o) => o.remove()); // never stack a second death/obit sheet
    const r = await sheet({ title: 'Rest in peace', body, center: true, dismissable: false, buttons: [{ id: 'legacy', label: 'Family Legacy', cls: 'alt' }, { id: 'new', label: d.canContinue ? 'Play an heir' : 'New Life', cls: 'go' }] });
    clearDeathFx();
    if (r === 'legacy') { const { legacyScreen } = await import('./profile.js'); openPanel('Family Legacy', legacyScreen); }
    else if (d.canContinue) { const { legacyScreen } = await import('./profile.js'); openPanel('Family Legacy', legacyScreen); }
    else { await newLife(); }
  }
  // the death fade class and any orphan sheet backdrops must go once the death sheet resolves / a new life starts
  function clearDeathFx() { store.root.classList.remove('ls-death-fade'); document.body.classList.remove('ls-death-fade'); store.root.querySelectorAll('.overlay').forEach((o) => o.remove()); }
  window.__clearDeathFx = clearDeathFx;
  async function newLife() { clearDeathFx(); closeAll(); const { runStart } = await import('./start.js'); const st = await adapter.getStartState(); await runStart('create', { slot: st.slot || 1, cancelable: false }); journal.replaceChildren(); lastA = -1; await refreshState(); addEntries(await adapter.getJournal(), false); }
  async function resetHub() { clearDeathFx(); closeAll(); journal.replaceChildren(); lastA = -1; await refreshState(); addEntries(await adapter.getJournal(), false); }
  document.addEventListener('newlife', resetHub);
  window.__showDeath = showDeath;

  let busy = false;
  async function doAge(fromBtn) {
    if (busy || !store.state.alive) return; busy = true;
    try {
      sfx('age'); if (Art() && fromBtn) Art().fx.agePop(ageBtn);
      const r = await adapter.age();
      addEntries(r.entries || [], true); await refreshState(); if (store.stack.length) await rerenderTop();
      if (r.auto && r.auto.paused) toast('Autopilot paused: ' + r.auto.paused.reason); else if (r.auto && r.auto.ran.length) toast('Autopilot: ' + r.auto.ran.length + ' routine' + (r.auto.ran.length === 1 ? '' : 's') + ' ran');
      if (r.event) await showEvent(r.event);
      if (r.died) await showDeath(r.death || await adapter.getDeathSummary());
      else if (r.adPrompt && !r.event) { const { showAdPrompt } = await import('../ads_ui.js'); await showAdPrompt(r.adPrompt); }
      if (!r.died && !r.event) { try { const { showPostPlanPopup } = await import('./social.js'); await showPostPlanPopup(); const sp = await import('./strategy.js'); await sp.showStreamPlanPopup(); await sp.showMediaPlanPopups(); } catch (e) { console.error(e); } }
    } finally { busy = false; }
  }
  ageBtn.addEventListener('click', () => doAge(true));
  document.addEventListener('ageup', () => doAge(false)); // inline Age buttons inside menus
  document.addEventListener('died', (e) => showDeath(e.detail));
  document.addEventListener('gameevent', (e) => showEvent(e.detail));
}
