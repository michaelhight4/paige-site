// locate puppeteer-core (no package.json shipped): env PUPPETEER_DIR, sibling ui3 tests, or /workspace/tools
import { createRequire } from 'node:module'; import fs from 'node:fs';
export function loadPuppeteer() {
  for (const d of [process.env.PUPPETEER_DIR, new URL('../', import.meta.url).pathname, '/workspace/lifesim_ui3/tests/', '/workspace/tools/', '/usr/lib/node_modules/']) {
    if (!d) continue; try { return createRequire(d.endsWith('/') ? d + 'x.js' : d + '/x.js')('puppeteer-core'); } catch (e) { /* next */ }
  }
  throw new Error('puppeteer-core not found; set PUPPETEER_DIR');
}
