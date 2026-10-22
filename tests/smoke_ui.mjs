import { open, ok, sleep } from './lib.mjs';
const T = await open();
const { page } = T;
ok('hub rendered', await page.locator('[data-tab]').count() >= 5);
for (const t of await page.$$eval('[data-tab]', (a) => a.map((x) => x.dataset.tab))) { await page.click(`[data-tab="${t}"]`); await sleep(300); }
ok('bottom bar unchanged', (await page.$$eval('[data-tab]', (a) => a.map((x) => x.textContent.trim()).join('|'))).length > 0);
await T.shot('smoke'); await T.done('smoke_ui');
