// World connectivity report with ngraph.graph 20.1.2 (BSD-3-Clause) + ngraph.path 1.6.1 (MIT), github.com/anvaka.
// Installed to /tmp only: npm i --prefix /tmp/kil_graph ngraph.graph@20.1.2 ngraph.path@1.6.1
// Builds a map graph from every map's warps + edge exits, then reports: dangling targets (warp to a map that
// doesn't exist), maps unreachable from the start map, one-way links, and an optional route: --route A B
// Usage: node tools/world_graph/world_graph.mjs [--start brookhollow] [--route mapA mapB]
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const req = createRequire('/tmp/kil_graph/');
const createGraph = req('ngraph.graph');
const { aStar } = req('ngraph.path');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'art/world/overworld/maps');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv.slice(i + 1, i + 3) : d; };
const g = createGraph();
const names = new Set(readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)));
const dangling = []; const returns = new Set();
for (const n of names) {
  g.addNode(n);
  const m = JSON.parse(readFileSync(path.join(dir, n + '.json'), 'utf8'));
  for (const l of [...(m.warps || []), ...(m.exits || [])]) {
    if (!l.to) continue;
    if (l.to === '$return') { returns.add(n); continue; } // '$return' = back to whichever map you came from
    if (!names.has(l.to)) { dangling.push(`${n} -> ${l.to}`); continue; }
    if (!g.hasLink(n, l.to)) g.addLink(n, l.to);
  }
}
const inbound = [];
g.forEachLink(l => { if (returns.has(l.toId)) inbound.push([l.toId, l.fromId]); });
for (const [a, b] of inbound) if (!g.hasLink(a, b)) g.addLink(a, b);
const start = arg('--start', ['brookhollow'])[0];
const seen = new Set([start]); const q = [start];
while (q.length) { const n = q.shift(); g.forEachLinkedNode(n, (o, link) => { if (link.fromId === n && !seen.has(o.id)) { seen.add(o.id); q.push(o.id); } }); }
const oneWay = [];
g.forEachLink(l => { if (!g.hasLink(l.toId, l.fromId)) oneWay.push(`${l.fromId} -> ${l.toId}`); });
const out = { maps: names.size, links: g.getLinksCount(), start, unreachable: [...names].filter(n => !seen.has(n)).sort(), dangling, one_way: oneWay };
const r = arg('--route');
if (r) { const p = aStar(g, { oriented: true }).find(r[0], r[1]); out.route = p.length ? p.reverse().map(n => n.id) : 'no route'; }
console.log(JSON.stringify(out, null, 1));
