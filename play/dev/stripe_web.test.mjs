// Stripe web checkout smoke test (no real Stripe/Supabase calls: both are intercepted).
// Run from repo root: python3 -m http.server 8123 & ; NODE_PATH=/workspace/node_modules node play/dev/stripe_web.test.mjs [shotDir]
import { createRequire } from 'module';
const require = createRequire(import.meta.url + '/../../../');
const { chromium } = require(process.env.PW || '/workspace/node_modules/playwright');
const BASE = process.env.BASE || 'http://localhost:8123/play/';
const SHOTS = process.argv[2] || '/tmp';
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'tester@example.com', is_anonymous: false };
const calls = []; let granted = false;
const fail = (m) => { console.error('FAIL', m); process.exitCode = 1; };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.route('**/*.supabase.co/**', async (r) => {
  const u = r.request().url();
  if (u.includes('/functions/v1/create-checkout')) { const body = JSON.parse(r.request().postData() || '{}'); calls.push({ body, auth: r.request().headers()['authorization'] }); return r.fulfill({ json: { url: BASE + 'dev/fake_stripe.html?pk=' + encodeURIComponent(body.productKey) + '&back=' + encodeURIComponent(body.returnUrl), mode: 'test' } }); }
  if (u.includes('/rest/v1/entitlements')) return r.fulfill({ json: granted ? [{ product_id: 'lifeline.einstein', game_id: 'lifeline', scope: 'game', source: 'stripe', expires_at: null }] : [] });
  return r.fulfill({ json: [] });
});
await page.addInitScript((u) => { if (!localStorage.getItem('paige.session.v1')) localStorage.setItem('paige.session.v1', JSON.stringify({ access_token: 'test.jwt.x', expires_at: Math.floor(Date.now() / 1000) + 3600, user: u })); }, user);
await page.goto(BASE + '?stripe=dev&noterms=1');
await page.waitForFunction(() => window.__ready || window.__startReady, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);
if (await page.locator('[data-el="creator-start"]').count()) { await page.locator('[data-el="creator-start"]').click(); await page.waitForFunction(() => window.__ready, null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(1500); }
await page.evaluate(async () => { const { openPanel } = await import('/play/ui/js/ui.js'); const { storeScreen } = await import('/play/ui/js/screens/store.js'); openPanel('Premium', storeScreen); });
await page.waitForSelector('[data-stripe="einstein"]', { timeout: 15000 }).catch(() => fail('no Stripe pass button'));
const nPass = await page.locator('[data-stripe]').count(); console.log('stripe pass buttons', nPass);
if (!(await page.locator('[data-el="stripe-sub-monthly"]').count())) fail('no All Access monthly button');
await page.screenshot({ path: SHOTS + '/01_store_stripe.png', fullPage: false });
await page.locator('[data-stripe="einstein"]').scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}); await page.screenshot({ path: SHOTS + '/02_store_passes.png' });
await page.locator('[data-stripe="einstein"]').click();
await page.waitForURL(/fake_stripe/, { timeout: 10000 }).catch(() => fail('no redirect to checkout'));
const c = calls[0] || {}; console.log('create-checkout body', JSON.stringify(c.body));
if (!c.body || c.body.productKey !== 'lifeline:einstein') fail('wrong productKey');
if (!/^Bearer test\.jwt\.x$/.test(c.auth || '')) fail('no user JWT sent');
await page.screenshot({ path: SHOTS + '/03_fake_checkout.png' });
granted = true; // webhook would have run here
await page.goto(c.body.returnUrl + (c.body.returnUrl.includes('?') ? '&' : '?') + 'checkout=success&session_id=cs_test_123');
await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem('paige.entitlements.lifeline.v1') || '[]').some((e) => e.sku === 'einstein'); } catch (e) { return false; } }, null, { timeout: 20000 }).catch(() => fail('entitlement not synced after return'));
const owned = await page.evaluate(async () => (await import('/play/src/premium.js')).isUnlocked('einstein'));
console.log('einstein unlocked after return:', owned); if (!owned) fail('pass not unlocked');
await page.evaluate(async () => { const { openPanel } = await import('/play/ui/js/ui.js'); const { storeScreen } = await import('/play/ui/js/screens/store.js'); openPanel('Premium', storeScreen); });
await page.waitForTimeout(800); await page.locator('[data-pass="einstein"]').scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: SHOTS + '/04_after_purchase.png' });
// subscription key
await page.locator('[data-el="stripe-sub-yearly"]').click().catch(() => fail('no yearly button'));
await page.waitForTimeout(1500); console.log('sub body', JSON.stringify((calls[1] || {}).body));
if (!calls[1] || calls[1].body.productKey !== 'lifeline:all_access:year') fail('wrong subscription key');
await browser.close();
console.log(process.exitCode ? 'FAILED' : 'PASS');
