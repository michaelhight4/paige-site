import { chromium } from 'playwright';
const port = process.argv[2], url = process.argv[3], out = process.argv[4];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', (e) => console.log('ERR', e)); p.on('console', (m) => { if (m.type() === 'error' || m.type()==='warning') console.log(m.type(), m.text()); });
await p.goto(`http://127.0.0.1:${port}/index.html?${url}`);
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(600);
await p.screenshot({ path: out });
await b.close();
