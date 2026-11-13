import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await p.goto(`http://127.0.0.1:${process.argv[2]}/index.html?${process.argv[3]}`);
await p.evaluate(() => window.kilumen.ready); await p.waitForTimeout(300);
console.log(await p.evaluate(process.argv[4]));
await b.close();
