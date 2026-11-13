// Preset quick-chat (stage 1 default). Only the phrase ID goes over the wire, never text, so a
// quick-chat message cannot carry anything bad, and a server can reject unknown IDs.
// Wording is kid-safe and game-neutral. Add phrases at the end; never reuse or reorder an ID.
export const PHRASES = Object.freeze([
  { id: 'hi', text: 'Hi!' },
  { id: 'nice', text: 'Nice to meet you!' },
  { id: 'explore', text: "Let's explore!" },
  { id: 'follow', text: 'Follow me!' },
  { id: 'wait', text: 'Wait for me!' },
  { id: 'wow', text: 'Wow!' },
  { id: 'thanks', text: 'Thanks!' },
  { id: 'gl', text: 'Good luck!' },
  { id: 'gg', text: 'Good game!' },
  { id: 'brb', text: 'Be right back!' },
  { id: 'yes', text: 'Yes!' },
  { id: 'no', text: 'No, thanks.' },
  { id: 'bye', text: 'Bye!' },
]);
const BY_ID = new Map(PHRASES.map((p) => [p.id, p]));
export function phraseText(id) { return BY_ID.get(id)?.text || null; }
export function isPhrase(id) { return BY_ID.has(id); }
