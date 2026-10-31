// Chat filter for typed text (quick-chat phrases never need it). Runs on the SENDER before a message
// goes out and again on every RECEIVER before it is shown, so a modified client can't push bad text
// to an honest one. Stage 2 adds the same check server-side (see docs/online_play_plan.md).
// Profanity: obscenity 0.4.6 (MIT, src/vendor/obscenity/LICENSE), English dataset + recommended
// transformers (catches leetspeak like "b1tch", avoids Scunthorpe-style false hits).
// Personal info / links: our own rules, because kids may play. Blocked, not censored.
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from '../vendor/obscenity/obscenity.mjs?v=v0.2.106-alpha';

let matcher = null;
function getMatcher() {
  return (matcher ||= new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers }));
}

const LINK_RE = /(https?:|www\.|\b[a-z0-9-]+\s*(\.|\bdot\b)\s*(com|net|org|gg|io|co|uk|tv|me|ly|xyz|app|link)\b)/i;
const CONTACT_RE = /(@|\b(discord|insta(gram)?|snap(chat)?|tik\s*tok|whats\s*app|telegram|kik|roblox|youtube|twitch|e-?mail|gmail)\b)/i;
const PERSONAL_RE = /\b(my address|home address|phone( number)?|my number|where do you live|where u live|what school|which school|how old are you|how old r u|send (a )?(pic|photo|picture)|add me|meet (up|irl)|real name|last name|password)\b/i;
// No smoking/alcohol/drugs talk either (project rule). Simple word list on top of obscenity.
const SUBSTANCE_RE = /\b(beer|wine|vodka|whisk(e)?y|alcohol|booze|drunk|cig(arette)?s?|smok(e|ing)|vape|vaping|weed|drugs?|cocaine|pills)\b/i;

/** Strip control and zero-width characters, collapse spaces. */
export function normalise(s) {
  return String(s ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Check a typed message. Returns { ok, text, reason }. reason is one of
 * empty | too_long | profanity | link | personal_info | substance. On ok=false text is ''.
 */
/** "f u c k" / "f.u.c.k" -> "fuck": join runs of 3+ single letters split by spaces or dots. */
export function squashSpaced(text) {
  return text.replace(/(?:^|(?<=[\s.\-_*]))(?:[a-z0-9@$!][\s.\-_*]+){2,}[a-z0-9@$!](?=$|[\s.\-_*?!,])/gi, (m) => m.replace(/[\s.\-_*]+/g, ''));
}

export function checkText(raw, { maxLen = 60 } = {}) {
  const text = normalise(raw);
  if (!text) return { ok: false, text: '', reason: 'empty' };
  if (text.length > maxLen) return { ok: false, text: '', reason: 'too_long' };
  if ((text.match(/\d/g) || []).length >= 5) return { ok: false, text: '', reason: 'personal_info' }; // phone numbers, addresses
  if (LINK_RE.test(text)) return { ok: false, text: '', reason: 'link' };
  if (CONTACT_RE.test(text) || PERSONAL_RE.test(text)) return { ok: false, text: '', reason: 'personal_info' };
  if (SUBSTANCE_RE.test(text)) return { ok: false, text: '', reason: 'substance' };
  if (getMatcher().hasMatch(text) || getMatcher().hasMatch(squashSpaced(text))) return { ok: false, text: '', reason: 'profanity' };
  return { ok: true, text, reason: null };
}

export const REASON_TEXT = Object.freeze({
  empty: 'Type something first.',
  too_long: 'That message is too long.',
  profanity: "That message can't be sent.",
  link: "Links can't be shared here.",
  personal_info: 'Keep personal info private!',
  substance: "That message can't be sent.",
});
