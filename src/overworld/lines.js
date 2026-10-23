// Kilumen: Text Bot line picker (pure, no DOM; Node-tested). text/overworld_lines.json v0.4.1 format:
// every spot has `lines`, most specific first, ending with id "default". The FIRST line whose `flags` are all
// set (AND) and whose optional `when` matches wins. Lines marked `pending_story_call` are skipped (neutral until
// Story Bot / Gary decide). `when` keys are whitelisted in _meta.conditions_when; an unknown key never matches.

/** Placeholders the engine fills (anything else is left as-is so a gap is visible, never silently blank). */
export const PLACEHOLDERS = ['player', 'coins', 'lead', 'nick', 'rt_number'];

/** Fill {key} with vars[key] when it is defined. */
export function fillText(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m0, k) => (vars[k] != null ? String(vars[k]) : m0));
}

/** Dotted lookup into the lines JSON ("maps.house_2f.pc"). */
export function getPath(root, path) {
  let v = root;
  for (const k of String(path).split('.')) v = v?.[k];
  return v ?? null;
}

const usesLead = (line) => (line.pages || []).some((p) => p.includes('{lead}'));

/**
 * Does one `when` block match? env:
 *  phase, hour, counters{}, isSeen(key), seenToday(key), lead{species,nickname,type}|null, party[], idleAfterHealS,
 *  stillS, facing, zone, slept, lineKey (spot path + '#' + line id, for once / once_per_day / dream_unseen).
 */
export function whenMatches(when, env) {
  if (!when) return true;
  for (const [k, v] of Object.entries(when)) {
    switch (k) {
      case 'phase': if (env.phase !== v) return false; break;
      case 'hour': if (env.hour !== v) return false; break;
      case 'count_gte': if ((env.counters?.[v.counter] || 0) < v.n) return false; break;
      case 'once': if (v && env.isSeen?.(env.lineKey)) return false; break;
      case 'once_per_day': if (v && env.seenToday?.(env.lineKey)) return false; break;
      case 'lead_has_nickname': if (!!env.lead?.nickname !== !!v) return false; break;
      case 'lead_type': if (!env.lead || !String(env.lead.type || '').toLowerCase().split('/').includes(String(v).toLowerCase())) return false; break;
      case 'party_nickname': if (!(env.party || []).some((c) => c.nickname === v)) return false; break;
      case 'idle_after_heal_s': if (!(env.idleAfterHealS >= v)) return false; break;
      case 'standing_still_s': if (!(env.stillS >= v)) return false; break;
      case 'facing': if (env.facing !== v) return false; break;
      case 'zone': if (env.zone !== v) return false; break;
      case 'dream_unseen': if (!!v === !!env.isSeen?.(env.lineKey)) return false; break;
      case 'slept': if (!!env.slept !== !!v) return false; break;
      // weekday needs the 1.4 weekday clock (not approved yet): never matches until then
      default: return false;
    }
  }
  return true;
}

/**
 * First matching line of a spot (or any {lines:[...]} block). `spotKey` prefixes once/once_per_day keys.
 * Returns the line object or null. A line that uses {lead} needs a lead creature.
 */
export function pickLine(spot, flags, env = {}, spotKey = '') {
  const lines = spot?.lines;
  if (!Array.isArray(lines)) return spot?.pages ? { id: 'default', flags: [], pages: spot.pages } : null;
  for (const line of lines) {
    if (line.pending_story_call) continue;
    if (!(line.flags || []).every((f) => flags.has(f))) continue;
    if (usesLead(line) && !env.lead) continue;
    // v0.4.1 bin_ron: each line names the bin_stages stage it describes; only the one matching the tile shown
    if (line.bin_stage != null && env.binStage != null && String(line.bin_stage) !== String(env.binStage)) continue;
    if (!whenMatches(line.when, { ...env, lineKey: spotKey + '#' + line.id })) continue;
    return line;
  }
  return null;
}

/** company_inbox: every email whose flags are all set (and not pending), newest (highest index) first. */
export function inboxEmails(inbox, flags) {
  return (inbox?.emails || []).filter((e) => !e.pending_story_call && (e.flags || []).every((f) => flags.has(f))).reverse();
}

/** ron_nicknames: first entry whose flags are all set wins; one nick at random (rand in [0,1)). */
export function pickNick(nicks, flags, rand = Math.random) {
  for (const l of nicks?.lines || []) {
    if (l.pending_story_call) continue;
    if ((l.flags || []).every((f) => flags.has(f)) && l.nicks?.length) return l.nicks[Math.floor(rand() * l.nicks.length)];
  }
  return null;
}

/** Master coins earned = count of beat_master_* flags (0-8). */
export function coinCount(flags) {
  let n = 0;
  for (const f of flags) if (/^beat_master_/.test(f)) n++;
  return Math.min(8, n);
}
