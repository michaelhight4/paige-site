// Rewrites slice messages into first-person, past-tense journal lines (rules in data/voice.json).
import { D } from './data.js';
let compiled = null;
export function voice(msg) {
  if (!D.voice) return String(msg);
  if (!compiled) compiled = D.voice.rules.map(([re, t]) => [new RegExp(re), t]);
  msg = String(msg).trim();
  for (const [re, t] of compiled) { const m = msg.match(re); if (m) return t.replace(/\$(\d)/g, (_, i) => (m[+i] != null ? numFmt(m[+i]) : '')).replace(/\$\$/g, '$'); }
  return firstPerson(msg).replace(/^You /, 'I ').replace(/^(Bought|Sold|Purchased|Installed|Paid|Hired|Enrolled|Applied|Started|Finished|Won|Lost|Opened|Built|Moved|Quit|Took|Listed|Consigned|Restored|Invested|Played)\b/, (m) => 'I ' + m.toLowerCase()).replace(/!$/, '.');
}
const numFmt = (x) => (/^-?\d{4,}$/.test(x) ? Number(x).toLocaleString('en-US') : x);
// Cheap second-person -> first-person rewrite for content written as "You ..." (world activities, premium text).
export function firstPerson(t) {
  return String(t)
    .replace(/\bYou('re| are)\b/g, "I'm").replace(/\byou('re| are)\b/g, "I'm").replace(/\b[Yy]ou've\b/g, "I've").replace(/\b[Yy]ou were\b/g, 'I was').replace(/\b[Yy]ou don't\b/g, "I don't")
    .replace(/\bYou\b/g, 'I').replace(/(^|[.!?] |, |that |when |and |but |as |because |if |so |until |while )you\b/g, '$1I').replace(/\byour\b/gi, (m) => (m[0] === 'Y' ? 'My' : 'my')).replace(/\byourself\b/g, 'myself').replace(/\byou\b/g, 'me');
}
