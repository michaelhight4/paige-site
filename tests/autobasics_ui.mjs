import { open, ok, sleep } from './lib.mjs';
const T = await open(); const { page, A } = T;
await A('await adapter.setPremiumFlag("autopilot", true); const s = adapter.impl.s; s.age = 22; s.cash = 100; s.auto = null; const Au = await import("/src/autopilot.js"); Au.ensure(s).on = true; return 1');
await page.click('[data-el=age]'); await sleep(1200);
for (let i = 0; i < 6; i++) { const m = await page.$('.sheet button, .modal button'); if (!m) break; await m.click().catch(() => {}); await sleep(400); }
await page.click('[data-tab=skills]'); await sleep(700);
const st = await page.$$eval('[data-quick]', (a) => a.map((x) => ({ id: x.dataset.quick, done: x.classList.contains('done'), dis: x.disabled })));
for (const id of ['train', 'read']) { const c = st.find((x) => x.id === id); ok(`${id} chip greyed (done) after an autopilot year below the floor`, c && c.done && c.dis, JSON.stringify(c)); }
await T.shot('autobasics_ui'); await T.done('autobasics_ui');
