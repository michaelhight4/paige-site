// coder_new_evos (Oct 23 2026): splice the 3 new species + 2 evo links from a SANDBOX run of tools/sync_creatures.mjs
// (/tmp/sbx, same inputs) into the live registry files, without a full live sync (other workers hand-edit the live outputs).
const fs = require('fs'), NEW = ['vaultpede', 'pricklon', 'geodurchin'], EVO = { columnpede: 'vaultpede', spinelet: 'pricklon' };
const R = (p) => fs.readFileSync(p, 'utf8'), J = (o) => JSON.stringify(o, null, 1) + '\n';
// creatures_synced.json
{
  const p = 'data/creatures_synced.json', raw = R(p), L = JSON.parse(raw), S = JSON.parse(R('/tmp/sbx/' + p));
  if (J(L) !== raw) throw new Error('round-trip mismatch ' + p);
  if (L.species.some((s) => NEW.includes(s.id))) throw new Error('already spliced');
  for (const s of L.species) if (EVO[s.id]) { if (s.evo) throw new Error('evo set ' + s.id); s.evo = EVO[s.id]; }
  L.species.push(...S.species.filter((s) => NEW.includes(s.id)));
  const m = L._meta; m.wired = L.species.length; m.total_registered += NEW.length; m.manifest_lines = S._meta.manifest_lines;
  m.not_in_any_table.push(...S._meta.not_in_any_table.filter((x) => NEW.includes(x.id)));
  m.new_evos = 'coder_new_evos 10/23/2026 2:27 PM CT: +vaultpede/pricklon/geodurchin (design/dex_additions_new_evos.json), columnpede.evo + spinelet.evo; spliced from a sandbox sync run (same generator output)';
  fs.writeFileSync(p, J(L));
}
// species_synced.gen.js: the sandbox output IS tools/sync_creatures.mjs output; only take it if the live file still equals the sandbox minus our lines
{
  const p = 'src/ui/species_synced.gen.js', live = R(p), sb = R('/tmp/sbx/' + p).split('\n'), lv = live.split('\n');
  const strip = (a) => a.filter((l) => !NEW.some((id) => l.startsWith(`{"id":"${id}"`))).map((l) => l.replace(/^\/\/ GENERATED.*$/, 'H').replace(/"evo":"(vaultpede|pricklon)"/, '"evo":null').replace(/\}\];$/, '},'));
  if (strip(sb).join('\n') !== strip(lv).join('\n').replace(/\},$/m, '},')) throw new Error('gen.js live drifted from sandbox base');
  fs.writeFileSync(p, sb.join('\n'));
}
// encounters_wired.json: species_with_art only (zones untouched)
{
  const p = 'data/encounters_wired.json', raw = R(p), E = JSON.parse(raw);
  if (J(E) !== raw) throw new Error('round-trip mismatch ' + p);
  E.species_with_art = [...new Set([...E.species_with_art, ...NEW])].sort();
  fs.writeFileSync(p, J(E));
}
console.log('spliced');
